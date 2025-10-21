'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OnboardingStep } from '@/components/OnboardingStep';
import { AvailabilityGrid } from '@/components/AvailabilityGrid';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import type { TherapistProfile } from '@/types/domain';

export default function ModalityStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [telehealth, setTelehealth] = useState(false);
  const [inPerson, setInPerson] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [sessionLength, setSessionLength] = useState<25 | 50 | ''>('');
  const [availability, setAvailability] = useState<TherapistProfile['availability']>([]);
  const [error, setError] = useState<string | null>(null);

  const timezoneOptions = useMemo(() => {
    const fallback = [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Vancouver',
      'America/Toronto',
      'America/Sao_Paulo',
      'Europe/London',
      'Europe/Dublin',
      'Europe/Amsterdam',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Zurich',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Stockholm',
      'Europe/Helsinki',
      'Europe/Warsaw',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Singapore',
      'Asia/Hong_Kong',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
    ];
    const supported = typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function'
      ? (() => {
          try {
            return ((Intl as any).supportedValuesOf('timeZone') as string[]) ?? fallback;
          } catch (error) {
            console.warn('Unable to load supported timezones, falling back to defaults.', error);
            return fallback;
          }
        })()
      : fallback;
    return supported.length ? supported : fallback;
  }, []);

  const selectableTimezones = useMemo(() => {
    if (!timezone) {
      return timezoneOptions;
    }
    return timezoneOptions.includes(timezone) ? timezoneOptions : [timezone, ...timezoneOptions];
  }, [timezone, timezoneOptions]);

  useEffect(() => {
    if (profile) {
      setTelehealth(Boolean(profile.modality?.telehealth));
      setInPerson(Boolean(profile.modality?.inPerson));
      setTimezone(profile.timezone ?? '');
      setSessionLength((profile.sessionLengthMinutes as 25 | 50 | undefined) ?? '');
      setAvailability(profile.availability ?? []);
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!telehealth && !inPerson) {
      setError('Select at least one modality.');
      return;
    }
    if (!timezone) {
      setError('Choose a timezone.');
      return;
    }
    setError(null);
    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        modality: { telehealth, inPerson },
        timezone,
        sessionLengthMinutes: sessionLength || undefined,
        availability,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save profile');
      return;
    }
    router.push('/therapist/onboarding/visibility');
  };

  return (
    <OnboardingStep
      title="Care modality"
      description="Help clients understand how sessions take place and when you are available."
      onSubmit={handleSubmit}
      onBack={() => router.push('/therapist/onboarding/professional')}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={telehealth}
              onChange={(event) => setTelehealth(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">Telehealth</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={inPerson}
              onChange={(event) => setInPerson(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">In-person</span>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Timezone
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">Select timezone</option>
            {selectableTimezones.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Session length
          <select
            value={sessionLength}
            onChange={(event) => setSessionLength(event.target.value ? Number(event.target.value) as 25 | 50 : '')}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="">Select duration</option>
            <option value={25}>25 minutes</option>
            <option value={50}>50 minutes</option>
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Availability</p>
          <AvailabilityGrid value={availability} onChange={setAvailability} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
