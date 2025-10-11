'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AppointmentPicker } from '@/components/AppointmentPicker';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Connection, TherapistProfile } from '@/types/domain';
import { getFirebaseApp } from '@/lib/firebase';
import { getFirestore } from 'firebase/firestore';

export default function SchedulePage({ params }: { params: { connectionId: string } }) {
  const headers = useApiHeaders();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      const response = await fetch('/api/connections', { headers });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { connections: Connection[] };
      const match = data.connections?.find((item) => item.id === params.connectionId) ?? null;
      setConnection(match ?? null);
      if (match) {
        const db = getFirestore(getFirebaseApp());
        const profileSnapshot = await getDoc(doc(db, 'therapistProfiles', match.therapistId));
        setTherapistProfile((profileSnapshot.data() as TherapistProfile | undefined) ?? null);
      }
    };
    void load();
  }, [headers, params.connectionId]);

  const handleBook = async ({ start, end, location, videoLink }: { start: number; end: number; location: 'video' | 'in-person'; videoLink?: string }) => {
    if (!connection) {
      throw new Error('Connection not found');
    }
    setMessage(null);
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        connectionId: connection.id,
        therapistId: connection.therapistId,
        start,
        end,
        location,
        videoLink,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to book appointment');
    }
    setMessage('Appointment requested. Your therapist will confirm soon.');
  };

  if (!connection) {
    return <p className="text-sm text-slate-500">Connection not found.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Schedule a session</h1>
        <p className="text-sm text-slate-600">
          Choose a time that works for you. We&apos;ll notify your therapist to confirm.
        </p>
      </header>
      {therapistProfile && therapistProfile.availability?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Availability snapshot</h2>
          <p className="text-xs text-slate-500">
            {therapistProfile.availability
              .map((slot) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]} ${slot.start}–${slot.end}`)
              .join(', ')}
          </p>
        </div>
      )}
      <AppointmentPicker onBook={handleBook} sessionLengthMinutes={therapistProfile?.sessionLengthMinutes} />
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </div>
  );
}
