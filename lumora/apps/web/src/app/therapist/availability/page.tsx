'use client';

import { useEffect, useState } from 'react';
import { AvailabilityGrid } from '@/components/AvailabilityGrid';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile } from '@/types/domain';

export default function TherapistAvailabilityPage() {
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [availability, setAvailability] = useState<TherapistProfile['availability']>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.availability) {
      setAvailability(profile.availability);
    }
  }, [profile?.availability]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({ availability }),
    });
    if (response.ok) {
      setMessage('Availability updated.');
    } else {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? 'Failed to update availability');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Availability</h1>
        <p className="text-sm text-slate-600">Adjust when new sessions can be booked.</p>
      </header>
      <AvailabilityGrid value={availability} onChange={setAvailability} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving…' : 'Save availability'}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
