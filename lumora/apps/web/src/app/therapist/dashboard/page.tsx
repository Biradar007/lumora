'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import type { ConnectionRequest, Appointment, Connection } from '@/types/domain';
import { Loader2 } from 'lucide-react';

interface DashboardData {
  requests: ConnectionRequest[];
  appointments: Appointment[];
  connections: Connection[];
}

interface CalendarStatus {
  connected: boolean;
  calendarId?: string;
  updatedAt?: number | null;
}

const DASHBOARD_REFRESH_MS = 15_000;
const CALENDAR_REFRESH_MS = 60_000;

const fetchDashboardData = async (headers: HeadersInit): Promise<DashboardData> => {
  const [requestsRes, appointmentsRes, connectionsRes] = await Promise.all([
    fetch('/api/requests/inbox', { headers }),
    fetch('/api/appointments', { headers }).catch(() => null),
    fetch('/api/connections', { headers }).catch(() => null),
  ]);

  const [requests, appointments, connections] = await Promise.all([
    requestsRes?.ok
      ? requestsRes.json().then((data: { requests?: ConnectionRequest[] }) => data.requests ?? [])
      : [],
    appointmentsRes?.ok
      ? appointmentsRes.json().then((data: { appointments?: Appointment[] }) => data.appointments ?? [])
      : [],
    connectionsRes?.ok
      ? connectionsRes.json().then((data: { connections?: Connection[] }) => data.connections ?? [])
      : [],
  ]);

  return { requests, appointments, connections };
};

const fetchCalendarStatus = async (headers: HeadersInit): Promise<CalendarStatus> => {
  const response = await fetch('/api/integrations/google-calendar/status', { headers });
  if (!response.ok) {
    throw new Error('Unavailable');
  }
  return response.json() as Promise<CalendarStatus>;
};

export default function TherapistDashboard() {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const shouldFetch = Boolean(headers['x-user-id']);

  const { data: dashboardData } = useSWR<DashboardData>(
    shouldFetch ? ['therapist-dashboard', headers['x-user-id']] : null,
    () => fetchDashboardData(headers),
    {
      refreshInterval: DASHBOARD_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const {
    data: calendarStatus,
    isLoading: calendarLoading,
    error: calendarError,
  } = useSWR<CalendarStatus>(
    shouldFetch ? ['calendar-status', headers['x-user-id']] : null,
    () => fetchCalendarStatus(headers),
    {
      refreshInterval: CALENDAR_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const requests = dashboardData?.requests ?? [];
  const appointments = dashboardData?.appointments ?? [];
  const connections = dashboardData?.connections ?? [];

  const todaysAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((appointment: Appointment) => {
      if (appointment.status !== 'CONFIRMED') {
        return false;
      }
      const start = new Date(appointment.start);
      return start.toDateString() === now.toDateString();
    });
  }, [appointments]);

  const activeConnections = useMemo(
    () => connections.filter((connection: Connection) => connection.status === 'ACTIVE'),
    [connections]
  );

  const calendarErrorMessage =
    calendarError instanceof Error ? calendarError.message : calendarError ? String(calendarError) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Requests inbox</h2>
          <p className="mt-3 text-3xl font-semibold text-indigo-600">{requests.length}</p>
          <p className="text-xs text-slate-500">Pending user requests.</p>
          <Link href="/therapist/requests" className="mt-4 inline-flex text-sm font-medium text-indigo-600">
            View requests
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Today&apos;s sessions</h2>
          <p className="mt-3 text-3xl font-semibold text-indigo-600">{todaysAppointments.length}</p>
          <p className="text-xs text-slate-500">Sessions scheduled for today.</p>
          <Link href="/therapist/appointments" className="mt-4 inline-flex text-sm font-medium text-indigo-600">
            Manage schedule
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Connected Clients</h2>
          <p className="mt-3 text-3xl font-semibold text-indigo-600">{activeConnections.length}</p>
          <p className="text-xs text-slate-500">
            {activeConnections.length === 0
              ? 'No connected clients yet.'
              : 'Manage your active client connections.'}
          </p>
          <Link href="/therapist/clients" className="mt-4 inline-flex text-sm font-medium text-indigo-600">
            Manage clients
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Calendar sync</h2>
          {calendarLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking status…
            </div>
          ) : calendarStatus?.connected ? (
            <>
              <p className="mt-3 text-sm font-semibold text-emerald-600">Connected</p>
              <p className="text-xs text-slate-500">
                Syncing with <span className="font-medium">{calendarStatus.calendarId ?? 'primary'}</span>
                {calendarStatus.updatedAt ? ` • updated ${new Date(calendarStatus.updatedAt).toLocaleString()}` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-slate-600">Not connected</p>
              <p className="text-xs text-slate-500">Connect Google Calendar to prevent double bookings.</p>
              {calendarErrorMessage ? <p className="text-[11px] text-rose-500">{calendarErrorMessage}</p> : null}
            </>
          )}
          <Link href="/therapist/profile" className="mt-4 inline-flex text-sm font-medium text-indigo-600">
            Manage calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
