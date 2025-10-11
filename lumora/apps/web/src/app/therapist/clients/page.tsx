'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Connection } from '@/types/domain';

export default function TherapistClientsPage() {
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
        <h1 className="text-2xl font-semibold text-slate-900">Active clients</h1>
        <p className="text-sm text-slate-600">Manage your connections and open chats.</p>
      </header>
      <div className="grid gap-4">
        {connections.length === 0 && <p className="text-sm text-slate-500">No active connections yet.</p>}
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">User {connection.userId}</p>
              <p className="text-xs text-slate-500">
                Connected since {new Date(connection.startedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/chat/${connection.id}`}
                className="inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600"
              >
                Open chat
              </Link>
              <Link
                href={`/schedule/${connection.id}`}
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600"
              >
                View schedule
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
