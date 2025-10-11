'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';

export default function TherapistProfilePage() {
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setVisible(Boolean(profile.visible));
    }
  }, [profile]);

  const toggleVisibility = async () => {
    setMessage(null);
    const response = await fetch('/api/therapist/profile/visibility', {
      method: 'POST',
      headers,
      body: JSON.stringify({ visible: !visible }),
    });
    if (response.ok) {
      setVisible((prev) => !prev);
      setMessage('Visibility updated.');
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? 'Failed to update visibility');
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-700">Profile status</p>
          <p className="text-sm text-slate-600">{profile?.status ?? 'INCOMPLETE'}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Directory visibility</p>
            <p className="text-xs text-slate-500">
              {visible ? 'Your profile is discoverable by Lumora users.' : 'Currently hidden from the directory.'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600"
          >
            {visible ? 'Hide profile' : 'Show profile'}
          </button>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Link
          href="/therapist/onboarding"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Reopen onboarding
        </Link>
      </section>
    </div>
  );
}
