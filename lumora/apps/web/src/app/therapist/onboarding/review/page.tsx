'use client';

import { useRouter } from 'next/navigation';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';

export default function ReviewStep() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const headers = useApiHeaders();
  const hasSubmitted = profile?.status === 'PENDING_REVIEW' || profile?.status === 'VERIFIED';

  const handleSubmit = async () => {
    if (hasSubmitted) {
      router.push('/therapist/dashboard');
      return;
    }
    const response = await fetch('/api/therapist/profile/submit', {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      return;
    }
    router.push('/therapist/dashboard');
  };

  return (
    <OnboardingStep
      title="Review & submit"
      description="Confirm your details and submit for Lumora verification."
      onSubmit={handleSubmit}
      onBack={() => router.push('/therapist/onboarding/visibility')}
      submitLabel={hasSubmitted ? 'Go to dashboard' : 'Submit for review'}
    >
      <div className="space-y-6">
        {!profile && <p className="text-sm text-slate-500">No profile details yet.</p>}
        {profile && (
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Bio</dt>
              <dd className="text-slate-600">{profile.bio || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Specialties</dt>
              <dd className="text-slate-600">{profile.specialties?.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Credentials</dt>
              <dd className="text-slate-600">{profile.credentials?.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Availability</dt>
              <dd className="text-slate-600">
                {profile.availability?.length
                  ? profile.availability
                      .map((slot) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]} ${slot.start}–${slot.end}`)
                      .join(', ')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">License document</dt>
              <dd className="text-slate-600">{profile.license?.docUrl ? 'Uploaded' : 'Missing'}</dd>
            </div>
          </dl>
        )}
        {hasSubmitted && (
          <p className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            Your profile is pending review. You can continue to the dashboard while we verify your credentials.
          </p>
        )}
      </div>
    </OnboardingStep>
  );
}
