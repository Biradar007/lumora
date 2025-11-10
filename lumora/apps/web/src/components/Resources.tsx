"use client";

import Link from 'next/link';
import useSWR from 'swr';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  HeartHandshake,
  ArrowRight,
  Award,
  Languages,
  Video,
  MessageCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile, ConnectionRequest, Connection, Consent, ConsentScopes, Appointment } from '@/types/domain';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { RequestButton } from '@/components/RequestButton';

const EMPTY_CONSENT_SCOPES: ConsentScopes = {
  chatSummary: false,
  moodTrends: false,
  journals: false,
};

interface ConsentState {
  scopes: ConsentScopes;
  revokedAt?: number | null;
}

type Contact = {
  name: string;
  phone?: string;
  email?: string;
  hours?: string;
  locationUrl?: string;
};

interface ResourcesProps {
  onNavigateToCrisis?: () => void;
}

type DirectoryTherapist = TherapistProfile & {
  displayName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const authedFetcher = ([url, headers]: [string, Record<string, string>]) =>
  fetch(url, { headers }).then((res) => res.json());

export function Resources({ onNavigateToCrisis }: ResourcesProps) {
  const { user } = useAuth();
  const headers = useApiHeaders();
  const { data, isLoading, error } = useSWR<{ contacts: Contact[] }>(
    '/api/resources',
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [consents, setConsents] = useState<Record<string, ConsentState>>({});
  const [savingConsent, setSavingConsent] = useState<Record<string, boolean>>({});
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const [consentError, setConsentError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const connectionsByTherapist = useMemo(() => {
    const map = new Map<string, Connection>();
    connections.forEach((connection) => {
      const existing = map.get(connection.therapistId);
      if (!existing) {
        map.set(connection.therapistId, connection);
        return;
      }
      const currentIsActive = existing.status === 'ACTIVE';
      const nextIsActive = connection.status === 'ACTIVE';
      if (nextIsActive && !currentIsActive) {
        map.set(connection.therapistId, connection);
        return;
      }
      if (nextIsActive === currentIsActive) {
        const currentStart = existing.startedAt ?? 0;
        const nextStart = connection.startedAt ?? 0;
        if (nextStart > currentStart) {
          map.set(connection.therapistId, connection);
        }
      }
    });
    return map;
  }, [connections]);

  const {
    data: therapistData,
    isLoading: therapistsLoading,
    error: therapistError,
  } = useSWR<{ therapists: DirectoryTherapist[] }>(
    user ? ['/api/directory/therapists', headers] : null,
    authedFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const contacts = data?.contacts ?? [];
  const therapistDetails = therapistData?.therapists ?? [];
  const connectedTherapists = useMemo(
    () => therapistDetails.filter((therapist) => connectionsByTherapist.has(therapist.id)),
    [connectionsByTherapist, therapistDetails]
  );

  const activeAppointmentsByConnection = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach((appointment) => {
      if (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') {
        map.set(appointment.connectionId, appointment);
      }
    });
    return map;
  }, [appointments]);
  useEffect(() => {
    if (!user?.uid || !headers['x-user-id']) {
      return;
    }
    const db = getFirestore(getFirebaseApp());
    const load = async () => {
      const requestsSnapshot = await getDocs(
        query(collection(db, 'connectionRequests'), where('userId', '==', user.uid))
      );
      const connectionsResponse = await fetch('/api/connections', { headers }).catch(() => null);
      const consentsResponse = await fetch('/api/consents', { headers }).catch(() => null);
      const connectionData = connectionsResponse?.ok
        ? ((await connectionsResponse.json()) as { connections: Connection[] }).connections ?? []
        : [];
      if (consentsResponse?.ok) {
        const data = (await consentsResponse.json()) as { consents: Consent[] };
        const mapped: Record<string, ConsentState> = {};
        (data.consents ?? []).forEach((consent) => {
          mapped[consent.connectionId] = {
            scopes: {
              ...EMPTY_CONSENT_SCOPES,
              ...(consent.scopes ?? {}),
            },
            revokedAt: consent.revokedAt ?? null,
          };
        });
        setConsents(mapped);
        setConsentError(null);
      } else if (consentsResponse) {
        setConsentError('We could not load data sharing preferences. Please try again later.');
      }
      setConnections(connectionData);
      setRequests(requestsSnapshot.docs.map((docSnapshot) => docSnapshot.data() as ConnectionRequest));
    };
    void load();
  }, [headers, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !headers['x-user-id']) {
      setAppointments([]);
      return;
    }
    const loadAppointments = async () => {
      try {
        setAppointmentsLoading(true);
        setAppointmentsError(null);
        const response = await fetch('/api/appointments', { headers });
        if (!response.ok) {
          throw new Error('failed_to_load');
        }
        const data = (await response.json()) as { appointments: Appointment[] };
        setAppointments(data.appointments ?? []);
      } catch (error) {
        console.error('Failed to load appointments', error);
        setAppointmentsError('We could not load your appointments. Please try again later.');
      } finally {
        setAppointmentsLoading(false);
      }
    };
    void loadAppointments();
  }, [headers, user?.uid]);

  const formatAppointmentRange = (appointment: Appointment) => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return `${formatter.format(new Date(appointment.start))} – ${formatter.format(new Date(appointment.end))}`;
  };

  const determineStatus = (therapistId: string) => {
    const activeConnection = connections.find(
      (connection) => connection.therapistId === therapistId && connection.status === 'ACTIVE'
    );
    if (activeConnection) {
      return 'CONNECTED' as const;
    }
    const pendingRequest = requests.find(
      (request) => request.therapistId === therapistId && request.status === 'PENDING'
    );
    if (pendingRequest) {
      return pendingRequest.status;
    }
    const declined = requests.find((request) => request.therapistId === therapistId && request.status === 'DECLINED');
    if (declined) {
      return declined.status;
    }
    return 'AVAILABLE' as const;
  };

  const sendRequest = async (therapistId: string) => {
    if (!user?.uid) {
      return;
    }
    const message = typeof window !== 'undefined' ? window.prompt('Share an optional note for the therapist') : undefined;
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers,
      body: JSON.stringify({ therapistId, message: message || undefined }),
    });
    if (response.ok) {
      const data = (await response.json()) as { request: ConnectionRequest };
      setRequests((prev) => [...prev, data.request]);
    }
  };

  const updateConsent = async (
    connectionId: string,
    updates: Partial<Pick<ConsentScopes, 'chatSummary' | 'journals'>>
  ) => {
    const previousState: ConsentState = consents[connectionId]
      ? {
          scopes: { ...consents[connectionId].scopes },
          revokedAt: consents[connectionId].revokedAt ?? null,
        }
      : {
          scopes: { ...EMPTY_CONSENT_SCOPES },
          revokedAt: null,
        };
    const nextScopes: ConsentScopes = {
      ...previousState.scopes,
      ...updates,
    };
    setConsents((prev) => ({
      ...prev,
      [connectionId]: {
        scopes: nextScopes,
        revokedAt: previousState.revokedAt,
      },
    }));
    setSavingConsent((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const response = await fetch('/api/consents', {
        method: 'POST',
        headers,
        body: JSON.stringify({ connectionId, scopes: nextScopes }),
      });
      if (!response.ok) {
        throw new Error('Failed to save consent');
      }
      const data = (await response.json()) as { consent?: Consent };
      const consent = data?.consent;
      if (consent) {
        setConsents((prev) => ({
          ...prev,
          [connectionId]: {
            scopes: {
              ...EMPTY_CONSENT_SCOPES,
              ...(consent.scopes ?? nextScopes),
            },
            revokedAt: consent.revokedAt ?? null,
          },
        }));
      }
      setConsentError(null);
    } catch (error) {
      console.error('Failed to update consent', error);
      setConsents((prev) => ({
        ...prev,
        [connectionId]: previousState,
      }));
      setConsentError('Updating sharing preferences failed. Please try again.');
    } finally {
      setSavingConsent((prev) => {
        const copy = { ...prev };
        delete copy[connectionId];
        return copy;
      });
    }
  };

  const handleDisconnect = async (connection: Connection) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Disconnecting will end access to shared journals and AI chats. You can still review your private chat history. Continue?'
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
      const now = Date.now();
      setConnections((prev) =>
        prev.map((item) =>
          item.id === connection.id
            ? {
                ...item,
                status: 'ENDED',
                endedAt: now,
              }
            : item
        )
      );
      setConsents((prev) => {
        if (!prev[connection.id]) {
          return prev;
        }
        const copy = { ...prev };
        copy[connection.id] = {
          scopes: { ...EMPTY_CONSENT_SCOPES },
          revokedAt: now,
        };
        return copy;
      });
    } catch (error) {
      console.error('Failed to disconnect connection', error);
      if (typeof window !== 'undefined') {
        window.alert('We could not disconnect this connection. Please try again.');
      }
    } finally {
      setDisconnecting((prev) => {
        const copy = { ...prev };
        delete copy[connection.id];
        return copy;
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-3 mb-4 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center shrink-0">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Support & Resources</h1>
          </div>
          <p className="text-sm text-gray-600">
            Connect with caring professionals and on-campus services ready to help.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          These contacts are provided by your counseling center. Reach out to schedule an appointment,
          ask a question, or learn about available support options.
        </p>
      </section>

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {contacts.map((contact, index) => (
            <article
              key={`${contact.name}-${index}`}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 space-y-4 sm:p-6"
            >
              <header>
                <h2 className="text-lg font-semibold text-gray-800">{contact.name}</h2>
                {contact.hours && (
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{contact.hours}</span>
                  </div>
                )}
              </header>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Call {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Email Support
                  </a>
                )}
                {contact.locationUrl && (
                  <a
                    href={contact.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </article>
          ))}

        </div>
      )}

      {user ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {consentError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {consentError}
            </div>
          ) : null}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Verified Lumora therapists</h2>
              <p className="text-sm text-slate-600">
                Manage the Lumora therapists you&apos;re connected with today and revisit past connections all in one place.
              </p>
            </div>
            <Link
              href="/resources/therapists"
              className="hidden items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-900 sm:inline-flex"
            >
              View directory
            </Link>
          </header>

          {therapistError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              We couldn&apos;t load therapist profiles right now. Please try again soon.
            </div>
          ) : null}
          {appointmentsError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {appointmentsError}
            </div>
          ) : null}
          {appointmentsLoading ? (
            <p className="text-sm text-slate-500">Loading appointments…</p>
          ) : null}

          {therapistsLoading && connectedTherapists.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-32 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 animate-pulse" />
              ))}
            </div>
          ) : connectedTherapists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 space-y-2">
              <p className="font-semibold text-slate-700">You haven&apos;t connected with a Lumora therapist yet.</p>
              <p>
                <Link href="/resources/therapists" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Visit the directory
                </Link>{' '}
                to browse verified clinicians and request a private connection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedTherapists.map((therapist) => {
                const status = determineStatus(therapist.id);
                const connection = connectionsByTherapist.get(therapist.id);
                const isActive = connection?.status === 'ACTIVE';
                const connectionId = connection?.id;
                const consentState = connectionId ? consents[connectionId] : undefined;
                const scopes =
                  consentState && !consentState.revokedAt ? consentState.scopes : EMPTY_CONSENT_SCOPES;
                const pending = connectionId ? Boolean(savingConsent[connectionId]) : false;
                const disconnectBusy = connectionId ? Boolean(disconnecting[connectionId]) : false;
                const activeAppointment = connectionId
                  ? activeAppointmentsByConnection.get(connectionId)
                  : undefined;
                const endedAtLabel =
                  connection?.status === 'ENDED' && connection.endedAt
                    ? new Date(connection.endedAt).toLocaleString()
                    : null;
                return (
                  <article
                    key={therapist.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {therapist.displayName ?? therapist.email ?? therapist.id}
                        </h3>
                        {therapist.email && <p className="text-xs text-slate-500">{therapist.email}</p>}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        <Award className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    {therapist.bio ? (
                      <p className="text-xs text-slate-600 line-clamp-3">{therapist.bio}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {therapist.languages?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                          <Languages className="h-3 w-3" /> {therapist.languages.join(', ')}
                        </span>
                      ) : null}
                      {therapist.modality?.telehealth ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                          <Video className="h-3 w-3" /> Telehealth
                        </span>
                      ) : null}
                      {therapist.modality?.inPerson ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">In-person</span>
                      ) : null}
                      {therapist.specialties?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                          {therapist.specialties.slice(0, 2).join(', ')}
                          {therapist.specialties.length > 2 ? '…' : ''}
                        </span>
                      ) : null}
                    </div>
                    {connection ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              isActive
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Connected' : 'Connection ended'}
                          </span>
                          <Link
                            href={`/user/resources/chat/${connection.id}`}
                            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-center transition ${
                              isActive
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <MessageCircle className="h-4 w-4" />
                            {isActive ? 'Open chat' : 'View chat history'}
                          </Link>
                          {isActive ? (
                            activeAppointment ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAppointment(activeAppointment)}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
                              >
                                View appointment
                              </button>
                            ) : (
                              <Link
                                href={`/user/resources/schedule/${connection.id}`}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
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
                              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 text-center transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {disconnectBusy ? 'Disconnecting…' : 'Disconnect'}
                            </button>
                          ) : null}
                        </div>
                        {isActive ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
                              Sharing preferences
                            </p>
                            <div className="space-y-3">
                              <label className="flex items-center justify-between gap-4">
                                <span className="flex-1 text-xs">
                                  Allow therapist to review my AI chat sessions
                                  <span className="block text-[11px] text-slate-500">
                                    Share conversations you&apos;ve had with Lumora to support continuity of care.
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={scopes.chatSummary}
                                  disabled={pending || disconnectBusy}
                                  onChange={(event) =>
                                    connectionId
                                      ? updateConsent(connectionId, { chatSummary: event.target.checked })
                                      : undefined
                                  }
                                />
                              </label>
                              <label className="flex items-center justify-between gap-4">
                                <span className="flex-1 text-xs">
                                  Allow therapist to view my journal entries
                                  <span className="block text-[11px] text-slate-500">
                                    Grant access to your reflections to deepen session insights.
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={scopes.journals}
                                  disabled={pending || disconnectBusy}
                                  onChange={(event) =>
                                    connectionId
                                      ? updateConsent(connectionId, { journals: event.target.checked })
                                      : undefined
                                  }
                                />
                              </label>
                              {pending ? (
                                <p className="text-[11px] font-medium text-indigo-600">Saving preferences…</p>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Sharing disabled
                            </p>
                            <p>
                              Your therapist no longer has access to your AI chats or journal entries. You can still review
                              your private chat history above.
                            </p>
                            {endedAtLabel ? (
                              <p className="text-[11px] text-slate-500">Connection ended {endedAtLabel}.</p>
                            ) : null}
                            <RequestButton status={status} onRequest={() => sendRequest(therapist.id)} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <RequestButton status={status} onRequest={() => sendRequest(therapist.id)} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-sm text-indigo-700">
          Sign in to browse verified Lumora therapists and send connection requests.
        </div>
      )}

      <section className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Need immediate help?</h2>
        <p className="text-sm text-gray-600 mb-4">
          If you or someone you know is in crisis, visit the Crisis Support tab to find emergency
          hotlines and safety planning tools.
        </p>
        <button
          type="button"
          onClick={onNavigateToCrisis}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
          disabled={!onNavigateToCrisis}
        >
          Explore Crisis Support
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
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
                <dd className={selectedAppointment.status === 'CONFIRMED' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  {selectedAppointment.status === 'CONFIRMED'
                    ? 'Confirmed'
                    : selectedAppointment.status === 'PENDING'
                      ? 'Pending therapist confirmation'
                      : selectedAppointment.status}
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
            <button
              type="button"
              onClick={() => setSelectedAppointment(null)}
              className="mt-6 w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
