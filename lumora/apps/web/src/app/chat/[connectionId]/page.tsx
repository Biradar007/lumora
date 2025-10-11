'use client';

import { useEffect, useState } from 'react';
import { Chat } from '@/components/Chat';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Connection } from '@/types/domain';

export default function ConnectionChatPage({ params }: { params: { connectionId: string } }) {
  const headers = useApiHeaders();
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      const response = await fetch('/api/connections', { headers });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { connections: Connection[] };
      const match = data.connections?.find((item) => item.id === params.connectionId) ?? null;
      setConnection(match ?? null);
    };
    void load();
  }, [headers, params.connectionId]);

  const disabled = connection?.status !== 'ACTIVE';

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Secure chat</h1>
        <p className="text-sm text-slate-600">
          Messages stay private between you and your therapist. Chat becomes read-only if the connection ends.
        </p>
      </header>
      <Chat connectionId={params.connectionId} disabled={disabled} />
    </div>
  );
}
