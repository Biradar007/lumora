'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { UserShell } from '@/components/UserShell';
import { ConnectionChatContent } from '@/components/ConnectionChatContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function UserResourcesChatPage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);
  const router = useRouter();

  return (
    <UserShell activeView="resources">
      <div className="mx-auto w-full max-w-5xl p-6">
        <ConnectionChatContent connectionId={connectionId} onBack={() => router.push('/user/resources')} />
      </div>
    </UserShell>
  );
}
