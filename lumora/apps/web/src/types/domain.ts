export type Role = 'user' | 'therapist' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  displayName?: string;
  photoUrl?: string;
  tenantId?: string;
  createdAt: number;
}

export type ProfileStatus = 'INCOMPLETE' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface TherapistProfile {
  id: string; // == userId
  tenantId?: string;
  status: ProfileStatus;
  rejectionReason?: string | null;
  visible: boolean;
  bio?: string;
  languages: string[];
  specialties: string[];
  credentials: string[];
  yearsExperience?: number;
  license: {
    number?: string;
    region?: string;
    docUrl?: string;
    verified?: boolean;
  };
  modality: {
    telehealth: boolean;
    inPerson: boolean;
  };
  timezone?: string;
  sessionLengthMinutes?: 25 | 50;
  availability: {
    day: number;
    start: string;
    end: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface ConnectionRequest {
  id: string;
  tenantId?: string;
  userId: string;
  therapistId: string;
  message?: string;
  status: RequestStatus;
  createdAt: number;
  respondedAt?: number;
  declineReason?: string;
}

export type ConnectionStatus = 'ACTIVE' | 'ENDED';

export interface Connection {
  id: string;
  tenantId?: string;
  userId: string;
  therapistId: string;
  status: ConnectionStatus;
  startedAt: number;
  endedAt?: number;
}

export interface ConsentScopes {
  chatSummary: boolean;
  moodTrends: boolean;
  journals: boolean;
}

export interface Consent {
  id: string;
  connectionId: string;
  userId: string;
  therapistId: string;
  scopes: ConsentScopes;
  createdAt: number;
  revokedAt?: number;
  updatedAt?: number;
}

export interface AiChatSession {
  id: string;
  title: string | null;
  createdAt?: number;
  updatedAt?: number;
  lastMessagePreview?: string | null;
  model?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
}

export interface Chat {
  id: string;
  connectionId: string;
  lastMessageAt?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: number;
  aiRiskScore?: number;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Appointment {
  id: string;
  connectionId: string;
  therapistId: string;
  userId: string;
  start: number;
  end: number;
  status: AppointmentStatus;
  location: 'video' | 'in-person';
  videoLink?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  tenantId?: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}
