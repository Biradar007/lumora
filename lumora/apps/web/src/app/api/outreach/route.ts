import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '@lumora/db';
import { connectToDatabase, OutreachAudit } from '@lumora/db';

const schema = z.object({
  sessionId: z.string().min(6),
  consent: z.literal(true),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  studentId: z.string().optional(),
  preferredTime: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = schema.parse(body);

    if (!env.COUNSELING_INBOX) {
      return NextResponse.json({ error: 'inbox_not_configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: false,
      auth: env.MAIL_USER && env.MAIL_PASSWORD ? { user: env.MAIL_USER, pass: env.MAIL_PASSWORD } : undefined,
    });

    const lines = [
      `Session ID: ${payload.sessionId}`,
      payload.name ? `Name: ${payload.name}` : undefined,
      payload.email ? `Email: ${payload.email}` : undefined,
      payload.phone ? `Phone: ${payload.phone}` : undefined,
      payload.studentId ? `Student ID: ${payload.studentId}` : undefined,
      payload.preferredTime ? `Preferred time: ${payload.preferredTime}` : undefined,
    ].filter(Boolean);

    await transporter.sendMail({
      to: env.COUNSELING_INBOX,
      from: env.MAIL_USER || 'no-reply@lumora.local',
      subject: 'Lumora outreach request',
      text: lines.join('\n'),
    });

    const hash = createHash('sha256').update(JSON.stringify({ ...payload, consent: true })).digest('hex');
    await connectToDatabase();
    await OutreachAudit.create({ sessionId: payload.sessionId, consent: true, payloadHash: hash });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}


