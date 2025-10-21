'use client';

import { useEffect, useState } from 'react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { ConnectionRequest } from '@/types/domain';

export default function TherapistRequestsPage() {
  const headers = useApiHeaders();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const response = await fetch('/api/requests/inbox', { headers });
    if (!response.ok) {
      setError('Unable to load requests.');
      return;
    }
    const data = (await response.json()) as { requests: ConnectionRequest[] };
    setRequests(data.requests ?? []);
  };

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    void load();
  }, [headers]);

  const respond = async (id: string, action: 'accept' | 'decline', reason?: string) => {
    setError(null);
    const response = await fetch(`/api/requests/${id}/${action}`, {
      method: 'POST',
      headers,
      body: action === 'decline' ? JSON.stringify({ reason }) : undefined,
    });
    if (!response.ok) {
      setError('Unable to update request.');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Requests inbox</h1>
        <p className="text-sm text-slate-600">Review and respond to user connection requests.</p>
      </header>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="space-y-4">
        {requests.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}
        {requests.map((request) => (
          <div key={request.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-700">User {request.userId}</p>
              {request.message && <p className="text-sm text-slate-600">“{request.message}”</p>}
              <p className="text-xs text-slate-500">
                Requested {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => respond(request.id, 'accept')}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => respond(request.id, 'decline')}
                className="inline-flex items-center rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
