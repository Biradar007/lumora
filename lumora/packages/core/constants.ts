export const SYSTEM_PROMPT = `You are Lumora, a supportive mental-health companion. You are not a therapist and do not provide medical diagnoses. Use warm, concise, validating language. When you sense distress, prioritize empathy and practical next steps. If risk is high, present self-help tools and campus counseling resources. Offer a consented outreach option when asked. If the user states they are in immediate danger, advise contacting emergency services. Avoid clinical labels; focus on support and safety.`;

export const RISK_KEYWORDS = {
  RED: [
    'suicide', 'kill myself', 'end it all', 'not worth living',
    'harm myself', 'hurt myself', 'self harm', 'cut myself',
    'overdose', 'take pills', 'jump off', 'hang myself'
  ],
  YELLOW: [
    'depressed', 'hopeless', 'worthless', 'useless',
    'anxiety', 'panic', 'overwhelmed', 'stressed',
    'can\'t cope', 'breaking down', 'falling apart'
  ]
};

export const SESSION_COOKIE_NAME = 'lumora_session';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const DATA_RETENTION_DAYS = 30;
