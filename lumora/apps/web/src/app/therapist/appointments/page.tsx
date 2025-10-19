'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment } from '@/types/domain';

export default function TherapistAppointmentsPage() {
  const headers = useApiHeaders();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const response = await fetch('/api/appointments', { headers });
    if (!response.ok) {
      setError('Unable to load appointments.');
      return;
    }
    const data = (await response.json()) as { appointments: Appointment[] };
    setAppointments(data.appointments ?? []);
  };

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    void load();
  }, [headers]);

  const mutateAppointment = async (id: string, payload: Record<string, unknown>) => {
    setError(null);
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to update appointment');
      return;
    }
    await load();
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
      setError('Invalid date format. Use YYYY-MM-DDTHH:mm.');
      return;
    }
    const duration = appointment.end - appointment.start;
    const proposedEnd = proposedStart + duration;
    await mutateAppointment(appointment.id, { action: 'RESCHEDULE', start: proposedStart, end: proposedEnd });
  };

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
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-4">
        {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments yet.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">User {appointment.userId}</p>
              <p className="text-xs text-slate-500">
                {new Date(appointment.start).toLocaleString()} · {appointment.location}
              </p>
              <p className="text-xs text-slate-500">Status: {appointment.status}</p>
              {appointment.videoLink && appointment.location === 'video' ? (
                <p className="text-xs text-indigo-600 break-all">Video link: {appointment.videoLink}</p>
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
      </div>
    </div>
  );
}
