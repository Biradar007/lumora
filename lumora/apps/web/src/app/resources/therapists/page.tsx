'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseApp } from '@/lib/firebase';
import { getFirestore } from 'firebase/firestore';
import { TherapistCard } from '@/components/TherapistCard';
import { RequestButton } from '@/components/RequestButton';
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile, ConnectionRequest, Connection } from '@/types/domain';

interface DirectoryEntry extends TherapistProfile {
  displayName?: string;
  photoUrl?: string;
}

export default function TherapistDirectoryPage() {
  const { user, profile } = useAuth();
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
      const data = (await response.json()) as { therapists: TherapistProfile[] };
      const verifiedTherapists = (data.therapists ?? []).filter((entry) => entry.status === 'VERIFIED');
      if (verifiedTherapists.length === 0) {
        const db = getFirestore(getFirebaseApp());
        const snapshot = await getDocs(
          query(
            collection(db, 'therapistProfiles'),
            where('status', '==', 'VERIFIED'),
            where('visible', '==', true)
          )
        );
        const fallbackTherapists = snapshot.docs.map((docSnapshot) => docSnapshot.data() as TherapistProfile);
        setTherapists(fallbackTherapists);
        return;
      }
      setTherapists(verifiedTherapists);
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
  }, [languageFilter, modalityFilter, specialtyFilter, therapists]);

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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Find a therapist</h1>
        <p className="text-slate-600">Browse verified Lumora therapists and request a connection.</p>
      </header>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">
            Specialty
            <select
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="telehealth">Telehealth</option>
              <option value="inPerson">In-person</option>
            </select>
          </label>
        </div>
      </section>
      <div className="grid gap-4">
        {filteredTherapists.length === 0 && <p className="text-sm text-slate-500">No therapists match your filters.</p>}
        {filteredTherapists.map((therapist) => {
          const status = determineStatus(therapist.id);
          const pendingRequest = requests.find((request) => request.therapistId === therapist.id);
          return (
            <TherapistCard
              key={therapist.id}
              profile={therapist}
              name={therapist.displayName}
              photoUrl={therapist.photoUrl}
              actions={<RequestButton status={status} onRequest={() => sendRequest(therapist.id)} />}
              connectionStatus={
                <ConnectionStatusBadge
                  status={therapist.status}
                  visible={therapist.visible}
                  requestStatus={pendingRequest?.status}
                />
              }
            />
          );
        })}
      </div>
    </div>
  );
}
