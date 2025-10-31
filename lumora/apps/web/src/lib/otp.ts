import { createHash, randomBytes, randomInt } from 'crypto';

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateOtpSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashOtpCode(email: string, code: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${email}:${code}`).digest('hex');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
