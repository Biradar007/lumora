'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Connection } from '@/types/domain';

export default function MyCarePage() {
  const headers = useApiHeaders();
  const [connections, setConnections] = useState<Connection[]>([]);

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
      setConnections((data.connections ?? []).filter((connection) => connection.status === 'ACTIVE'));
    };
    void load();
  }, [headers]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">My care team</h1>
        <p className="text-slate-600">Manage your active therapist connections.</p>
      </header>
      <div className="space-y-4">
        {connections.length === 0 && <p className="text-sm text-slate-500">You have no active connections yet.</p>}
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">Therapist {connection.therapistId}</p>
              <p className="text-xs text-slate-500">
                Connected since {new Date(connection.startedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/chat/${connection.id}`}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Open chat
              </Link>
              <Link
                href={`/schedule/${connection.id}`}
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600"
              >
                Manage sessions
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/connections/${connection.id}/disconnect`, { method: 'POST', headers });
                  const refreshed = await fetch('/api/connections', { headers });
                  if (refreshed.ok) {
                    const data = (await refreshed.json()) as { connections: Connection[] };
                    setConnections((data.connections ?? []).filter((item) => item.status === 'ACTIVE'));
                  }
                }}
                className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700"
              >
                End connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
