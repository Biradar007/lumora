import type { TherapistProfile } from '@/types/domain';

export interface TherapistOnboardingStep {
  key: 'basics' | 'professional' | 'modality' | 'visibility' | 'review';
  label: string;
  href: string;
  description: string;
}

export const THERAPIST_ONBOARDING_STEPS: TherapistOnboardingStep[] = [
  { key: 'basics', label: 'Basics', href: '/therapist/onboarding/basics', description: 'Introduce yourself to clients.' },
  {
    key: 'professional',
    label: 'Professional',
    href: '/therapist/onboarding/professional',
    description: 'Share credentials, specialties, and experience.',
  },
  {
    key: 'modality',
    label: 'Care modality',
    href: '/therapist/onboarding/modality',
    description: 'Describe how and when you offer care.',
  },
  {
    key: 'visibility',
    label: 'Visibility & notifications',
    href: '/therapist/onboarding/visibility',
    description: 'Control directory visibility and alerts.',
  },
  { key: 'review', label: 'Review & submit', href: '/therapist/onboarding/review', description: 'Submit for Lumora review.' },
];

export function isTherapistStepComplete(profile: TherapistProfile | null, key: TherapistOnboardingStep['key']): boolean {
  if (!profile) {
    return false;
  }
  switch (key) {
    case 'basics':
      return Boolean(profile.bio && profile.languages?.length);
    case 'professional':
      return Boolean(profile.credentials?.length && profile.specialties?.length);
    case 'modality':
      return Boolean(profile.modality?.telehealth || profile.modality?.inPerson);
    case 'visibility':
      return true;
    case 'review':
      return profile.status === 'PENDING_REVIEW' || profile.status === 'VERIFIED';
    default:
      return false;
  }
}

export interface TherapistOnboardingProgress {
  total: number;
  completed: number;
  percent: number;
}

export function computeTherapistProgress(profile: TherapistProfile | null): TherapistOnboardingProgress {
  const total = THERAPIST_ONBOARDING_STEPS.length;
  if (!profile) {
    return { total, completed: 0, percent: 0 };
  }
  const completed = THERAPIST_ONBOARDING_STEPS.filter((step) => isTherapistStepComplete(profile, step.key)).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}
