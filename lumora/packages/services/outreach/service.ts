import nodemailer from 'nodemailer';
import { createHash } from 'crypto';
import { connectToDatabase, OutreachAudit } from '@lumora/db';
import { OutreachPayload } from '@lumora/core';

export class OutreachService {
  private transporter: nodemailer.Transporter;

  constructor(mailConfig: {
    host: string;
    port: number;
    user?: string;
    password?: string;
  }) {
    this.transporter = nodemailer.createTransporter({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: false,
      auth: mailConfig.user && mailConfig.password 
        ? { user: mailConfig.user, pass: mailConfig.password } 
        : undefined,
    });
  }

  async sendOutreachRequest(
    payload: OutreachPayload, 
    counselingInbox: string
  ): Promise<void> {
    const lines = [
      `Session ID: ${payload.sessionId}`,
      payload.name ? `Name: ${payload.name}` : undefined,
      payload.email ? `Email: ${payload.email}` : undefined,
      payload.phone ? `Phone: ${payload.phone}` : undefined,
      payload.studentId ? `Student ID: ${payload.studentId}` : undefined,
      payload.preferredTime ? `Preferred time: ${payload.preferredTime}` : undefined,
    ].filter(Boolean);

    await this.transporter.sendMail({
      to: counselingInbox,
      from: process.env.MAIL_USER || 'no-reply@lumora.local',
      subject: 'Lumora outreach request',
      text: lines.join('\n'),
    });

    // Audit the outreach request
    const hash = createHash('sha256')
      .update(JSON.stringify({ ...payload, consent: true }))
      .digest('hex');
    
    await connectToDatabase();
    await OutreachAudit.create({ 
      sessionId: payload.sessionId, 
      consent: true, 
      payloadHash: hash 
    });
  }
}
