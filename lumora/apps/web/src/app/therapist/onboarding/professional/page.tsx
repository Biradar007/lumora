'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfessionalStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [credentials, setCredentials] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseRegion, setLicenseRegion] = useState('');
  const [years, setYears] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setCredentials((profile.credentials ?? []).join(', '));
      setSpecialties((profile.specialties ?? []).join(', '));
      setLicenseNumber(profile.license?.number ?? '');
      setLicenseRegion(profile.license?.region ?? '');
      setYears(profile.yearsExperience ?? '');
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!user?.uid) {
      setError('Sign in to continue.');
      return;
    }
    if (!credentials || !specialties) {
      setError('Add at least one credential and specialty.');
      return;
    }
    const body = {
      credentials: credentials.split(',').map((entry) => entry.trim()).filter(Boolean),
      specialties: specialties.split(',').map((entry) => entry.trim()).filter(Boolean),
      license: {
        number: licenseNumber || undefined,
        region: licenseRegion || undefined,
      },
      yearsExperience: years === '' ? undefined : Number(years),
    };
    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save profile');
      return;
    }
    router.push('/therapist/onboarding/modality');
  };

  return (
    <OnboardingStep
      title="Professional credentials"
      description="Share your credentials, specialties, and licensing so Lumora can verify your experience."
      onSubmit={handleSubmit}
      onBack={() => router.push('/therapist/onboarding/basics')}
    >
      <div className="space-y-6">
        <label className="block text-sm font-medium text-slate-700">
          Credentials (e.g., LPC, LMFT)
          <input
            type="text"
            value={credentials}
            onChange={(event) => setCredentials(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="LPC, NCC"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Specialties
          <input
            type="text"
            value={specialties}
            onChange={(event) => setSpecialties(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Anxiety, Stress, Relationships"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            License number
            <input
              type="text"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            License region
            <input
              type="text"
              value={licenseRegion}
              onChange={(event) => setLicenseRegion(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Years of experience
          <input
            type="number"
            min={0}
            value={years}
            onChange={(event) => setYears(event.target.value ? Number(event.target.value) : '')}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
