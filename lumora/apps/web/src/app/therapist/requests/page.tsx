'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment, ConnectionRequest } from '@/types/domain';

export default function TherapistRequestsPage() {
  const headers = useApiHeaders();
  const router = useRouter();
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [appointmentRequests, setAppointmentRequests] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'connections' | 'appointments'>('connections');

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [connectionResponse, appointmentResponse] = await Promise.all([
        fetch('/api/requests/inbox', { headers }),
        fetch('/api/appointments', { headers }),
      ]);

      if (!connectionResponse.ok) {
        throw new Error('connection_requests_failed');
      }
      const connectionData = (await connectionResponse.json()) as { requests: ConnectionRequest[] };
      setConnectionRequests(connectionData.requests ?? []);

      if (!appointmentResponse.ok) {
        console.error('Failed to load appointment requests', appointmentResponse.status);
        setAppointmentRequests([]);
        setError((prev) => prev ?? 'Unable to load appointment requests right now.');
      } else {
        const appointmentData = (await appointmentResponse.json()) as { appointments: Appointment[] };
        const pendingAppointments = (appointmentData.appointments ?? []).filter(
          (appointment) => appointment.status === 'PENDING'
        );
        setAppointmentRequests(pendingAppointments);
      }
    } catch (err) {
      console.error('Failed to load request inbox', err);
      setError('Unable to load requests.');
      setConnectionRequests([]);
      setAppointmentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    void load();
  }, [headers]);

  const respondToConnection = async (id: string, action: 'accept' | 'decline', reason?: string) => {
    setError(null);
    const response = await fetch(`/api/requests/${id}/${action}`, {
      method: 'POST',
      headers,
      body: action === 'decline' ? JSON.stringify({ reason }) : undefined,
    });
    if (!response.ok) {
      setError('Unable to update request.');
      return;
    }
    await load();
  };

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
  const handleDeclineAppointment = (id: string) => mutateAppointment(id, { action: 'DECLINE' });
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
    await mutateAppointment(appointment.id, {
      action: 'RESCHEDULE',
      start: proposedStart,
      end: proposedEnd,
    });
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
        <h1 className="text-2xl font-semibold text-slate-900">Requests inbox</h1>
        <p className="text-sm text-slate-600">
          Review and respond to new connection and appointment requests from your clients.
        </p>
      </header>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'connections'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-700'
            }`}
          >
            Connection requests ({connectionRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'appointments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-700'
            }`}
          >
            Appointment requests ({appointmentRequests.length})
          </button>
        </div>
        <div className="space-y-4 p-4">
          {loading ? <p className="text-sm text-slate-500">Loading requests…</p> : null}
          {activeTab === 'connections' ? (
            <>
              {!loading && connectionRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No pending connection requests.</p>
              ) : null}
              {connectionRequests.map((request) => (
                <div
                  key={request.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">User {request.userId}</p>
                    {request.message && <p className="text-sm text-slate-600">“{request.message}”</p>}
                    <p className="text-xs text-slate-500">
                      Requested {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => respondToConnection(request.id, 'accept')}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToConnection(request.id, 'decline')}
                      className="inline-flex items-center rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {!loading && appointmentRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No pending appointment requests.</p>
              ) : null}
              {appointmentRequests.map((appointment) => (
                <div
                  key={appointment.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">User {appointment.userId}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(appointment.start).toLocaleString()} ·{' '}
                      {appointment.location === 'video' ? 'Online session' : 'In-person session'}
                    </p>
                    <p className="text-xs text-slate-500">Status: {appointment.status}</p>
                    {appointment.notes ? (
                      <p className="text-xs text-slate-500">Notes: {appointment.notes}</p>
                    ) : null}
                    {appointment.videoLink && appointment.location === 'video' ? (
                      <p className="text-xs text-indigo-600 break-all">
                        Requested video link: {appointment.videoLink}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirm(appointment.id)}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReschedule(appointment)}
                      className="inline-flex items-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineAppointment(appointment.id)}
                      className="inline-flex items-center rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
