'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent } from 'react';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseApp } from '@/lib/firebase';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

export default function DocsStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const [docUrl, setDocUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.license?.docUrl) {
      setDocUrl(profile.license.docUrl);
    }
  }, [profile?.license?.docUrl]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const storage = getStorage(getFirebaseApp());
      const storageRef = ref(storage, `therapists/${user.uid}/license-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setDocUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!docUrl) {
      setError('Upload your license document.');
      return;
    }
    const response = await fetch('/api/therapist/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        license: {
          docUrl,
        },
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save document');
      return;
    }
    router.push('/therapist/onboarding/visibility');
  };

  return (
    <OnboardingStep
      title="License documents"
      description="Upload documentation so Lumora can review and verify your credentials."
      onSubmit={handleSubmit}
      onBack={() => router.push('/therapist/onboarding/modality')}
      submitLabel="Continue"
    >
      <div className="space-y-6">
        <label className="block text-sm font-medium text-slate-700">
          License document
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        {docUrl && (
          <p className="text-sm text-emerald-600">Document uploaded. We store the link securely for verification.</p>
        )}
        {uploading && <p className="text-sm text-slate-500">Uploading…</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
