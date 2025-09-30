import { describe, expect, it } from 'vitest';

// Basic schema logic mirror to ensure consent required
function validate(payload: any) {
  if (!payload || typeof payload.sessionId !== 'string' || payload.sessionId.length < 6) throw new Error('invalid');
  if (payload.consent !== true) throw new Error('consent_required');
  return true;
}

describe('outreach consent', () => {
  it('requires consent true', () => {
    expect(() => validate({ sessionId: 'abcdef', consent: false })).toThrowError('consent_required');
  });
  it('accepts when consent true', () => {
    expect(validate({ sessionId: 'abcdef', consent: true })).toBe(true);
  });
});


