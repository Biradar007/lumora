import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@lumora/db';

let transporter: Transporter | null = null;

function ensureMailSettings() {
  if (!process.env.MAIL_HOST || !process.env.MAIL_PORT) {
    throw new Error('mail_not_configured');
  }
}

function resolveTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }
  ensureMailSettings();
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: false,
    auth:
      env.MAIL_USER && env.MAIL_PASSWORD
        ? {
            user: env.MAIL_USER,
            pass: env.MAIL_PASSWORD,
          }
        : undefined,
  });
  return transporter;
}

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const mailer = resolveTransporter();
  const from = env.MAIL_USER || 'no-reply@lumora.local';
  await mailer.sendMail({
    to,
    from,
    subject,
    text,
  });
}
