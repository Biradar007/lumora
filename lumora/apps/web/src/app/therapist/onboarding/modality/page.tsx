'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
    router.push('/therapist/onboarding/docs');
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
          <input
            type="text"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="e.g. America/Chicago"
          />
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
