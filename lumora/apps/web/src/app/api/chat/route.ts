import { NextResponse } from 'next/server';
import { env } from '@lumora/db';
import { SYSTEM_PROMPT } from '@lumora/core';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: 'TestKey' });
// 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

export async function POST(request: Request) {
  try {
    const { sessionId, messages } = (await request.json()) as {
      sessionId?: string;
      messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
    };
    if (!sessionId || !messages?.length) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const convo = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: convo,
      temperature: 0.7,
      max_tokens: 200, //400
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Thank you for sharing. I am here to listen.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[api/chat] unexpected error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
