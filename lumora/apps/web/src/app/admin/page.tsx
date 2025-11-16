'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAdminSection } from '@/components/AdminShell';
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
  const { activeSection } = useAdminSection();
  const headers = useApiHeaders();
  const [therapists, setTherapists] = useState<AdminTherapist[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({});
  const [selectedTherapist, setSelectedTherapist] = useState<AdminTherapist | null>(null);

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
  const approvedTherapists = useMemo(
    () => therapists.filter((entry) => entry.profile.status === 'VERIFIED'),
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

  const pendingSection = (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                    <button
                      type="button"
                      onClick={() => setSelectedTherapist(entry)}
                      className="text-xs font-semibold text-indigo-600 underline underline-offset-2 transition hover:text-indigo-800"
                    >
                      View details
                    </button>
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
  );

  const allSection = (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            Approved therapists ({approvedTherapists.length})
          </h2>
          <p className="text-xs text-slate-500">Verified clinicians who are live in the Lumora directory.</p>
        </div>
      </header>
      {approvedTherapists.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-500 sm:px-6">No therapists found.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
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
                {approvedTherapists.map((entry) => {
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
                            onClick={() => setSelectedTherapist(entry)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View details
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
          <div className="space-y-4 px-4 py-4 md:hidden">
            {approvedTherapists.map((entry) => {
              const state = actionState[entry.id];
              return (
                <article key={entry.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.user.displayName ?? 'Unnamed therapist'}</p>
                      <p className="text-xs text-slate-500">{entry.user.email ?? '—'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${
                          entry.profile.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : entry.profile.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.profile.status.toLowerCase().replace('_', ' ')}
                      </span>
                      <span>Visibility: {entry.profile.visible ? 'Visible' : 'Hidden'}</span>
                      <span>Updated: {entry.profile.updatedAt ? formatter.format(entry.profile.updatedAt) : '—'}</span>
                    </div>
                    {entry.profile.status === 'REJECTED' && entry.profile.rejectionReason ? (
                      <p className="text-xs text-rose-600">Reason: {entry.profile.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedTherapist(entry)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      View details
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
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );

  const handleCloseDetails = () => setSelectedTherapist(null);
  const formatList = (items?: string[]) => (items && items.length > 0 ? items.join(', ') : 'Not provided');
  const formatModality = (modality?: TherapistProfile['modality']) => {
    if (!modality) return 'Not provided';
    const parts = [];
    if (modality.telehealth) parts.push('Telehealth');
    if (modality.inPerson) parts.push('In person');
    return parts.length > 0 ? parts.join(' • ') : 'Not provided';
  };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formatAvailability = (availability?: TherapistProfile['availability']) => {
    if (!availability || availability.length === 0) {
      return 'Not provided';
    }
    return availability
      .map((slot) => {
        const day = dayNames[slot.day] ?? `Day ${slot.day}`;
        return `${day} ${slot.start}–${slot.end}`;
      })
      .join(', ');
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Failed to load therapist data. Please refresh the page.
          </div>
        ) : null}

        {activeSection === 'pending' ? pendingSection : allSection}
      </div>

      {selectedTherapist ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseDetails} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div
              className="relative flex h-full w-full max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-3xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="therapist-detail-title"
            >
              <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                <div>
                  <p id="therapist-detail-title" className="text-xl font-semibold text-slate-900">
                    {selectedTherapist.user.displayName ?? 'Unnamed therapist'}
                  </p>
                  <p className="text-sm text-slate-500">{selectedTherapist.user.email ?? 'No email on file'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${
                        selectedTherapist.profile.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : selectedTherapist.profile.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {selectedTherapist.profile.status.toLowerCase().replace('_', ' ')}
                    </span>
                    <span>Visibility: {selectedTherapist.profile.visible ? 'Visible' : 'Hidden'}</span>
                    <span>
                      Updated:{' '}
                      {selectedTherapist.profile.updatedAt
                        ? formatter.format(selectedTherapist.profile.updatedAt)
                        : 'Not provided'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 px-4 py-4 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailCard label="Languages" value={formatList(selectedTherapist.profile.languages)} />
                  <DetailCard label="Specialties" value={formatList(selectedTherapist.profile.specialties)} />
                  <DetailCard label="Credentials" value={formatList(selectedTherapist.profile.credentials)} />
                  <DetailCard
                    label="Experience"
                    value={
                      selectedTherapist.profile.yearsExperience
                        ? `${selectedTherapist.profile.yearsExperience}+ years`
                        : 'Not provided'
                    }
                  />
                  <DetailCard
                    label="Session length"
                    value={
                      selectedTherapist.profile.sessionLengthMinutes
                        ? `${selectedTherapist.profile.sessionLengthMinutes} minutes`
                        : 'Not provided'
                    }
                  />
                  <DetailCard label="Modality" value={formatModality(selectedTherapist.profile.modality)} />
                  <DetailCard
                    label="Availability"
                    value={formatAvailability(selectedTherapist.profile.availability)}
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailCard
                    label="License number"
                    value={selectedTherapist.profile.license.number ?? 'Not provided'}
                  />
                  <DetailCard
                    label="License region"
                    value={selectedTherapist.profile.license.region ?? 'Not provided'}
                  />
                  <DetailCard
                    label="License verified"
                    value={selectedTherapist.profile.license.verified ? 'Yes' : 'Not yet'}
                  />
                  <DetailCard
                    label="License document"
                    value={
                      selectedTherapist.profile.license.docUrl ? (
                        <a
                          href={selectedTherapist.profile.license.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 underline hover:text-indigo-800"
                        >
                          View document
                        </a>
                      ) : (
                        'Not provided'
                      )
                    }
                  />
                </div>

                {selectedTherapist.profile.bio ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bio</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedTherapist.profile.bio}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

interface DetailCardProps {
  label: string;
  value: ReactNode;
  className?: string;
}

function DetailCard({ label, value, className = '' }: DetailCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm text-slate-800">{value ?? 'Not provided'}</p>
    </div>
  );
}
