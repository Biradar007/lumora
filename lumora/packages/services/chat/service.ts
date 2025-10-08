import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT } from '@lumora/core';
// import { connectToDatabase, MessageLog } from '@lumora/db';
import { Message } from '@lumora/core';

type Provider = 'openai' | 'gemini';

interface ChatServiceOptions {
  defaultProvider?: Provider;
  openaiApiKey?: string;
  geminiApiKey?: string;
  openaiModel?: string;
  geminiModel?: string;
}

export class ChatService {
  private readonly defaultProvider: Provider;
  private readonly openai?: OpenAI;
  private readonly gemini?: GoogleGenerativeAI;
  private readonly models: Record<Provider, string>;

  constructor({
    defaultProvider = 'openai',
    openaiApiKey,
    geminiApiKey,
    openaiModel = 'gpt-4o-mini',
    geminiModel = 'gemini-2.5-flash',
  }: ChatServiceOptions) {
    this.defaultProvider = defaultProvider;
    this.models = { openai: openaiModel, gemini: geminiModel };

    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }

    if (geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(geminiApiKey);
    }
  }

  async generateResponse(sessionId: string, messages: Message[], provider?: Provider): Promise<string> {
    // await connectToDatabase();

    const convo = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const selectedProvider: Provider = provider ?? this.defaultProvider;
    let reply: string | undefined;

    if (selectedProvider === 'gemini') {
      if (!this.gemini) {
        throw new Error('Gemini client is not configured');
      }

      const model = this.gemini.getGenerativeModel({ model: this.models.gemini });
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

    } else {
      if (!this.openai) {
        throw new Error('OpenAI client is not configured');
      }

      const completion = await this.openai.chat.completions.create({
        model: this.models.openai,
        messages: convo,
        temperature: 0.7,
        max_tokens: 400,
      });

      reply = completion.choices[0]?.message?.content?.trim();
    }

    const safeReply = reply || 'Thank you for sharing. I am here to listen.';

    // Log the conversation
    // await MessageLog.create({ 
    //   sessionId, 
    //   role: 'user', 
    //   content: messages[messages.length - 1]?.content || '' 
    // });
    // await MessageLog.create({ 
    //   sessionId, 
    //   role: 'assistant', 
    //   content: safeReply 
    // });

    return safeReply;
  }
}
