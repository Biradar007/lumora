'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { sanitizeJournalHtml } from '@/lib/journalHtml';
import type {
  Connection,
  Consent,
  ConsentScopes,
  JournalEntry,
  AiChatSession,
  AiChatMessage,
  Appointment,
} from '@/types/domain';

const CLIENTS_REFRESH_MS = 30_000;
const APPOINTMENTS_REFRESH_MS = 15_000;

const EMPTY_SCOPES: ConsentScopes = {
  chatSummary: false,
  moodTrends: false,
  journals: false,
};

const formatAppointmentRange = (appointment: Appointment) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(appointment.start))} – ${formatter.format(new Date(appointment.end))}`;
};

export default function TherapistClientsPage() {
  const headers = useApiHeaders();
  const router = useRouter();
  const [journalEntries, setJournalEntries] = useState<Record<string, JournalEntry[]>>({});
  const [journalLoading, setJournalLoading] = useState<Record<string, boolean>>({});
  const [journalError, setJournalError] = useState<Record<string, string>>({});
  const [sessionsByConnection, setSessionsByConnection] = useState<Record<string, AiChatSession[]>>({});
  const [sessionsLoading, setSessionsLoading] = useState<Record<string, boolean>>({});
  const [sessionsError, setSessionsError] = useState<Record<string, string>>({});
  const [sessionsExpanded, setSessionsExpanded] = useState<Record<string, boolean>>({});
  const [sessionMessages, setSessionMessages] = useState<Record<string, AiChatMessage[]>>({});
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState<Record<string, boolean>>({});
  const [sessionMessagesError, setSessionMessagesError] = useState<Record<string, string>>({});
  const [sessionMessagesExpanded, setSessionMessagesExpanded] = useState<Record<string, boolean>>({});
  const [journalExpanded, setJournalExpanded] = useState<Record<string, boolean>>({});
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const canFetch = Boolean(headers['x-user-id']);

  const {
    data: connectionsData,
    error: connectionsError,
    mutate: mutateConnections,
  } = useSWR<{ connections: Connection[] }>(
    canFetch ? ['therapist-connections', headers['x-user-id']] : null,
    async () => {
      const response = await fetch('/api/connections', { headers });
      if (!response.ok) {
        throw new Error('Failed to load connections');
      }
      return (await response.json()) as { connections: Connection[] };
    },
    {
      refreshInterval: CLIENTS_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const {
    data: consentsData,
    error: consentsError,
    mutate: mutateConsents,
  } = useSWR<{ consents: Consent[] }>(
    canFetch ? ['therapist-consents', headers['x-user-id']] : null,
    async () => {
      const response = await fetch('/api/consents', { headers });
      if (!response.ok) {
        throw new Error('Unable to load shared data preferences right now.');
      }
      return (await response.json()) as { consents: Consent[] };
    },
    {
      refreshInterval: CLIENTS_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const {
    data: appointmentsData,
    error: appointmentsError,
    mutate: mutateAppointments,
  } = useSWR<{ appointments: Appointment[] }>(
    canFetch ? ['therapist-connections-appointments', headers['x-user-id']] : null,
    async () => {
      const response = await fetch('/api/appointments', { headers });
      if (!response.ok) {
        throw new Error('Failed to load appointments');
      }
      return (await response.json()) as { appointments: Appointment[] };
    },
    {
      refreshInterval: APPOINTMENTS_REFRESH_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );

  const connections = connectionsData?.connections ?? [];
  const consents = useMemo(() => {
    const map: Record<string, Consent> = {};
    (consentsData?.consents ?? []).forEach((consent) => {
      map[consent.connectionId] = consent;
    });
    return map;
  }, [consentsData?.consents]);

  const activeAppointments = useMemo(() => {
    const map: Record<string, Appointment | null> = {};
    (appointmentsData?.appointments ?? []).forEach((appointment) => {
      if (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') {
        const existing = map[appointment.connectionId];
        if (!existing || appointment.start < existing.start) {
          map[appointment.connectionId] = appointment;
        }
      }
    });
    return map;
  }, [appointmentsData?.appointments]);

  const loading = canFetch && (!connectionsData || !consentsData);
  const error =
    connectionsError instanceof Error
      ? connectionsError.message
      : consentsError instanceof Error
        ? consentsError.message
        : appointmentsError instanceof Error
          ? appointmentsError.message
          : null;

  const hasConnections = connections.length > 0;

  const sharedConnections = useMemo(() => {
    const map: Record<string, ConsentScopes> = {};
    connections.forEach((connection) => {
      const consent = consents[connection.id];
      const canShare = connection.status === 'ACTIVE' && consent && !consent.revokedAt;
      map[connection.id] = canShare
        ? {
            ...EMPTY_SCOPES,
            ...(consent.scopes ?? {}),
          }
        : { ...EMPTY_SCOPES };
    });
    return map;
  }, [connections, consents]);

  const ensureSessions = async (connectionId: string) => {
    if (sessionsByConnection[connectionId] || sessionsLoading[connectionId]) {
      return;
    }
    setSessionsLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const response = await fetch(`/api/connections/${connectionId}/sessions`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }
      const data = (await response.json()) as { sessions: AiChatSession[] };
      setSessionsByConnection((prev) => ({ ...prev, [connectionId]: data.sessions ?? [] }));
      setSessionsError((prev) => {
        const copy = { ...prev };
        delete copy[connectionId];
        return copy;
      });
    } catch (err) {
      console.error(err);
      setSessionsError((prev) => ({
        ...prev,
        [connectionId]: 'Unable to load AI chat sessions.',
      }));
    } finally {
      setSessionsLoading((prev) => {
        const copy = { ...prev };
        delete copy[connectionId];
        return copy;
      });
    }
  };

  const ensureSessionMessages = async (connectionId: string, sessionId: string) => {
    const key = `${connectionId}:${sessionId}`;
    if (sessionMessages[key] || sessionMessagesLoading[key]) {
      return;
    }
    setSessionMessagesLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(`/api/connections/${connectionId}/sessions/${sessionId}/messages`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load session messages');
      }
      const data = (await response.json()) as { messages: AiChatMessage[] };
      setSessionMessages((prev) => ({ ...prev, [key]: data.messages ?? [] }));
      setSessionMessagesError((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } catch (err) {
      console.error(err);
      setSessionMessagesError((prev) => ({
        ...prev,
        [key]: 'Unable to load messages for this session.',
      }));
    } finally {
      setSessionMessagesLoading((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const loadJournals = async (connectionId: string) => {
    if (journalEntries[connectionId] || journalLoading[connectionId]) {
      return;
    }
    setJournalLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const response = await fetch(`/api/connections/${connectionId}/journals`, { headers });
      if (!response.ok) {
        throw new Error('Failed to load journals');
      }
      const data = (await response.json()) as { entries: JournalEntry[] };
      setJournalEntries((prev) => ({ ...prev, [connectionId]: data.entries ?? [] }));
      setJournalError((prev) => {
        const copy = { ...prev };
        delete copy[connectionId];
        return copy;
      });
    } catch (err) {
      console.error(err);
      setJournalError((prev) => ({
        ...prev,
        [connectionId]: 'Unable to load shared journals.',
      }));
    } finally {
      setJournalLoading((prev) => {
        const copy = { ...prev };
        delete copy[connectionId];
        return copy;
      });
    }
  };

  const handleDisconnect = async (connection: Connection) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Disconnecting will end access to the client’s shared journals and AI chat sessions. Continue?'
      );
      if (!confirmed) {
        return;
      }
    }
    setDisconnecting((prev) => ({ ...prev, [connection.id]: true }));
    try {
      const response = await fetch(`/api/connections/${connection.id}/disconnect`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        throw new Error('disconnect_failed');
      }
      await Promise.all([mutateConnections(), mutateConsents(), mutateAppointments()]);
      setSessionsByConnection((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setSessionsError((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setSessionsExpanded((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setSessionsLoading((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setJournalEntries((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setJournalLoading((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setJournalError((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      setJournalExpanded((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
      const prefix = `${connection.id}:`;
      const stripPrefixedKeys = <T,>(state: Record<string, T>) => {
        let mutated = false;
        const next: Record<string, T> = {};
        Object.entries(state).forEach(([key, value]) => {
          if (key.startsWith(prefix)) {
            mutated = true;
            return;
          }
          next[key] = value;
        });
        return mutated ? next : state;
      };
      setSessionMessages((prev) => stripPrefixedKeys(prev));
      setSessionMessagesError((prev) => stripPrefixedKeys(prev));
      setSessionMessagesLoading((prev) => stripPrefixedKeys(prev));
      setSessionMessagesExpanded((prev) => stripPrefixedKeys(prev));
      // Active appointment map will refresh through mutateAppointments
    } catch (err) {
      console.error('Failed to disconnect client connection', err);
      if (typeof window !== 'undefined') {
        window.alert('Unable to disconnect this client right now. Please try again.');
      }
    } finally {
      setDisconnecting((prev) => {
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/therapist/dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-600">View and manage all client connections.</p>
        </header>
        <p className="text-sm text-slate-500">Loading clients…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/therapist/dashboard')}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-600">View and manage all client connections.</p>
      </header>
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}
      <div className="grid gap-4">
        {!hasConnections && <p className="text-sm text-slate-500">No connections yet.</p>}
        {connections.map((connection) => {
          const isActive = connection.status === 'ACTIVE';
          const disconnectBusy = Boolean(disconnecting[connection.id]);
          return (
            <div
              key={connection.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700">User {connection.userId}</p>
                <p className="text-xs text-slate-500">
                  Connected since {new Date(connection.startedAt).toLocaleDateString()}
                  {connection.status !== 'ACTIVE' ? ` • Status: ${connection.status.toLowerCase()}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/therapist/clients/chat/${connection.id}`}
                  className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'border border-indigo-200 text-indigo-600 hover:border-indigo-300'
                      : 'border border-slate-200 text-slate-600 bg-slate-50 cursor-pointer'
                  }`}
                >
                  {isActive ? 'Open chat' : 'View chat history'}
                </Link>
                {isActive ? (
                  activeAppointments[connection.id] ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedAppointment(activeAppointments[connection.id] ?? null)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                      >
                        View appointment
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/therapist/clients/schedule/${connection.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300"
                    >
                      Schedule appointment
                    </Link>
                  )
                ) : null}
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(connection)}
                    disabled={disconnectBusy}
                    className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {disconnectBusy ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                ) : null}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Shared data
                </p>
                {!isActive ? (
                  <p className="text-[11px] text-slate-500">
                    This connection has ended. AI chats and journals remain hidden from your view.
                  </p>
                ) : null}
                {sharedConnections[connection.id]?.chatSummary ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">AI chat sessions</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !sessionsExpanded[connection.id];
                          setSessionsExpanded((prev) => ({ ...prev, [connection.id]: next }));
                          if (next) {
                            void ensureSessions(connection.id);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {sessionsExpanded[connection.id] ? 'Hide' : 'View'}
                      </button>
                    </div>
                    {sessionsExpanded[connection.id] ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                        {sessionsLoading[connection.id] ? (
                          <p className="text-[11px] text-slate-500">Loading shared sessions…</p>
                        ) : sessionsError[connection.id] ? (
                          <p className="text-[11px] text-rose-600 font-medium">{sessionsError[connection.id]}</p>
                        ) : sessionsByConnection[connection.id]?.length ? (
                          <div className="space-y-2">
                            {sessionsByConnection[connection.id].map((session) => {
                              const sessionKey = `${connection.id}:${session.id}`;
                              const sessionOpen = sessionMessagesExpanded[sessionKey] ?? false;
                              const messages = sessionMessages[sessionKey] ?? [];
                              const messageLoading = sessionMessagesLoading[sessionKey];
                              const messageError = sessionMessagesError[sessionKey];
                              return (
                                <div key={session.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-slate-700">
                                        {session.title ?? 'Conversation'}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        Updated {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = !sessionOpen;
                                        setSessionMessagesExpanded((prev) => ({ ...prev, [sessionKey]: next }));
                                        if (next) {
                                          void ensureSessionMessages(connection.id, session.id);
                                        }
                                      }}
                                      className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
                                    >
                                      {sessionOpen ? 'Hide messages' : 'View messages'}
                                    </button>
                                  </div>
                                  {sessionOpen ? (
                                    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 max-h-64 overflow-y-auto">
                                      {messageLoading ? (
                                        <p className="text-[11px] text-slate-500">Loading messages…</p>
                                      ) : messageError ? (
                                        <p className="text-[11px] text-rose-600 font-medium">{messageError}</p>
                                      ) : messages.length > 0 ? (
                                        messages.map((message) => (
                                          <div key={message.id} className="space-y-1 border-b border-slate-100 pb-2 last:border-none">
                                            <p className="text-[11px] font-semibold text-slate-500">
                                              {message.role === 'user' ? 'Client' : 'Assistant'} ·{' '}
                                              {message.createdAt ? new Date(message.createdAt).toLocaleString() : '—'}
                                            </p>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.content}</p>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-[11px] text-slate-500">No messages in this session yet.</p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">No AI chat sessions are shared yet.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">AI chat sessions are not shared by this client.</p>
                )}

                {sharedConnections[connection.id]?.journals ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">Journal entries</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !journalExpanded[connection.id];
                          setJournalExpanded((prev) => ({ ...prev, [connection.id]: next }));
                          if (next) {
                            void loadJournals(connection.id);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {journalExpanded[connection.id] ? 'Hide' : 'View'}
                      </button>
                    </div>
                    {journalExpanded[connection.id] ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                        {journalLoading[connection.id] ? (
                          <p className="text-[11px] text-slate-500">Loading shared journals…</p>
                        ) : journalError[connection.id] ? (
                          <p className="text-[11px] text-rose-600 font-medium">{journalError[connection.id]}</p>
                        ) : journalEntries[connection.id]?.length ? (
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {journalEntries[connection.id].map((entry) => (
                              <div key={entry.id} className="space-y-1 border-b border-slate-100 pb-2 last:border-none">
                                <p className="text-[11px] font-semibold text-slate-500">
                                  {new Date(entry.createdAt).toLocaleString()}
                                </p>
                                <div
                                  className="text-sm text-slate-700"
                                  dangerouslySetInnerHTML={{ __html: sanitizeJournalHtml(entry.content) }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">No journals are shared yet.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Journals are not shared by this client.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedAppointment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Appointment details</h2>
            </div>
            <dl className="space-y-3 text-sm text-slate-700">
              <div>
                <dt className="font-semibold text-slate-900">Time</dt>
                <dd>{formatAppointmentRange(selectedAppointment)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Location</dt>
                <dd>
                  {selectedAppointment.location === 'video'
                    ? 'Online (video session)'
                    : 'In-person session'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Status</dt>
                <dd
                  className={
                    selectedAppointment.status === 'CONFIRMED'
                      ? 'text-emerald-600 font-semibold'
                      : selectedAppointment.status === 'PENDING'
                        ? 'text-amber-600 font-semibold'
                        : 'text-slate-700 font-semibold'
                  }
                >
                  {selectedAppointment.status}
                </dd>
              </div>
              {selectedAppointment.videoLink ? (
                <div>
                  <dt className="font-semibold text-slate-900">Join link</dt>
                  <dd>
                    <a
                      href={selectedAppointment.videoLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 break-all"
                    >
                      {selectedAppointment.videoLink}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
