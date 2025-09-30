export type Contact = { 
  name: string; 
  phone?: string; 
  email?: string; 
  hours?: string; 
  locationUrl?: string; 
};

export type Message = { 
  role: 'user' | 'assistant' | 'system'; 
  content: string; 
  at?: number; 
};

export type RiskTier = 'GREEN' | 'YELLOW' | 'RED';

export type AnalyticsEventType = 'SELF_HELP_USED' | 'RESOURCES_VIEWED' | 'OUTREACH_REQUESTED' | 'MESSAGE_SENT';

export type OutreachPayload = {
  sessionId: string;
  consent: true;
  name?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  preferredTime?: string;
};
