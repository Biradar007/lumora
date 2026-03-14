'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { TherapistClientOverview } from '@/components/TherapistClientOverview';

type RouteParams = Promise<{ connectionId: string }>;

export default function TherapistClientOverviewPage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <TherapistClientOverview connectionId={connectionId} onBack={() => router.push('/therapist/clients')} />
    </div>
  );
}
