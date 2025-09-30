import { NextResponse } from 'next/server';
import { connectToDatabase, MessageLog } from '@lumora/db';
import { env } from '@lumora/db';
import { SYSTEM_PROMPT } from '@lumora/core';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { sessionId, messages } = (await request.json()) as {
      sessionId?: string;
      messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
    };
    if (!sessionId || !messages?.length) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    await connectToDatabase();

    const convo = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: convo,
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Thank you for sharing. I am here to listen.';

    await MessageLog.create({ sessionId, role: 'user', content: messages[messages.length - 1]?.content || '' });
    await MessageLog.create({ sessionId, role: 'assistant', content: reply });

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}


