'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AddClientModal, type AddClientResult } from '@/components/AddClientModal';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { Appointment, Connection } from '@/types/domain';

const CLIENTS_REFRESH_MS = 30_000;
const APPOINTMENTS_REFRESH_MS = 15_000;

interface FlashMessage {
  tone: 'success' | 'warning';
  text: string;
}

const formatAppointmentRange = (appointment: Appointment) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(appointment.start))} – ${formatter.format(new Date(appointment.end))}`;
};

const getConnectionBadge = (connection: Connection): FlashMessage => {
  if (connection.connectionSource === 'therapist_added' && connection.requiresRegistration) {
    if (connection.clientEmail) {
      return connection.inviteEmailStatus === 'sent'
        ? { tone: 'success', text: 'Invite sent' }
        : connection.inviteEmailStatus === 'failed'
          ? { tone: 'warning', text: 'Invite failed' }
          : { tone: 'warning', text: 'Awaiting signup' };
    }
    return { tone: 'warning', text: 'Added manually' };
  }
  return connection.status === 'ACTIVE'
    ? { tone: 'success', text: 'Connected' }
    : { tone: 'warning', text: 'Connection ended' };
};

export default function TherapistClientsPage() {
  const headers = useApiHeaders();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState<Record<string, boolean>>({});
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const addClientOpen = searchParams.get('addClient') === '1';
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

  useEffect(() => {
    if (!flashMessage) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setFlashMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  const loading = canFetch && !connectionsData;
  const error =
    connectionsError instanceof Error
      ? connectionsError.message
      : appointmentsError instanceof Error
        ? appointmentsError.message
        : null;

  const handleDisconnect = async (connection: Connection) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Disconnecting will end access to this client’s shared data and secure chat. Continue?'
      );
      if (!confirmed) {
        return;
      }
    }
    setDisconnecting((current) => ({ ...current, [connection.id]: true }));
    try {
      const response = await fetch(`/api/connections/${connection.id}/disconnect`, {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        throw new Error('disconnect_failed');
      }
      await Promise.all([mutateConnections(), mutateAppointments()]);
    } catch (disconnectError) {
      console.error('Failed to disconnect client connection', disconnectError);
      if (typeof window !== 'undefined') {
        window.alert('Unable to disconnect this client right now. Please try again.');
      }
    } finally {
      setDisconnecting((current) => {
        const next = { ...current };
        delete next[connection.id];
        return next;
      });
    }
  };

  const handleCancelAppointment = async (appointment: Appointment) => {
    const reason =
      typeof window !== 'undefined'
        ? window.prompt('Please provide a brief explanation for cancelling this appointment.')
        : null;
    if (reason === null) {
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      if (typeof window !== 'undefined') {
        window.alert('Cancellation requires an explanation.');
      }
      return;
    }
    setCancellingAppointmentId(appointment.id);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'CANCEL', reason: trimmedReason }),
      });
      if (!response.ok) {
        throw new Error('cancel_failed');
      }
      await mutateAppointments();
      setSelectedAppointment(null);
    } catch (cancelError) {
      console.error('Failed to cancel appointment', cancelError);
      if (typeof window !== 'undefined') {
        window.alert('Unable to cancel this appointment right now. Please try again.');
      }
    } finally {
      setCancellingAppointmentId(null);
    }
  };

  const handleOpenAddClient = () => {
    router.push('/therapist/clients?addClient=1', { scroll: false });
  };

  const handleCloseAddClient = () => {
    router.replace('/therapist/clients', { scroll: false });
  };

  const handleClientCreated = async (result: AddClientResult) => {
    await mutateConnections(
      (current) => ({
        connections: [result.connection, ...(current?.connections ?? []).filter((entry) => entry.id !== result.connection.id)],
      }),
      { revalidate: false }
    );
    setFlashMessage(
      result.invite.status === 'failed'
        ? { tone: 'warning', text: 'Client added, but the invite email could not be sent.' }
        : result.invite.status === 'sent'
          ? { tone: 'success', text: 'Client added and invite email sent.' }
          : { tone: 'success', text: 'Client added successfully.' }
    );
    handleCloseAddClient();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push('/therapist/dashboard')}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
              <p className="text-sm text-slate-600">View and manage all client connections.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddClient}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add client
          </button>
        </header>
        <p className="text-sm text-slate-500">Loading clients…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/therapist/dashboard')}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
            <p className="text-sm text-slate-600">
              Use the overview page for each client to review profile details, mood history, journals, and AI chats.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAddClient}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add client
        </button>
      </header>

      {flashMessage ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            flashMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {flashMessage.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4">
        {connections.length === 0 ? <p className="text-sm text-slate-500">No connections yet.</p> : null}
        {connections.map((connection) => {
          const isActive = connection.status === 'ACTIVE';
          const canUseInteractiveFeatures = isActive && !connection.requiresRegistration;
          const disconnectBusy = Boolean(disconnecting[connection.id]);
          const appointment = activeAppointments[connection.id];
          const badge = getConnectionBadge(connection);

          return (
            <article key={connection.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {connection.clientDisplayName ?? connection.clientEmail ?? connection.userId}
                    </h2>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        badge.tone === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Connected {new Date(connection.startedAt).toLocaleDateString()}</span>
                    <span>{connection.connectionSource === 'therapist_added' ? 'Added by therapist' : 'Requested via Lumora'}</span>
                    {connection.clientEmail ? <span>{connection.clientEmail}</span> : null}
                    {connection.clientPhone ? <span>{connection.clientPhone}</span> : null}
                  </div>
                  {connection.clientNotes ? (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Notes:</span> {connection.clientNotes}
                    </p>
                  ) : null}
                  {appointment ? (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Upcoming appointment:</span> {formatAppointmentRange(appointment)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/therapist/clients/${connection.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:border-indigo-300"
                  >
                    <FileText className="h-4 w-4" />
                    Client overview
                  </Link>
                  <Link
                    href={`/therapist/clients/chat/${connection.id}`}
                    className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                      canUseInteractiveFeatures || !isActive
                        ? isActive
                          ? 'border border-indigo-200 text-indigo-600 hover:border-indigo-300'
                          : 'border border-slate-200 bg-slate-50 text-slate-600'
                        : 'border border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {isActive ? 'Open chat' : 'View chat history'}
                  </Link>
                  {canUseInteractiveFeatures ? (
                    appointment ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAppointment(appointment)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                      >
                        View appointment
                      </button>
                    ) : (
                      <Link
                        href={`/therapist/clients/schedule/${connection.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
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
                      className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {disconnectBusy ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
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
                <dd>{selectedAppointment.location === 'video' ? 'Online (video session)' : 'In-person session'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Status</dt>
                <dd
                  className={
                    selectedAppointment.status === 'CONFIRMED'
                      ? 'font-semibold text-emerald-600'
                      : selectedAppointment.status === 'PENDING'
                        ? 'font-semibold text-amber-600'
                        : 'font-semibold text-slate-700'
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
                      className="break-all text-indigo-600 hover:text-indigo-500"
                    >
                      {selectedAppointment.videoLink}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {selectedAppointment.status !== 'CANCELLED' ? (
                <button
                  type="button"
                  onClick={() => handleCancelAppointment(selectedAppointment)}
                  disabled={cancellingAppointmentId === selectedAppointment.id}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {cancellingAppointmentId === selectedAppointment.id ? 'Cancelling…' : 'Cancel appointment'}
                </button>
              ) : null}
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

      <AddClientModal isOpen={addClientOpen} onClose={handleCloseAddClient} onCreated={handleClientCreated} />
    </div>
  );
}
