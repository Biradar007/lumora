'use client';

import { use } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { ScheduleSessionContent } from '@/components/ScheduleSessionContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function SchedulePage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);

  return (
    <AuthGate>
      <ScheduleSessionContent connectionId={connectionId} />
    </AuthGate>
  );
}
