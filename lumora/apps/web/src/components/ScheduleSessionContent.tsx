'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { AppointmentPicker } from '@/components/AppointmentPicker';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment, Connection, TherapistProfile } from '@/types/domain';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleSessionContentProps {
  connectionId: string;
  className?: string;
  onBack?: () => void;
  backLabel?: string;
}

export function ScheduleSessionContent({ connectionId, className, onBack, backLabel }: ScheduleSessionContentProps) {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ start: number; end: number }[]>([]);
  const [availabilityTimezone, setAvailabilityTimezone] = useState<string>('UTC');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [existingAppointment, setExistingAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!user || !headers['x-user-id']) {
      setConnection(null);
      return;
    }
    const load = async () => {
      const response = await fetch('/api/connections', { headers });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { connections: Connection[] };
      const match = data.connections?.find((item) => item.id === connectionId) ?? null;
      setConnection(match ?? null);
      if (!match) {
        setExistingAppointment(null);
        return;
      }
      {
        const appointmentResponse = await fetch('/api/appointments', { headers });
        if (appointmentResponse.ok) {
          const payload = (await appointmentResponse.json()) as { appointments: Appointment[] };
          const activeAppointment =
            (payload.appointments ?? []).find(
              (appointment) =>
                appointment.connectionId === match.id &&
                (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED')
            ) ?? null;
          setExistingAppointment(activeAppointment);
          if (activeAppointment) {
            return;
          }
        }
        const db = getFirestore(getFirebaseApp());
        const profileSnapshot = await getDoc(doc(db, 'therapistProfiles', match.therapistId));
        setTherapistProfile((profileSnapshot.data() as TherapistProfile | undefined) ?? null);
        setAvailabilityLoading(true);
        setAvailabilityError(null);
        try {
          const availabilityResponse = await fetch(
            `/api/therapists/${match.therapistId}/availability?from=${Date.now()}&to=${
              Date.now() + 28 * 24 * 60 * 60 * 1000
            }`,
            { headers }
          );
          if (availabilityResponse.ok) {
            const availabilityData = (await availabilityResponse.json()) as {
              availability: { start: number; end: number }[];
              timezone: string;
              sessionLengthMinutes?: number;
            };
            setAvailableSlots(availabilityData.availability ?? []);
            setAvailabilityTimezone(availabilityData.timezone ?? 'UTC');
          } else {
            setAvailabilityError('Unable to load live availability right now.');
            setAvailableSlots([]);
          }
        } catch (error) {
          console.error('Failed to load availability', error);
          setAvailabilityError('Unable to load live availability right now.');
          setAvailableSlots([]);
        } finally {
          setAvailabilityLoading(false);
        }
      }
    };
    void load();
  }, [connectionId, headers, user]);

  const handleBook = async ({
    start,
    end,
    location,
    videoLink,
  }: {
    start: number;
    end: number;
    location: 'video' | 'in-person';
    videoLink?: string;
  }) => {
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
      if (data.error === 'appointment_exists') {
        throw new Error('You already have an upcoming appointment with this therapist.');
      }
      throw new Error(data.error ?? 'Failed to book appointment');
    }
    setMessage('notify');
  };

  if (!user) {
    return <p className="text-sm text-slate-500">Sign in to schedule sessions.</p>;
  }

  const containerClassName = ['space-y-6', className].filter(Boolean).join(' ');
  const backText = backLabel ?? 'Back to resources';

  if (existingAppointment) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const startLabel = formatter.format(new Date(existingAppointment.start));
    const endLabel = formatter.format(new Date(existingAppointment.end));
    const statusLabel =
      existingAppointment.status === 'CONFIRMED'
        ? 'Confirmed'
        : existingAppointment.status === 'PENDING'
          ? 'Pending therapist confirmation'
          : existingAppointment.status;
    return (
      <div className={containerClassName}>
        <header className="space-y-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" />
              {backText}
            </button>
          ) : null}
          <h1 className="text-2xl font-semibold text-slate-900">You already have an appointment</h1>
          <p className="text-sm text-slate-600">
            You can review the details below. Cancel or reschedule from your therapist dashboard if needed.
          </p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-sm text-slate-700">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Starts</span>
            <span>{startLabel}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Ends</span>
            <span>{endLabel}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Location</span>
            <span>{existingAppointment.location === 'video' ? 'Online (video session)' : 'In-person session'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-900">Status</span>
            <span
              className={
                existingAppointment.status === 'CONFIRMED' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'
              }
            >
              {statusLabel}
            </span>
          </div>
          {existingAppointment.videoLink ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-slate-900">Join link</span>
              <a
                href={existingAppointment.videoLink}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-500 break-all"
              >
                {existingAppointment.videoLink}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (!connection) {
    return <p className="text-sm text-slate-500">Connection not found.</p>;
  }

  return (
    <div className={containerClassName}>
      <header className="space-y-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            {backText}
          </button>
        ) : null}
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
              .map(
                (slot) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]} ${slot.start}–${slot.end}`
              )
              .join(', ')}
          </p>
          {availabilityLoading ? (
            <p className="text-xs text-slate-400 mt-2">Syncing with calendar…</p>
          ) : availabilityError ? (
            <p className="text-xs text-rose-500 mt-2">{availabilityError}</p>
          ) : null}
        </div>
      )}
      <AppointmentPicker
        onBook={handleBook}
        sessionLengthMinutes={therapistProfile?.sessionLengthMinutes}
        availableSlots={availableSlots}
        timezone={availabilityTimezone}
      />
      {message === 'notify' ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
          </span>
          <span>Appointment requested.</span>
        </div>
      ) : null}    </div>
  );
}
