import { setTimeout as delay } from 'timers/promises';

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url?: string;
}

interface ZoomMeetingPayload {
  topic: string;
  startTime: string;
  durationMinutes: number;
  timezone: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function fetchZoomAccessToken(): Promise<string> {
  const accountId = requiredEnv('ZOOM_ACCOUNT_ID');
  const clientId = requiredEnv('ZOOM_CLIENT_ID');
  const clientSecret = requiredEnv('ZOOM_CLIENT_SECRET');
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  if (!response.ok) {
    throw new Error(`zoom_token_request_failed:${response.status}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

async function zoomRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = await fetchZoomAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? '2');
    await delay(retryAfter * 1000);
    return zoomRequest<T>(path, init);
  }
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`zoom_api_error:${response.status}:${errorBody}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function createZoomMeeting(payload: ZoomMeetingPayload): Promise<{ joinUrl: string; meetingId: string }> {
  const body = {
    topic: payload.topic,
    type: 2,
    start_time: payload.startTime,
    duration: payload.durationMinutes,
    timezone: payload.timezone,
    settings: {
      join_before_host: false,
      waiting_room: true,
      approval_type: 0,
      registration_type: 2,
    },
  };
  const response = await zoomRequest<ZoomMeetingResponse>('/users/me/meetings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { joinUrl: response.join_url, meetingId: String(response.id) };
}

export async function updateZoomMeeting(meetingId: string, payload: ZoomMeetingPayload): Promise<void> {
  const body = {
    topic: payload.topic,
    start_time: payload.startTime,
    duration: payload.durationMinutes,
    timezone: payload.timezone,
  };
  await zoomRequest(`/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  await zoomRequest(`/meetings/${meetingId}`, { method: 'DELETE' });
}

