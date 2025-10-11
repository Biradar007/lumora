'use client';

import { useEffect, useState } from 'react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment } from '@/types/domain';

export default function TherapistAppointmentsPage() {
  const headers = useApiHeaders();
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

  const updateStatus = async (id: string, status: Appointment['status']) => {
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError('Failed to update appointment');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <header>
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
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateStatus(appointment.id, 'CONFIRMED')}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => updateStatus(appointment.id, 'CANCELLED')}
                className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
