'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment } from '@/types/domain';

const APPOINTMENTS_REFRESH_MS = 15_000;

const fetchAppointments = async (headers: HeadersInit): Promise<Appointment[]> => {
  const response = await fetch('/api/appointments', { headers });
  if (!response.ok) {
    throw new Error('Unable to load appointments.');
  }
  const data = (await response.json()) as { appointments?: Appointment[] };
  return data.appointments ?? [];
};

export default function TherapistAppointmentsPage() {
  const headers = useApiHeaders();
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Appointment['status']>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'video' | 'in-person'>('ALL');
  const canFetch = Boolean(headers['x-user-id']);

  const {
    data: appointments,
    isLoading,
    error,
    mutate,
  } = useSWR<Appointment[]>(
    canFetch ? ['therapist-appointments', headers['x-user-id']] : null,
    () => fetchAppointments(headers),
    {
      refreshInterval: APPOINTMENTS_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const mutateAppointment = async (id: string, payload: Record<string, unknown>) => {
    setActionError(null);
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setActionError(data.error ?? 'Failed to update appointment');
      return;
    }
    await mutate();
  };

  const handleConfirm = (id: string) => mutateAppointment(id, { action: 'CONFIRM' });
  const handleDecline = (id: string) => mutateAppointment(id, { action: 'DECLINE' });
  const handleCancel = (id: string) => mutateAppointment(id, { action: 'CANCEL' });

  const handleReschedule = async (appointment: Appointment) => {
    const defaultValue = new Date(appointment.start).toISOString().slice(0, 16);
    const input = window.prompt('New start time (ISO, e.g. 2025-03-01T14:30)', defaultValue);
    if (!input) {
      return;
    }
    const proposedStart = Date.parse(input);
    if (Number.isNaN(proposedStart)) {
      setActionError('Invalid date format. Use YYYY-MM-DDTHH:mm.');
      return;
    }
    const duration = appointment.end - appointment.start;
    const proposedEnd = proposedStart + duration;
    await mutateAppointment(appointment.id, { action: 'RESCHEDULE', start: proposedStart, end: proposedEnd });
  };

  const filteredAppointments = (appointments ?? []).filter((appointment) => {
    if (statusFilter !== 'ALL' && appointment.status !== statusFilter) {
      return false;
    }
    if (modeFilter !== 'ALL' && appointment.location !== modeFilter) {
      return false;
    }
    return true;
  });

  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const delta = a.start - b.start;
      return sortOrder === 'asc' ? delta : -delta;
    });
  }, [filteredAppointments, sortOrder]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/therapist/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
        <p className="text-sm text-slate-600">Confirm or cancel pending session requests.</p>
      </header>
      {error || actionError ? (
        <p className="text-sm text-rose-600">{actionError ?? (error instanceof Error ? error.message : String(error))}</p>
      ) : null}
      <section className="space-y-4">
        <div className="flex flex-wrap justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-[180px] flex-col text-sm text-slate-600">
            <label className="font-medium text-slate-700 mb-1" htmlFor="sort-order">
              Sort by
            </label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="asc">Earliest first</option>
              <option value="desc">Latest first</option>
            </select>
          </div>
          <div className="flex min-w-[180px] flex-col text-sm text-slate-600">
            <label className="font-medium text-slate-700 mb-1" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex min-w-[180px] flex-col text-sm text-slate-600">
            <label className="font-medium text-slate-700 mb-1" htmlFor="mode-filter">
              Mode
            </label>
            <select
              id="mode-filter"
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value as typeof modeFilter)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="ALL">All</option>
              <option value="video">Online</option>
              <option value="in-person">In-person</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading appointments…</p>
        ) : sortedAppointments.length === 0 ? (
          <p className="text-sm text-slate-500">No appointments match these filters.</p>
        ) : null}

        {sortedAppointments.map((appointment) => (
          <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">User {appointment.userId}</p>
              <p className="text-xs text-slate-500">
                {new Date(appointment.start).toLocaleString()} · {appointment.location}
              </p>
              <p className="text-xs text-slate-500">Status: {appointment.status}</p>
              {appointment.videoLink && appointment.location === 'video' ? (
                <p className="text-xs text-indigo-600 break-all">
                  Video link:{' '}
                  <a
                    href={appointment.videoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-indigo-500"
                  >
                    {appointment.videoLink}
                  </a>
                </p>
              ) : null}
              {appointment.googleCalendarEventId ? (
                <p className="text-[11px] text-emerald-600">Synced to Google Calendar</p>
              ) : null}
              {appointment.notes ? (
                <p className="text-xs text-slate-500">Notes: {appointment.notes}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {appointment.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirm(appointment.id)}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReschedule(appointment)}
                    className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(appointment.id)}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700"
                  >
                    Decline
                  </button>
                </>
              ) : appointment.status === 'CONFIRMED' ? (
                <button
                  type="button"
                  onClick={() => handleCancel(appointment.id)}
                  className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
