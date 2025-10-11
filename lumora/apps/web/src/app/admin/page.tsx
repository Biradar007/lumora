'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile } from '@/types/domain';

interface AdminTherapist {
  id: string;
  profile: TherapistProfile;
  user: {
    email?: string;
    displayName?: string;
    role?: string;
    createdAt?: number;
  };
}

type ActionState = {
  [id: string]: 'pending' | 'success' | 'error';
};

const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function AdminDashboard() {
  const { profile } = useAuth();
  const headers = useApiHeaders();
  const [therapists, setTherapists] = useState<AdminTherapist[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({});

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      return;
    }
    const load = async () => {
      setFetching(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/therapists', { headers });
        if (!response.ok) {
          throw new Error('failed_to_load');
        }
        const data = (await response.json()) as { therapists: AdminTherapist[] };
        setTherapists(data.therapists ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load therapists');
      } finally {
        setFetching(false);
      }
    };
    void load();
  }, [headers, profile]);

  const pendingTherapists = useMemo(
    () => therapists.filter((entry) => entry.profile.status === 'PENDING_REVIEW'),
    [therapists]
  );
  const otherTherapists = useMemo(
    () => therapists.filter((entry) => entry.profile.status !== 'PENDING_REVIEW'),
    [therapists]
  );

  const updateStatusLocally = (id: string, next: Partial<TherapistProfile>) => {
    setTherapists((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              profile: {
                ...entry.profile,
                ...next,
                license: {
                  ...entry.profile.license,
                  ...(next.license ?? {}),
                },
              },
            }
          : entry
      )
    );
  };

  const handleApprove = async (id: string) => {
    setActionState((prev) => ({ ...prev, [id]: 'pending' }));
    try {
      const response = await fetch(`/api/admin/therapists/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'approve' as const }),
      });
      if (!response.ok) {
        throw new Error('approve_failed');
      }
      updateStatusLocally(id, { status: 'VERIFIED', visible: true, rejectionReason: null, license: { verified: true } });
      setActionState((prev) => ({ ...prev, [id]: 'success' }));
    } catch (err) {
      setActionState((prev) => ({ ...prev, [id]: 'error' }));
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Provide an optional reason for rejection:') ?? undefined;
    setActionState((prev) => ({ ...prev, [id]: 'pending' }));
    try {
      const response = await fetch(`/api/admin/therapists/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'reject' as const, reason }),
      });
      if (!response.ok) {
        throw new Error('reject_failed');
      }
      updateStatusLocally(id, { status: 'REJECTED', visible: false, rejectionReason: reason, license: { verified: false } });
      setActionState((prev) => ({ ...prev, [id]: 'success' }));
    } catch (err) {
      setActionState((prev) => ({ ...prev, [id]: 'error' }));
    }
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load therapist data. Please refresh the page.
        </div>
      ) : null}

      <section id="pending" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pending approval ({pendingTherapists.length})</h2>
            <p className="text-xs text-slate-500">Review submissions that need your attention.</p>
          </div>
        </header>

        {fetching && therapists.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading therapists…
          </div>
        ) : pendingTherapists.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-500">No therapists are waiting for review.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingTherapists.map((entry) => {
              const state = actionState[entry.id];
              return (
                <article key={entry.id} className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{entry.user.displayName ?? 'Unnamed therapist'}</span>
                      <span className="text-xs text-slate-500">{entry.user.email ?? 'No email on file'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>Submitted: {entry.profile.updatedAt ? formatter.format(entry.profile.updatedAt) : 'Unknown'}</span>
                      <span>Visibility: {entry.profile.visible ? 'Visible' : 'Hidden'}</span>
                      <span>Specialties: {entry.profile.specialties?.length ? entry.profile.specialties.join(', ') : '—'}</span>
                    </div>
                    {entry.profile.bio ? (
                      <p className="max-w-xl text-xs text-slate-600 line-clamp-2">{entry.profile.bio}</p>
                    ) : null}
                    <Link href={`/therapist/profile?user=${entry.id}`} className="text-xs font-semibold text-indigo-600 underline">
                      View detailed profile
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleReject(entry.id)}
                      disabled={state === 'pending'}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(entry.id)}
                      disabled={state === 'pending'}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="all" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All therapists ({therapists.length})</h2>
            <p className="text-xs text-slate-500">Search and manage existing therapist profiles.</p>
          </div>
        </header>
        {otherTherapists.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-500">No therapists found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Therapist</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Visibility</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {otherTherapists.map((entry) => {
                  const state = actionState[entry.id];
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{entry.user.displayName ?? 'Unnamed therapist'}</div>
                        <div className="text-xs text-slate-500">{entry.user.email ?? '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            entry.profile.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : entry.profile.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {entry.profile.status.toLowerCase().replace('_', ' ')}
                        </span>
                        {entry.profile.status === 'REJECTED' && entry.profile.rejectionReason ? (
                          <p className="mt-1 text-xs text-rose-600">Reason: {entry.profile.rejectionReason}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{entry.profile.visible ? 'Visible' : 'Hidden'}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {entry.profile.updatedAt ? formatter.format(entry.profile.updatedAt) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleApprove(entry.id)}
                            disabled={state === 'pending' || entry.profile.status === 'VERIFIED'}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(entry.id)}
                            disabled={state === 'pending'}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
