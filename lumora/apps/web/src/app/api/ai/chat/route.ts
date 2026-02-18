import { NextResponse } from 'next/server';
import { env } from '@lumora/db';
import { SYSTEM_PROMPT } from '@lumora/core';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildUsageResponse,
  createUsageState,
  FREE_COOLDOWN_SECONDS,
  FREE_MONTHLY_MESSAGE_LIMIT,
  getCooldownRemainingSeconds,
  getUtcDayKey,
  normalizeUsageState,
  resolvePlan,
  resetUsageForCurrentMonth,
  serializeUsageState,
  shouldApplyFreeCooldown,
  shouldResetUsagePeriod,
  type UsageResponsePayload,
  type UserPlan,
} from '@/lib/aiUsage';
import { jsonError, requireFirebaseAuth } from '@/lib/apiAuth';
import { getServerFirestore } from '@/lib/firestoreServer';

type Provider = 'openai' | 'gemini';

type UserDoc = {
  plan?: UserPlan;
};

type SessionMessageDoc = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

class LimitReachedError extends Error {
  constructor(public usage: UsageResponsePayload) {
    super('limit_reached');
  }
}

class CooldownError extends Error {
  constructor(public usage: UsageResponsePayload) {
    super('cooldown');
  }
}

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_CONTEXT_MESSAGES = 24;

let openaiClient: OpenAI | undefined;
let geminiClient: GoogleGenerativeAI | undefined;

export const runtime = 'nodejs';

const getOpenAIClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const getGeminiClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
};

const isProvider = (value: unknown): value is Provider => value === 'openai' || value === 'gemini';

async function loadSessionMessages(userId: string, threadId: string): Promise<ConversationMessage[]> {
  const db = getServerFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('sessions')
    .doc(threadId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(MAX_CONTEXT_MESSAGES)
    .get();

  return snapshot.docs
    .map((docSnapshot) => docSnapshot.data() as SessionMessageDoc)
    .filter((doc) => doc && typeof doc.content === 'string' && doc.content.trim().length > 0)
    .map((doc) => ({
      role: doc.role === 'assistant' || doc.role === 'system' ? doc.role : ('user' as const),
      content: doc.content,
    }))
    .reverse();
}

async function generateReply(provider: Provider, conversation: ConversationMessage[]): Promise<string> {
  if (provider === 'gemini') {
    const model = getGeminiClient().getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    const completion = await model.generateContent({
      contents: conversation
        .filter((message) => message.role !== 'system')
        .map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    });
    return completion.response.text()?.trim() || '';
  }

  const completion = await getOpenAIClient().chat.completions.create({
    model: DEFAULT_OPENAI_MODEL,
    messages: conversation.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    temperature: 0.7,
    max_tokens: 200,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

export async function POST(request: Request) {
  try {
    const auth = await requireFirebaseAuth(request);
    const body = (await request.json()) as {
      threadId?: string;
      message?: string;
      provider?: Provider;
    };

    const threadId = body.threadId?.trim();
    const message = body.message?.trim();
    if (!threadId || !message) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const resolvedProvider: Provider = isProvider(body.provider) ? body.provider : env.AI_PROVIDER;
    const now = new Date();
    const todayKey = getUtcDayKey(now);
    const db = getServerFirestore();
    const userRef = db.collection('users').doc(auth.userId);
    const usageRef = db.collection('usage').doc(auth.userId);
    const threadRef = db.collection('chats').doc(auth.userId).collection('threads').doc(threadId);

    const [userSnapshot, usageSnapshot] = await Promise.all([userRef.get(), usageRef.get()]);
    const userData = (userSnapshot.data() ?? {}) as UserDoc;
    let plan = resolvePlan(userData.plan);

    if (!userSnapshot.exists) {
      plan = 'free';
      await userRef.set(
        {
          plan,
          createdAt: now,
        },
        { merge: true }
      );
    } else if (userData.plan !== 'free' && userData.plan !== 'pro') {
      plan = 'free';
      await userRef.set({ plan }, { merge: true });
    }

    let usage = usageSnapshot.exists ? normalizeUsageState(usageSnapshot.data(), now) : createUsageState(now);
    if (!usageSnapshot.exists || shouldResetUsagePeriod(usage, now)) {
      usage = resetUsageForCurrentMonth(now);
      await usageRef.set(serializeUsageState(usage), { merge: true });
    }

    if (plan === 'free') {
      if (usage.messagesUsed >= FREE_MONTHLY_MESSAGE_LIMIT) {
        const usagePayload = buildUsageResponse(plan, usage, now);
        return NextResponse.json(
          {
            code: 'LIMIT_REACHED',
            upgradePath: '/#pricing',
            usage: usagePayload,
          },
          { status: 402 }
        );
      }

      const retryAfterSeconds = getCooldownRemainingSeconds(usage, now);
      if (retryAfterSeconds > 0) {
        const usagePayload = buildUsageResponse(plan, usage, now);
        return NextResponse.json(
          {
            code: 'COOLDOWN',
            retryAfterSeconds,
            usage: usagePayload,
          },
          { status: 429 }
        );
      }
    }

    const txResult = await db.runTransaction(async (tx) => {
      const [freshUserSnapshot, freshUsageSnapshot] = await Promise.all([tx.get(userRef), tx.get(usageRef)]);
      const freshUserData = (freshUserSnapshot.data() ?? {}) as UserDoc;
      let freshPlan = resolvePlan(freshUserData.plan);

      if (!freshUserSnapshot.exists) {
        freshPlan = 'free';
        tx.set(
          userRef,
          {
            plan: freshPlan,
            createdAt: now,
          },
          { merge: true }
        );
      } else if (freshUserData.plan !== 'free' && freshUserData.plan !== 'pro') {
        freshPlan = 'free';
        tx.set(userRef, { plan: freshPlan }, { merge: true });
      }

      let freshUsage = freshUsageSnapshot.exists
        ? normalizeUsageState(freshUsageSnapshot.data(), now)
        : createUsageState(now);

      if (!freshUsageSnapshot.exists || shouldResetUsagePeriod(freshUsage, now)) {
        freshUsage = resetUsageForCurrentMonth(now);
      }

      if (freshPlan === 'free') {
        if (freshUsage.messagesUsed >= FREE_MONTHLY_MESSAGE_LIMIT) {
          throw new LimitReachedError(buildUsageResponse(freshPlan, freshUsage, now));
        }

        const activeCooldown = getCooldownRemainingSeconds(freshUsage, now);
        if (activeCooldown > 0) {
          throw new CooldownError(buildUsageResponse(freshPlan, freshUsage, now));
        }

        freshUsage.messagesUsed += 1;
        const nextDailyCount = (freshUsage.dailyCounts[todayKey] ?? 0) + 1;
        freshUsage.dailyCounts[todayKey] = nextDailyCount;

        if (shouldApplyFreeCooldown(nextDailyCount)) {
          freshUsage.cooldownUntil = new Date(now.getTime() + FREE_COOLDOWN_SECONDS * 1000);
        } else if (freshUsage.cooldownUntil && freshUsage.cooldownUntil.getTime() <= now.getTime()) {
          freshUsage.cooldownUntil = null;
        }
      }

      freshUsage.lastMessageAt = now;

      tx.set(usageRef, serializeUsageState(freshUsage), { merge: true });
      tx.set(
        threadRef,
        {
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        plan: freshPlan,
        usage: freshUsage,
      };
    });

    const history = await loadSessionMessages(auth.userId, threadId);
    const context = history
      .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

    const lastContextMessage = context[context.length - 1];
    if (!lastContextMessage || lastContextMessage.role !== 'user' || lastContextMessage.content !== message) {
      context.push({
        role: 'user',
        content: message,
      });
    }

    const conversation: ConversationMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context,
    ];

    const rawReply = await generateReply(resolvedProvider, conversation);
    const reply = rawReply || 'Thank you for sharing. I am here to listen.';

    return NextResponse.json({
      reply,
      usage: buildUsageResponse(txResult.plan, txResult.usage, now),
    });
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return NextResponse.json(
        {
          code: 'LIMIT_REACHED',
          upgradePath: '/#pricing',
          usage: error.usage,
        },
        { status: 402 }
      );
    }

    if (error instanceof CooldownError) {
      return NextResponse.json(
        {
          code: 'COOLDOWN',
          retryAfterSeconds: error.usage.retryAfterSeconds ?? 0,
          usage: error.usage,
        },
        { status: 429 }
      );
    }

    return jsonError(error);
  }
}
