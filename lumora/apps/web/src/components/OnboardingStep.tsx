'use client';

import { useTransition } from 'react';
import type { ReactNode } from 'react';

interface OnboardingStepProps {
  title: string;
  description: string;
  children: ReactNode;
  onSubmit?: () => Promise<void>;
  submitLabel?: string;
  onBack?: () => void;
}

export function OnboardingStep({ title, description, children, onSubmit, submitLabel = 'Save and continue', onBack }: OnboardingStepProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!onSubmit) {
      return;
    }
    startTransition(async () => {
      await onSubmit();
    });
  };

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-slate-600">{description}</p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
        {children}
        {(onSubmit || onBack) && (
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {onSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Saving…' : submitLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
