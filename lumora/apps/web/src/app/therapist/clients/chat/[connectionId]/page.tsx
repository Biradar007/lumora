'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionChatContent } from '@/components/ConnectionChatContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function TherapistClientChatPage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <ConnectionChatContent
        connectionId={connectionId}
        onBack={() => router.push('/therapist/clients')}
        backLabel="Back to clients"
      />
    </div>
  );
}
