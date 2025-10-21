'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';

export default function TherapistProfilePage() {
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; calendarId?: string; updatedAt?: number | null } | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setVisible(Boolean(profile.visible));
    }
  }, [profile]);

  const calendarQuery = useMemo(() => searchParams.get('calendar'), [searchParams]);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const loadCalendar = async () => {
      setCalendarLoading(true);
      try {
        const response = await fetch('/api/integrations/google-calendar/status', { headers });
        if (response.ok) {
          const data = (await response.json()) as { connected: boolean; calendarId?: string; updatedAt?: number | null };
          setCalendarStatus(data);
        } else {
          setCalendarStatus(null);
        }
      } catch (error) {
        console.error('Failed to load calendar status', error);
        setCalendarStatus(null);
      } finally {
        setCalendarLoading(false);
      }
    };
    void loadCalendar();
  }, [headers, calendarQuery]);

  useEffect(() => {
    if (!calendarQuery) {
      return;
    }
    if (calendarQuery === 'connected') {
      setCalendarMessage('Google Calendar connected.');
    } else if (calendarQuery === 'missing') {
      setCalendarMessage('Connected using your primary Google Calendar.');
    } else if (calendarQuery === 'error') {
      const messageParam = searchParams.get('message');
      setCalendarMessage(messageParam ?? 'Unable to connect Google Calendar.');
    }
    void router.replace('/therapist/profile', { scroll: false });
  }, [calendarQuery, router, searchParams]);

  const toggleVisibility = async () => {
    setMessage(null);
    const response = await fetch('/api/therapist/profile/visibility', {
      method: 'POST',
      headers,
      body: JSON.stringify({ visible: !visible }),
    });
    if (response.ok) {
      setVisible((prev) => !prev);
      setMessage('Visibility updated.');
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? 'Failed to update visibility');
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-700">Profile status</p>
          <p className="text-sm text-slate-600">{profile?.status ?? 'INCOMPLETE'}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Directory visibility</p>
            <p className="text-xs text-slate-500">
              {visible ? 'Your profile is discoverable by Lumora users.' : 'Currently hidden from the directory.'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600"
          >
            {visible ? 'Hide profile' : 'Show profile'}
          </button>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Link
          href="/therapist/onboarding"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Reopen onboarding
        </Link>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Google Calendar sync</p>
            <p className="text-xs text-slate-500">
              Connect your calendar to avoid double bookings and automatically add confirmed sessions.
            </p>
            {calendarStatus?.connected ? (
              <p className="text-xs text-emerald-600">
                Connected to calendar <span className="font-semibold">{calendarStatus.calendarId ?? 'primary'}</span>
                {calendarStatus.updatedAt ? ` · updated ${new Date(calendarStatus.updatedAt).toLocaleString()}` : ''}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Not connected</p>
            )}
          </div>
          {calendarStatus?.connected ? (
            <button
              type="button"
              onClick={async () => {
                setCalendarMessage(null);
                setCalendarLoading(true);
                try {
                  const response = await fetch('/api/integrations/google-calendar/disconnect', {
                    method: 'POST',
                    headers,
                  });
                  if (response.ok) {
                    setCalendarStatus({ connected: false });
                    setCalendarMessage('Google Calendar disconnected.');
                  } else {
                    setCalendarMessage('Unable to disconnect right now.');
                  }
                } catch (error) {
                  console.error(error);
                  setCalendarMessage('Unable to disconnect right now.');
                } finally {
                  setCalendarLoading(false);
                }
              }}
              disabled={calendarLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calendarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setCalendarMessage(null);
                setCalendarLoading(true);
                try {
                  const response = await fetch('/api/integrations/google-calendar/auth-url', {
                    method: 'POST',
                    headers,
                  });
                  if (!response.ok) {
                    setCalendarMessage('Unable to start Google Calendar connection.');
                    setCalendarLoading(false);
                    return;
                  }
                  const data = (await response.json()) as { url: string };
                  window.location.href = data.url;
                } catch (error) {
                  console.error(error);
                  setCalendarMessage('Unable to start Google Calendar connection.');
                  setCalendarLoading(false);
                }
              }}
              disabled={calendarLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {calendarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connect Google Calendar
            </button>
          )}
        </div>
        {calendarMessage && <p className="text-xs text-slate-600">{calendarMessage}</p>}
        {calendarLoading && !calendarStatus?.connected ? (
          <p className="text-xs text-slate-500">Redirecting to Google…</p>
        ) : null}
      </section>
    </div>
  );
}
