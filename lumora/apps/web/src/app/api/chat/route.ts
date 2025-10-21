import { NextResponse } from 'next/server';
import { env } from '@lumora/db';
import { SYSTEM_PROMPT } from '@lumora/core';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth, jsonError } from '@/lib/apiAuth';
import { getServerFirestore } from '@/lib/firestoreServer';

type Provider = 'openai' | 'gemini';

export const runtime = 'nodejs';

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_CONTEXT_MESSAGES = 24;

let openaiClient: OpenAI | undefined;
let geminiClient: GoogleGenerativeAI | undefined;

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

type TokenRecord = {
  sessionId: string;
  createdAt?: number;
  expiresAt?: number;
};

type FirestoreMessageDoc = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const now = () => Date.now();

async function loadSessionMessages(userId: string, sessionId: string) {
  const db = getServerFirestore();
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('sessions')
    .doc(sessionId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(MAX_CONTEXT_MESSAGES)
    .get();

const docs = snapshot.docs
  .map((docSnapshot) => docSnapshot.data() as FirestoreMessageDoc)
  .filter((doc) => doc && typeof doc.content === 'string' && doc.content.trim().length > 0)
  .map((doc) => ({
      role: doc.role === 'user' || doc.role === 'system' ? doc.role : ('assistant' as const),
      content: doc.content,
    }))
    .reverse();

  return docs;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      message?: string;
      sessionId?: string;
      messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
      provider?: Provider;
    };

    const resolvedProvider: Provider = isProvider(body.provider) ? body.provider : env.AI_PROVIDER;

    let conversation: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
    let reply: string | undefined;

    if (body.token) {
      const auth = requireAuth(request, { roles: ['user', 'therapist'] });
      const trimmedMessage = body.message?.trim();
      if (!trimmedMessage) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }

      const db = getServerFirestore();
      const tokenSnapshot = await db
        .collection('users')
        .doc(auth.userId)
        .collection('sessionTokens')
        .doc(body.token)
        .get();
      if (!tokenSnapshot.exists) {
        return NextResponse.json({ error: 'invalid_session' }, { status: 400 });
      }

      const tokenData = tokenSnapshot.data() as TokenRecord;
      if (tokenData.expiresAt && tokenData.expiresAt < now()) {
        await tokenSnapshot.ref.delete().catch(() => undefined);
        return NextResponse.json({ error: 'token_expired' }, { status: 401 });
      }

      const history = await loadSessionMessages(auth.userId, tokenData.sessionId);

      const contextualMessages = history
        .filter((doc) => doc.role === 'user' || doc.role === 'assistant')
        .map((doc) => ({ role: doc.role, content: doc.content }));

      const lastMessage = contextualMessages[contextualMessages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== trimmedMessage) {
        contextualMessages.push({ role: 'user', content: trimmedMessage });
      }

      conversation = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...contextualMessages,
      ];
    } else {
      const { sessionId, messages } = body;
      if (!sessionId || !messages?.length) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
      }

      conversation = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ];
    }

    if (resolvedProvider === 'gemini') {
      try {
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
        reply = completion.response.text()?.trim();
      } catch (err) {
        console.error('[api/chat] gemini error', err);
        return NextResponse.json({ error: 'gemini_error' }, { status: 500 });
      }
    } else {
      const completion = await getOpenAIClient().chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        messages: conversation.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: 0.7,
        max_tokens: 200,
      });

      reply = completion.choices[0]?.message?.content?.trim();
    }

    const safeReply = reply || 'Thank you for sharing. I am here to listen.';

    return NextResponse.json({ reply: safeReply, provider: resolvedProvider });
  } catch (error) {
    return jsonError(error);
  }
}
