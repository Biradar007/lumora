'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell } from '@/components/UserShell';
import { ScheduleSessionContent } from '@/components/ScheduleSessionContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function UserResourcesSchedulePage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);
  const router = useRouter();

  return (
    <UserShell activeView="resources">
      <div className="mx-auto w-full max-w-4xl p-6">
        <ScheduleSessionContent connectionId={connectionId} onBack={() => router.push('/user/resources')} />
      </div>
    </UserShell>
  );
}
