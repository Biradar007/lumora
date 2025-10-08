import { z } from 'zod';

// type Provider = 'openai' | 'gemini';
type Provider = 'openai' | 'gemini';


const RawEnvSchema = z
  .object({
    AI_PROVIDER: z.enum(['openai', 'gemini']).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    // MONGODB_URI: z.string().min(1),
    MAIL_HOST: z.string().optional(),
    MAIL_PORT: z.string().optional(),
    MAIL_USER: z.string().optional(),
    MAIL_PASSWORD: z.string().optional(),
    MAIL_API_KEY: z.string().optional(),
    COUNSELING_INBOX: z.string().email().optional(),
    COUNSELING_CONTACTS_JSON: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const provider =
      val.AI_PROVIDER ?? (val.OPENAI_API_KEY ? 'openai' : val.GEMINI_API_KEY ? 'gemini' : undefined);

    if (!provider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Configure AI_PROVIDER or provide at least one API key for OpenAI or Gemini.',
        path: ['AI_PROVIDER'],
      });
      return;
    }

    if (provider === 'openai' && !val.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENAI_API_KEY is required when AI_PROVIDER resolves to "openai".',
        path: ['OPENAI_API_KEY'],
      });
    }

    if (provider === 'gemini' && !val.GEMINI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GEMINI_API_KEY is required when AI_PROVIDER resolves to "gemini".',
        path: ['GEMINI_API_KEY'],
      });
    }
  });

const rawEnv = RawEnvSchema.parse({
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // MONGODB_URI: process.env.MONGODB_URI,
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: process.env.MAIL_PORT,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,
  MAIL_API_KEY: process.env.MAIL_API_KEY,
  COUNSELING_INBOX: process.env.COUNSELING_INBOX,
  COUNSELING_CONTACTS_JSON: process.env.COUNSELING_CONTACTS_JSON,
});

const computedProvider = ((): Provider => {
  if (rawEnv.AI_PROVIDER) {
    return rawEnv.AI_PROVIDER;
  }
  if (rawEnv.OPENAI_API_KEY) {
    return 'openai';
  }
  return 'gemini';
})();

export const env = {
  ...rawEnv,
  AI_PROVIDER: computedProvider,
} satisfies typeof rawEnv & { AI_PROVIDER: Provider };
