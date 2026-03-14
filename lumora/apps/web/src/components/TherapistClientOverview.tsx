'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, Calendar, Loader2, MessageCircleMore, NotebookPen, SmilePlus } from 'lucide-react';
import Link from 'next/link';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { sanitizeJournalHtml } from '@/lib/journalHtml';
import type { AiChatMessage, AiChatSession, Appointment, Connection, Consent, JournalEntry, MoodEntry } from '@/types/domain';

interface TherapistClientOverviewProps {
  connectionId: string;
  onBack: () => void;
}

const EMPTY_SCOPES = {
  chatSummary: false,
  moodTrends: false,
  journals: false,
} as const;

const MOOD_LABELS = ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
const MOOD_STYLES = [
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
];

function formatAppointmentRange(appointment: Appointment) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(appointment.start))} – ${formatter.format(new Date(appointment.end))}`;
}

function formatConsentState(connection: Connection | null, allowed: boolean, label: string): string {
  if (!connection) {
    return `Loading ${label.toLowerCase()}…`;
  }
  if (connection.requiresRegistration) {
    return 'Available after the client signs in or registers with Lumora.';
  }
  if (connection.status !== 'ACTIVE') {
    return 'Hidden because the connection has ended.';
  }
  if (!allowed) {
    return `The client has not shared ${label.toLowerCase()} with you.`;
  }
  return '';
}

export function TherapistClientOverview({ connectionId, onBack }: TherapistClientOverviewProps) {
  const headers = useApiHeaders();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [expandedJournals, setExpandedJournals] = useState<Record<string, boolean>>({});
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, AiChatMessage[]>>({});
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState<Record<string, boolean>>({});
  const [sessionMessagesError, setSessionMessagesError] = useState<Record<string, string>>({});
  const [sessionMessagesExpanded, setSessionMessagesExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [connectionsResponse, consentsResponse, appointmentsResponse] = await Promise.all([
          fetch('/api/connections', { headers }),
          fetch('/api/consents', { headers }),
          fetch('/api/appointments', { headers }).catch(() => null),
        ]);

        if (!connectionsResponse.ok || !consentsResponse.ok) {
          throw new Error('load_failed');
        }

        const connectionsPayload = (await connectionsResponse.json()) as { connections: Connection[] };
        const consentsPayload = (await consentsResponse.json()) as { consents: Consent[] };
        const appointmentsPayload =
          appointmentsResponse?.ok
            ? ((await appointmentsResponse.json()) as { appointments: Appointment[] })
            : { appointments: [] };

        const matchedConnection =
          (connectionsPayload.connections ?? []).find((entry) => entry.id === connectionId) ?? null;
        setConnection(matchedConnection);
        setConsent(
          (consentsPayload.consents ?? []).find((entry) => entry.connectionId === connectionId && !entry.revokedAt) ?? null
        );
        setAppointment(
          (appointmentsPayload.appointments ?? []).find(
            (entry) =>
              entry.connectionId === connectionId && (entry.status === 'PENDING' || entry.status === 'CONFIRMED')
          ) ?? null
        );
      } catch (loadError) {
        console.error('Failed to load therapist client overview', loadError);
        setError('Unable to load this client overview right now.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [connectionId, headers]);

  const scopes = consent && !consent.revokedAt ? { ...EMPTY_SCOPES, ...(consent.scopes ?? {}) } : EMPTY_SCOPES;
  const canViewJournals = Boolean(connection && !connection.requiresRegistration && connection.status === 'ACTIVE' && scopes.journals);
  const canViewMoods = Boolean(connection && !connection.requiresRegistration && connection.status === 'ACTIVE' && scopes.moodTrends);
  const canViewChats = Boolean(connection && !connection.requiresRegistration && connection.status === 'ACTIVE' && scopes.chatSummary);

  useEffect(() => {
    if (!canViewJournals) {
      setJournals([]);
      setJournalError(null);
      setJournalLoading(false);
      setExpandedJournals({});
      return;
    }
    const load = async () => {
      try {
        setJournalLoading(true);
        const response = await fetch(`/api/connections/${connectionId}/journals`, { headers });
        if (!response.ok) {
          throw new Error('journal_failed');
        }
        const payload = (await response.json()) as { entries: JournalEntry[] };
        setJournals(payload.entries ?? []);
        setJournalError(null);
      } catch (loadError) {
        console.error('Failed to load shared journals', loadError);
        setJournalError('Unable to load shared journal entries.');
      } finally {
        setJournalLoading(false);
      }
    };
    void load();
  }, [canViewJournals, connectionId, headers]);

  useEffect(() => {
    if (!canViewMoods) {
      setMoods([]);
      setMoodError(null);
      setMoodLoading(false);
      return;
    }
    const load = async () => {
      try {
        setMoodLoading(true);
        const response = await fetch(`/api/connections/${connectionId}/moods`, { headers });
        if (!response.ok) {
          throw new Error('mood_failed');
        }
        const payload = (await response.json()) as { entries: MoodEntry[] };
        setMoods(payload.entries ?? []);
        setMoodError(null);
      } catch (loadError) {
        console.error('Failed to load shared mood history', loadError);
        setMoodError('Unable to load shared mood history.');
      } finally {
        setMoodLoading(false);
      }
    };
    void load();
  }, [canViewMoods, connectionId, headers]);

  useEffect(() => {
    if (!canViewChats) {
      setSessions([]);
      setSessionsError(null);
      setSessionsLoading(false);
      return;
    }
    const load = async () => {
      try {
        setSessionsLoading(true);
        const response = await fetch(`/api/connections/${connectionId}/sessions`, { headers });
        if (!response.ok) {
          throw new Error('sessions_failed');
        }
        const payload = (await response.json()) as { sessions: AiChatSession[] };
        setSessions(payload.sessions ?? []);
        setSessionsError(null);
      } catch (loadError) {
        console.error('Failed to load shared chat sessions', loadError);
        setSessionsError('Unable to load shared AI chat sessions.');
      } finally {
        setSessionsLoading(false);
      }
    };
    void load();
  }, [canViewChats, connectionId, headers]);

  const ensureSessionMessages = async (sessionId: string) => {
    if (sessionMessages[sessionId] || sessionMessagesLoading[sessionId]) {
      return;
    }
    setSessionMessagesLoading((current) => ({ ...current, [sessionId]: true }));
    try {
      const response = await fetch(`/api/connections/${connectionId}/sessions/${sessionId}/messages`, { headers });
      if (!response.ok) {
        throw new Error('session_messages_failed');
      }
      const payload = (await response.json()) as { messages: AiChatMessage[] };
      setSessionMessages((current) => ({ ...current, [sessionId]: payload.messages ?? [] }));
      setSessionMessagesError((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
    } catch (loadError) {
      console.error('Failed to load shared session messages', loadError);
      setSessionMessagesError((current) => ({
        ...current,
        [sessionId]: 'Unable to load messages for this session.',
      }));
    } finally {
      setSessionMessagesLoading((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
    }
  };

  const averageMood = useMemo(() => {
    if (moods.length === 0) {
      return null;
    }
    const recentEntries = moods.slice(0, 7);
    return recentEntries.reduce((sum, entry) => sum + entry.mood, 0) / recentEntries.length;
  }, [moods]);

  const journalContent = useMemo(
    () =>
      journals.map((entry) => {
        const html = sanitizeJournalHtml(entry.content);
        const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return {
          id: entry.id,
          createdAt: entry.createdAt,
          html,
          isLong: plainText.length > 220,
        };
      }),
    [journals]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading client overview…
        </div>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </button>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error ?? 'Client not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">
                  {connection.clientDisplayName ?? connection.clientEmail ?? connection.userId}
                </h1>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    connection.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {connection.status === 'ACTIVE' ? 'Active connection' : 'Connection ended'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {connection.clientEmail ? <span>{connection.clientEmail}</span> : null}
                {connection.clientPhone ? <span>{connection.clientPhone}</span> : null}
                <span>Connected {new Date(connection.startedAt).toLocaleDateString()}</span>
                <span>{connection.connectionSource === 'therapist_added' ? 'Added by therapist' : 'Requested via Lumora'}</span>
              </div>
              {connection.clientNotes ? (
                <p className="max-w-3xl text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Notes:</span> {connection.clientNotes}
                </p>
              ) : null}
              {connection.requiresRegistration ? (
                <p className="text-sm text-slate-500">
                  This client has not linked a Lumora account yet. Shared mood history, journals, and AI chats will
                  become available after signup and consent.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/therapist/clients/chat/${connection.id}`}
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                  connection.status === 'ACTIVE' && !connection.requiresRegistration
                    ? 'border border-indigo-200 text-indigo-600 hover:border-indigo-300'
                    : 'border border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                Open chat
              </Link>
              {connection.status === 'ACTIVE' && !connection.requiresRegistration ? (
                <Link
                  href={`/therapist/clients/schedule/${connection.id}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                >
                  {appointment ? 'Manage appointment' : 'Schedule appointment'}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Connection summary
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Status: {connection.status === 'ACTIVE' ? 'Active' : 'Ended'}</p>
            <p>Invite email: {connection.inviteEmailStatus === 'sent' ? 'Sent' : connection.inviteEmailStatus === 'failed' ? 'Failed' : 'Not sent'}</p>
            <p>Client account: {connection.requiresRegistration ? 'Pending signup' : 'Linked'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Calendar className="h-4 w-4 text-indigo-600" />
            Appointment snapshot
          </div>
          <div className="mt-4 text-sm text-slate-600">
            {appointment ? (
              <div className="space-y-2">
                <p>{formatAppointmentRange(appointment)}</p>
                <p>
                  {appointment.location === 'video' ? 'Online (video session)' : 'In-person session'} •{' '}
                  {appointment.status === 'CONFIRMED' ? 'Confirmed' : 'Pending confirmation'}
                </p>
                {appointment.videoLink ? (
                  <a
                    href={appointment.videoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Open meeting link
                  </a>
                ) : null}
              </div>
            ) : (
              <p>No active appointment is scheduled for this client.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="flex h-[44rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <SmilePlus className="h-4 w-4 text-indigo-600" />
            Mood history
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {canViewMoods ? (
              moodLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading mood history…
                </div>
              ) : moodError ? (
                <p className="text-sm text-rose-600">{moodError}</p>
              ) : moods.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    Average over last {Math.min(moods.length, 7)} entries:{' '}
                    <span className="font-semibold">
                      {averageMood !== null ? MOOD_LABELS[Math.round(averageMood)] : 'Unavailable'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {moods.slice(0, 10).map((entry) => (
                      <div key={entry.id} className={`rounded-xl border px-3 py-3 text-sm ${MOOD_STYLES[entry.mood] ?? MOOD_STYLES[2]}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{MOOD_LABELS[entry.mood] ?? 'Mood'}</span>
                          <span className="text-xs">{entry.entryDate}</span>
                        </div>
                        {entry.note ? <p className="mt-2 text-xs text-slate-700">{entry.note}</p> : null}
                        {entry.activities?.length ? (
                          <p className="mt-2 text-[11px] text-slate-600">{entry.activities.join(', ')}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No shared mood entries yet.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">{formatConsentState(connection, canViewMoods, 'Mood history')}</p>
            )}
          </div>
        </article>

        <article className="flex h-[44rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <NotebookPen className="h-4 w-4 text-indigo-600" />
            Journal entries
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {canViewJournals ? (
              journalLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading journal entries…
                </div>
              ) : journalError ? (
                <p className="text-sm text-rose-600">{journalError}</p>
              ) : journalContent.length > 0 ? (
                <div className="space-y-4">
                  {journalContent.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                      <div
                        className={`mt-2 text-sm text-slate-700 ${expandedJournals[entry.id] ? '' : 'line-clamp-4'}`}
                        dangerouslySetInnerHTML={{ __html: entry.html }}
                      />
                      {entry.isLong ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedJournals((current) => ({
                              ...current,
                              [entry.id]: !current[entry.id],
                            }))
                          }
                          className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          {expandedJournals[entry.id] ? 'View less' : 'View more'}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No shared journal entries yet.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">{formatConsentState(connection, canViewJournals, 'Journal entries')}</p>
            )}
          </div>
        </article>

        <article className="flex h-[44rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Brain className="h-4 w-4 text-indigo-600" />
            AI chats
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {canViewChats ? (
              sessionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading AI chat sessions…
                </div>
              ) : sessionsError ? (
                <p className="text-sm text-rose-600">{sessionsError}</p>
              ) : sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const expanded = sessionMessagesExpanded[session.id] ?? false;
                    const messages = sessionMessages[session.id] ?? [];
                    const messageError = sessionMessagesError[session.id];
                    const messageLoading = Boolean(sessionMessagesLoading[session.id]);
                    return (
                      <div key={session.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{session.title ?? 'Conversation'}</p>
                            <p className="text-[11px] text-slate-500">
                              Updated {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !expanded;
                              setSessionMessagesExpanded((current) => ({ ...current, [session.id]: next }));
                              if (next) {
                                void ensureSessionMessages(session.id);
                              }
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            {expanded ? 'Hide messages' : 'View messages'}
                          </button>
                        </div>
                        {expanded ? (
                          <div className="mt-3 max-h-60 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                            {messageLoading ? (
                              <p className="text-xs text-slate-500">Loading messages…</p>
                            ) : messageError ? (
                              <p className="text-xs text-rose-600">{messageError}</p>
                            ) : messages.length > 0 ? (
                              messages.map((message) => (
                                <div key={message.id} className="border-b border-slate-100 pb-2 text-sm last:border-none">
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    {message.role === 'user' ? 'Client' : 'Assistant'} •{' '}
                                    {message.createdAt ? new Date(message.createdAt).toLocaleString() : '—'}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{message.content}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">No messages in this session yet.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No shared AI chat sessions yet.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">{formatConsentState(connection, canViewChats, 'AI chats')}</p>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageCircleMore className="h-4 w-4 text-indigo-600" />
          Sharing summary
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-medium ${scopes.chatSummary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            AI chats {scopes.chatSummary ? 'shared' : 'not shared'}
          </span>
          <span className={`rounded-full px-3 py-1 font-medium ${scopes.journals ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            Journals {scopes.journals ? 'shared' : 'not shared'}
          </span>
          <span className={`rounded-full px-3 py-1 font-medium ${scopes.moodTrends ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            Mood history {scopes.moodTrends ? 'shared' : 'not shared'}
          </span>
        </div>
      </section>
    </div>
  );
}
