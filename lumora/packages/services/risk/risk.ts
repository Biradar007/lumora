export type RiskTier = 'GREEN' | 'YELLOW' | 'RED';

const RED_REGEX = /(kill myself|end my life|suicide|i want to die|die tonight|hurt myself)\b/i;
const YELLOW_REGEX = /(panic|overwhelmed|can[’']t cope|worthless|breakdown|no one cares)/i;

export function assessRisk(text: string): { tier: RiskTier; reasons: string[] } {
  const input = (text || '').trim();
  const reasons: string[] = [];
  let tier: RiskTier = 'GREEN';
  if (!input) return { tier, reasons: ['empty_text'] };

  if (RED_REGEX.test(input)) {
    tier = 'RED';
    reasons.push('red_keyword_match');
  } else if (YELLOW_REGEX.test(input)) {
    tier = 'YELLOW';
    reasons.push('yellow_distress_cue');
  }
  const distressWords = ['overwhelmed', 'panic', 'worthless'];
  const longText = input.length > 160;
  if (longText && distressWords.some(w => input.toLowerCase().includes(w))) {
    if (tier === 'GREEN') tier = 'YELLOW';
    reasons.push('length_plus_distress_hint');
  }
  return { tier, reasons };
}


