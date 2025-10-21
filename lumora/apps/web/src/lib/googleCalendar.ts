import { google, Auth } from 'googleapis';
import { randomBytes } from 'crypto';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'];
const STATE_COLLECTION = 'integrationStates';
const INTEGRATION_COLLECTION = 'therapistIntegrations';

interface IntegrationState {
  therapistId: string;
  createdAt: number;
}

export interface GoogleCalendarTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number | null;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

export interface TherapistGoogleIntegration {
  therapistId: string;
  connectedAt: number;
  updatedAt: number;
  calendarId: string;
  tokens: GoogleCalendarTokens;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function resolveRedirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/integrations/google-calendar/callback`
  );
}

function createOAuthClient(redirectUri = resolveRedirectUri()): Auth.OAuth2Client {
  const clientId = requiredEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requiredEnv('GOOGLE_CLIENT_SECRET');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function createIntegrationState(therapistId: string): Promise<string> {
  const db = getServerFirestore();
  const stateId = randomBytes(16).toString('hex');
  const state: IntegrationState = {
    therapistId,
    createdAt: Date.now(),
  };
  await db.collection(STATE_COLLECTION).doc(stateId).set(state);
  return stateId;
}

export async function resolveIntegrationState(stateId: string): Promise<IntegrationState | null> {
  const db = getServerFirestore();
  const doc = await db.collection(STATE_COLLECTION).doc(stateId).get();
  if (!doc.exists) {
    return null;
  }
  const state = doc.data() as IntegrationState;
  await doc.ref.delete().catch(() => {
    /* ignore */
  });
  return state;
}

export async function generateGoogleAuthUrl(therapistId: string): Promise<string> {
  const stateId = await createIntegrationState(therapistId);
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state: stateId,
  });
}

export async function exchangeCodeForTokens(
  stateId: string,
  code: string
): Promise<{ therapistId: string; tokens: GoogleCalendarTokens }> {
  const state = await resolveIntegrationState(stateId);
  if (!state) {
    throw new Error('invalid_state');
  }
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  await storeOAuthTokens(state.therapistId, tokens);
  return { therapistId: state.therapistId, tokens };
}

async function upsertIntegration(therapistId: string, tokens: GoogleCalendarTokens, calendarId: string): Promise<void> {
  const db = getServerFirestore();
  const ref = db.collection(INTEGRATION_COLLECTION).doc(therapistId);
  const existingSnapshot = await ref.get();
  const existing = existingSnapshot.exists ? ((existingSnapshot.data() as TherapistGoogleIntegration) ?? null) : null;
  const payload: TherapistGoogleIntegration = {
    therapistId,
    connectedAt: existing?.connectedAt ?? Date.now(),
    updatedAt: Date.now(),
    calendarId,
    tokens,
  };
  await ref.set(sanitizeForFirestore(payload), { merge: true });
}

export async function storeOAuthTokens(therapistId: string, tokens: GoogleCalendarTokens, calendarId = 'primary'): Promise<void> {
  if (!tokens.refresh_token) {
    // ensure we do not lose refresh token; keep existing one if available.
    const existing = await getTherapistGoogleIntegration(therapistId);
    if (existing?.tokens?.refresh_token) {
      tokens.refresh_token = existing.tokens.refresh_token;
    }
  }
  await upsertIntegration(therapistId, tokens, calendarId);
}

export async function getTherapistGoogleIntegration(therapistId: string): Promise<TherapistGoogleIntegration | null> {
  const db = getServerFirestore();
  const doc = await db.collection(INTEGRATION_COLLECTION).doc(therapistId).get();
  return doc.exists ? ((doc.data() as TherapistGoogleIntegration) ?? null) : null;
}

export async function disconnectTherapistGoogleCalendar(therapistId: string): Promise<void> {
  const db = getServerFirestore();
  await db.collection(INTEGRATION_COLLECTION).doc(therapistId).delete();
}

async function buildAuthorizedClient(therapistId: string): Promise<Auth.OAuth2Client | null> {
  const integration = await getTherapistGoogleIntegration(therapistId);
  if (!integration?.tokens) {
    return null;
  }
  const client = createOAuthClient();
  client.setCredentials(integration.tokens);
  return client;
}

export async function fetchGoogleBusyBlocks(
  therapistId: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  const client = await buildAuthorizedClient(therapistId);
  if (!client) {
    return [];
  }
  const calendar = google.calendar({ version: 'v3', auth: client });
  const integration = await getTherapistGoogleIntegration(therapistId);
  const calendarId = integration?.calendarId ?? 'primary';
  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      },
    });
    const busy = response.data.calendars?.[calendarId]?.busy ?? [];
    return busy.map((slot) => ({ start: slot.start ?? '', end: slot.end ?? '' }));
  } catch (error) {
    console.error('Failed to query Google Calendar free/busy', error);
    return [];
  }
}

export async function createOrUpdateGoogleEvent(
  therapistId: string,
  options: {
    eventId?: string | null;
    summary: string;
    description?: string;
    start: string;
    end: string;
    timeZone: string;
    location?: string;
    meetingLink?: string;
    attendees?: { email: string; displayName?: string }[];
  }
): Promise<string | null> {
  const client = await buildAuthorizedClient(therapistId);
  if (!client) {
    return null;
  }
  const calendar = google.calendar({ version: 'v3', auth: client });
  const integration = await getTherapistGoogleIntegration(therapistId);
  const calendarId = integration?.calendarId ?? 'primary';
  const requestBody: any = {
    summary: options.summary,
    description: options.description,
    start: { dateTime: options.start, timeZone: options.timeZone },
    end: { dateTime: options.end, timeZone: options.timeZone },
  };
  if (options.location) {
    requestBody.location = options.location;
  }
  if (options.meetingLink) {
    requestBody.description = `${options.description ?? ''}\n\nMeeting link: ${options.meetingLink}`.trim();
  }
  if (options.attendees?.length) {
    requestBody.attendees = options.attendees;
  }

  if (options.eventId) {
    const response = await calendar.events.patch({
      calendarId,
      eventId: options.eventId,
      requestBody,
    });
    return response.data.id ?? options.eventId ?? null;
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody,
  });
  return response.data.id ?? null;
}

export async function deleteGoogleEvent(therapistId: string, eventId?: string | null): Promise<void> {
  if (!eventId) {
    return;
  }
  const client = await buildAuthorizedClient(therapistId);
  if (!client) {
    return;
  }
  const calendar = google.calendar({ version: 'v3', auth: client });
  const integration = await getTherapistGoogleIntegration(therapistId);
  const calendarId = integration?.calendarId ?? 'primary';
  await calendar.events
    .delete({
      calendarId,
      eventId,
    })
    .catch(() => {
      /* ignore */
    });
}
