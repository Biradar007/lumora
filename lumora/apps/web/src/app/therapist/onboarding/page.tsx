'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { THERAPIST_ONBOARDING_STEPS, computeTherapistProgress, isTherapistStepComplete } from '@/lib/therapistOnboarding';

export default function OnboardingOverview() {
  const { user } = useAuth();
  const { profile, loading } = useTherapistProfile(user?.uid);
  const progress = computeTherapistProgress(profile ?? null);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Therapist onboarding</h1>
        <p className="text-slate-600">
          Complete each step to publish your profile to the Lumora directory. You can update details anytime.
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="text-sm text-slate-500">{progress.percent}% complete</p>
      </header>

      <div className="grid gap-4">
        {THERAPIST_ONBOARDING_STEPS.map((step, index) => {
          const complete = isTherapistStepComplete(profile ?? null, step.key);
          return (
            <Link
              key={step.key}
              href={step.href}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Step {index + 1}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{step.label}</h2>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                    complete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {complete ? 'Complete' : 'Start'}
                </span>
              </div>
              <p className="text-sm text-slate-600">{step.description}</p>
            </Link>
          );
        })}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading profile…</p>}
    </div>
  );
}
