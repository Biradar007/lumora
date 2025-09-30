import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.string().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_API_KEY: z.string().optional(),
  COUNSELING_INBOX: z.string().email().optional(),
  COUNSELING_CONTACTS_JSON: z.string().optional(),
});

export const env = EnvSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: process.env.MAIL_PORT,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD,
  MAIL_API_KEY: process.env.MAIL_API_KEY,
  COUNSELING_INBOX: process.env.COUNSELING_INBOX,
  COUNSELING_CONTACTS_JSON: process.env.COUNSELING_CONTACTS_JSON,
});


