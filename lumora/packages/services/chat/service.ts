import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '@lumora/core';
import { connectToDatabase, MessageLog } from '@lumora/db';
import { Message } from '@lumora/core';

export class ChatService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(sessionId: string, messages: Message[]): Promise<string> {
    await connectToDatabase();

    const convo = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: convo,
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Thank you for sharing. I am here to listen.';

    // Log the conversation
    await MessageLog.create({ 
      sessionId, 
      role: 'user', 
      content: messages[messages.length - 1]?.content || '' 
    });
    await MessageLog.create({ 
      sessionId, 
      role: 'assistant', 
      content: reply 
    });

    return reply;
  }
}
