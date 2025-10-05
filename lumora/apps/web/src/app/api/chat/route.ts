import { NextResponse } from 'next/server';
import { env } from '@lumora/db';
import { SYSTEM_PROMPT } from '@lumora/core';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Provider = 'openai' | 'gemini';

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

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

export async function POST(request: Request) {
  try {
    const { sessionId, messages, provider } = (await request.json()) as {
      sessionId?: string;
      messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
      provider?: Provider;
    };
    if (!sessionId || !messages?.length) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const resolvedProvider: Provider = isProvider(provider) ? provider : env.AI_PROVIDER;

    let reply: string | undefined;

    if (resolvedProvider === 'gemini') {
      try {
        const model = getGeminiClient().getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
        const completion = await model.generateContent({
          contents: messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
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
      const convo = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      const completion = await getOpenAIClient().chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        messages: convo,
        temperature: 0.7,
        max_tokens: 200, //400
      });

      reply = completion.choices[0]?.message?.content?.trim();
    }

    const safeReply = reply || 'Thank you for sharing. I am here to listen.';

    return NextResponse.json({ reply: safeReply, provider: resolvedProvider });
  } catch (err) {
    console.error('[api/chat] unexpected error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
