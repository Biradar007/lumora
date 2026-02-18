'use client';

import { use } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { ConnectionChatContent } from '@/components/ConnectionChatContent';

type RouteParams = Promise<{ connectionId: string }>;

export default function ConnectionChatPage({ params }: { params: RouteParams }) {
  const { connectionId } = use(params);

  return (
    <AuthGate>
      <ConnectionChatContent connectionId={connectionId} />
    </AuthGate>
  );
}
