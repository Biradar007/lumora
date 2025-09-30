import { describe, expect, it } from 'vitest';
import { assessRisk } from './risk';

describe('assessRisk', () => {
  it('flags RED on explicit self-harm', () => {
    const r = assessRisk('I want to die tonight');
    expect(r.tier).toBe('RED');
  });
  it('flags YELLOW on distress cues', () => {
    const r = assessRisk('Feeling overwhelmed lately');
    expect(r.tier).toBe('YELLOW');
  });
  it('GREEN otherwise', () => {
    const r = assessRisk('Hello there');
    expect(r.tier).toBe('GREEN');
  });
});


