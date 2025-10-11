'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import type { ConnectionRequest, Appointment, Connection } from '@/types/domain';

export default function TherapistDashboard() {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      const [requestsRes, appointmentsRes, connectionsRes] = await Promise.all([
        fetch('/api/requests/inbox', { headers }),
        fetch('/api/appointments', { headers }).catch(() => null),
        fetch('/api/connections', { headers }).catch(() => null),
      ]);
      if (requestsRes?.ok) {
        const data = (await requestsRes.json()) as { requests: ConnectionRequest[] };
        setRequests(data.requests ?? []);
      }
      if (appointmentsRes?.ok) {
        const data = (await appointmentsRes.json()) as { appointments: Appointment[] };
        setAppointments(data.appointments ?? []);
      }
      if (connectionsRes?.ok) {
        const data = (await connectionsRes.json()) as { connections: Connection[] };
        setConnections(data.connections ?? []);
      } else {
        setConnections([]);
      }
    };
    void load();
  }, [headers]);

  const todaysAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const start = new Date(appointment.start);
        const now = new Date();
        return start.toDateString() === now.toDateString();
      }),
    [appointments]
  );

  const activeConnections = useMemo(
    () => connections.filter((connection) => connection.status === 'ACTIVE'),
    [connections]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">Requests inbox</h2>
          <p className="mt-3 text-3xl font-semibold text-indigo-600">{requests.length}</p>
          <p className="text-xs text-slate-500">Pending user connection requests.</p>
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
      </div>
    </div>
  );
}
