'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Chat } from '@/components/Chat';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Connection } from '@/types/domain';

interface ConnectionChatContentProps {
  connectionId: string;
  className?: string;
  onBack?: () => void;
  backLabel?: string;
}

export function ConnectionChatContent({
  connectionId,
  className,
  onBack,
  backLabel,
}: ConnectionChatContentProps) {
  const headers = useApiHeaders();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      setLoadingConnection(true);
      const response = await fetch('/api/connections', { headers });
      if (!response.ok) {
        setConnection(null);
        setLoadingConnection(false);
        return;
      }
      const data = (await response.json()) as { connections: Connection[] };
      const match = data.connections?.find((item) => item.id === connectionId) ?? null;
      setConnection(match ?? null);
      setLoadingConnection(false);
    };
    void load();
  }, [connectionId, headers]);

  const disabled = useMemo(() => {
    if (!connection) {
      return true;
    }
    return connection.status !== 'ACTIVE';
  }, [connection]);

  const containerClassName = ['flex flex-1 flex-col gap-4 min-h-[60vh]', className].filter(Boolean).join(' ');
  const backText = backLabel ?? 'Back to resources';

  return (
    <div className={containerClassName}>
      <header className="space-y-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            {backText}
          </button>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">Secure chat</h1>
        <p className="text-sm text-slate-600">
          Messages stay private between you and your therapist. Chat becomes read-only if the connection ends.
        </p>
        {loadingConnection ? (
          <p className="text-xs text-slate-500">Loading connection…</p>
        ) : !connection ? (
          <p className="text-xs text-slate-500">We could not find this connection. Chat is read-only.</p>
        ) : connection.status !== 'ACTIVE' ? (
          <p className="text-xs text-slate-500">
            This connection has ended. You can review past messages, but new messages are disabled.
          </p>
        ) : null}
      </header>
      <Chat connectionId={connectionId} disabled={disabled} />
    </div>
  );
}
