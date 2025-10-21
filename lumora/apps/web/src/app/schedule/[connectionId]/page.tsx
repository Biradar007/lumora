'use client';

import { use } from 'react';
import { ScheduleSessionContent } from '@/components/ScheduleSessionContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function SchedulePage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);

  return <ScheduleSessionContent connectionId={connectionId} />;
}
