'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ScheduleSessionContent } from '@/components/ScheduleSessionContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function TherapistClientSchedulePage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ScheduleSessionContent
        connectionId={connectionId}
        onBack={() => router.push('/therapist/clients')}
        backLabel="Back to clients"
      />
    </div>
  );
}
