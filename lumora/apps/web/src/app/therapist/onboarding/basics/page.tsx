'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';

export default function BasicsStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '');
      setLanguages((profile.languages ?? []).join(', '));
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!user?.uid) {
      setError('Sign in to continue.');
      return;
    }
    if (!bio || bio.length < 200) {
      setError('Bio should be at least 200 characters.');
      return;
    }
    setError(null);

    const payload = {
      bio,
      languages: languages.split(',').map((entry) => entry.trim()).filter(Boolean),
    };

    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save profile');
      return;
    }
    router.push('/therapist/onboarding/professional');
  };

  return (
    <OnboardingStep
      title="Basics"
      description="Introduce yourself so clients can understand your approach and languages offered."
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        <label className="block text-sm font-medium text-slate-700">
          Short bio (200–600 characters)
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Describe your therapeutic approach, experience focus, and what clients can expect."
          />
          <span className="mt-1 block text-xs text-slate-500">{bio.length} characters</span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Languages
          <input
            type="text"
            value={languages}
            onChange={(event) => setLanguages(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="English, Spanish"
          />
          <span className="mt-1 block text-xs text-slate-500">Separate languages with commas.</span>
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
