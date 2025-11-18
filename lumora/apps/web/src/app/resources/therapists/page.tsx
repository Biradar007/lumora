'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { getFirestore } from 'firebase/firestore';
import { RequestButton } from '@/components/RequestButton';
import { TherapistCard } from '@/components/TherapistCard';
import { UserShell } from '@/components/UserShell';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile, ConnectionRequest, Connection } from '@/types/domain';

interface DirectoryEntry extends TherapistProfile {
  displayName?: string | null;
  photoUrl?: string | null;
  email?: string | null;
}

export default function TherapistDirectoryPage() {
  const { user } = useAuth();
  const headers = useApiHeaders();
  const [therapists, setTherapists] = useState<DirectoryEntry[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'telehealth' | 'inPerson'>('all');

  useEffect(() => {
    if (!headers['x-user-id']) {
      return;
    }
    const loadDirectory = async () => {
      const response = await fetch('/api/directory/therapists', { headers });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { therapists: DirectoryEntry[] };
      setTherapists((data.therapists ?? []).filter((entry) => entry.status === 'VERIFIED'));
    };
    void loadDirectory();
  }, [headers]);

  useEffect(() => {
    if (!user?.uid || !headers['x-user-id']) {
      return;
    }
    const db = getFirestore(getFirebaseApp());
    const load = async () => {
      const requestsSnapshot = await getDocs(query(collection(db, 'connectionRequests'), where('userId', '==', user.uid)));
      const connectionsResponse = await fetch('/api/connections', { headers });
      const connectionData = connectionsResponse.ok
        ? ((await connectionsResponse.json()) as { connections: Connection[] }).connections ?? []
        : [];
      setConnections(connectionData);
      setRequests(requestsSnapshot.docs.map((docSnapshot) => docSnapshot.data() as ConnectionRequest));
    };
    void load();
  }, [headers, user?.uid]);

  const filteredTherapists = useMemo(() => {
    return therapists.filter((therapist) => {
      const hasActiveConnection = connections.some(
        (connection) => connection.therapistId === therapist.id && connection.status === 'ACTIVE'
      );
      if (hasActiveConnection) {
        return false;
      }
      if (specialtyFilter && !therapist.specialties?.includes(specialtyFilter)) {
        return false;
      }
      if (languageFilter && !therapist.languages?.includes(languageFilter)) {
        return false;
      }
      if (modalityFilter === 'telehealth' && !therapist.modality?.telehealth) {
        return false;
      }
      if (modalityFilter === 'inPerson' && !therapist.modality?.inPerson) {
        return false;
      }
      return true;
    });
  }, [connections, languageFilter, modalityFilter, specialtyFilter, therapists]);

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

  const specialties = Array.from(new Set(therapists.flatMap((therapist) => therapist.specialties ?? []))).sort();
  const languages = Array.from(new Set(therapists.flatMap((therapist) => therapist.languages ?? []))).sort();
  const filtersActive = Boolean(specialtyFilter || languageFilter || modalityFilter !== 'all');

  const handleResetFilters = () => {
    setSpecialtyFilter('');
    setLanguageFilter('');
    setModalityFilter('all');
  };

  return (
    <UserShell activeView="resources" showDirectoryShortcut={false}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-4">
          <Link
            href="/user/resources"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to resources
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-[0_18px_35px_-18px_rgba(16,185,129,0.55)]">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Find a therapist</h1>
              <p className="text-sm text-slate-600">
                Browse verified Lumora therapists to request a private connection.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_45px_90px_-48px_rgba(79,70,229,0.45)] backdrop-blur sm:p-6">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Filter directory</h2>
                  <p className="text-xs text-slate-500">Narrow results by specialty, language, or modality.</p>
                </div>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Reset filters
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <label className="text-xs font-medium text-slate-600">
                  Specialty
                  <select
                    value={specialtyFilter}
                    onChange={(event) => setSpecialtyFilter(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">All</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Language
                  <select
                    value={languageFilter}
                    onChange={(event) => setLanguageFilter(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">All</option>
                    {languages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Modality
                  <select
                    value={modalityFilter}
                    onChange={(event) => setModalityFilter(event.target.value as typeof modalityFilter)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All</option>
                    <option value="telehealth">Telehealth</option>
                    <option value="inPerson">In-person</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Therapist matches</h2>
                  <p className="text-xs text-slate-500">Choose a clinician to see details and send a request.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                  {filteredTherapists.length}{' '}
                  {filteredTherapists.length === 1 ? 'match' : 'matches'}
                </span>
              </div>

              {filteredTherapists.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
                  No therapists match your filters. Try adjusting your selections to explore more options.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTherapists.map((therapist) => {
                    const status = determineStatus(therapist.id);
                    return (
                      <TherapistCard
                        key={therapist.id}
                        profile={therapist}
                        name={therapist.displayName ?? therapist.email ?? therapist.id}
                        // photoUrl={therapist.photoUrl}
                        actions={<RequestButton status={status} onRequest={() => sendRequest(therapist.id)} />}
                        showStatusBadge={false}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </UserShell>
  );
}
