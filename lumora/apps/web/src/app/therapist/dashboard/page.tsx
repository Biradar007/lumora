'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useAuth } from '@/contexts/AuthContext';
import type { ConnectionRequest, Appointment } from '@/types/domain';

export default function TherapistDashboard() {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      const [requestsRes, appointmentsRes] = await Promise.all([
        fetch('/api/requests/inbox', { headers }),
        fetch('/api/appointments', { headers }).catch(() => null),
      ]);
      if (requestsRes?.ok) {
        const data = (await requestsRes.json()) as { requests: ConnectionRequest[] };
        setRequests(data.requests ?? []);
      }
      if (appointmentsRes?.ok) {
        const data = (await appointmentsRes.json()) as { appointments: Appointment[] };
        setAppointments(data.appointments ?? []);
      }
    };
    void load();
  }, [headers]);

  const todaysAppointments = appointments.filter((appointment) => {
    const start = new Date(appointment.start);
    const now = new Date();
    return start.toDateString() === now.toDateString();
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">Therapist dashboard</h1>
        <p className="text-slate-600">Stay on top of requests, sessions, and profile visibility.</p>
      </header>
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
          <h2 className="text-sm font-medium text-slate-700">Profile visibility</h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {profile?.status === 'VERIFIED' ? (profile.visible ? 'Live in directory' : 'Hidden') : 'Needs verification'}
          </p>
          <p className="text-xs text-slate-500">
            {profile?.status === 'VERIFIED'
              ? 'Toggle visibility from your profile settings.'
              : 'Finish onboarding and verify to appear in the directory.'}
          </p>
          <Link href="/therapist/profile" className="mt-4 inline-flex text-sm font-medium text-indigo-600">
            Manage profile
          </Link>
        </div>
      </div>
    </div>
  );
}
