'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocsStep() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/therapist/onboarding/visibility');
  }, [router]);

  return null;
}
