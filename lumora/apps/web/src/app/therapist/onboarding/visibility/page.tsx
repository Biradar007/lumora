'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';

export default function VisibilityStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [visible, setVisible] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setVisible(Boolean(profile.visible));
    }
  }, [profile]);

  const handleSubmit = async () => {
    setError(null);
    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({ visible }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save visibility');
      return;
    }
    router.push('/therapist/onboarding/review');
  };

  return (
    <OnboardingStep
      title="Visibility & notifications"
      description="Control whether clients can find you in the directory and how you receive alerts."
      onSubmit={handleSubmit}
      onBack={() => router.push('/therapist/onboarding/docs')}
    >
      <div className="space-y-6">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Visible in directory</p>
            <p className="text-xs text-slate-500">Only verified profiles can go live.</p>
          </div>
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Email notifications</p>
            <p className="text-xs text-slate-500">Get notified when users request to connect.</p>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(event) => setEmailNotifications(event.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Push notifications</p>
            <p className="text-xs text-slate-500">Mobile push alerts coming soon.</p>
          </div>
          <input
            type="checkbox"
            checked={pushNotifications}
            onChange={(event) => setPushNotifications(event.target.checked)}
            className="h-5 w-5 rounded border-slate-300"
            disabled
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
