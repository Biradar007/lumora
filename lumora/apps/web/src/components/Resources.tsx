"use client";

import useSWR from 'swr';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ExternalLink, HeartHandshake, ArrowRight, Award, Languages, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { TherapistProfile } from '@/types/domain';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';

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

  const [therapistDetails, setTherapistDetails] = useState<(TherapistProfile & { displayName?: string; email?: string })[]>([]);

  const {
    data: therapistData,
    isLoading: therapistsLoading,
    error: therapistError,
  } = useSWR<{ therapists: TherapistProfile[] }>(
    user ? ['/api/directory/therapists', headers] : null,
    authedFetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const contacts = data?.contacts ?? [];
  const verifiedTherapists = useMemo(
    () => (therapistData?.therapists ?? []).filter((therapist) => therapist.status === 'VERIFIED'),
    [therapistData?.therapists]
  );

  useEffect(() => {
    const hydrate = async (profiles: TherapistProfile[]) => {
      try {
        const db = getFirestore(getFirebaseApp());
        const entries = await Promise.all(
          profiles.map(async (profile) => {
            try {
              const userSnapshot = await getDoc(doc(db, 'users', profile.id));
              const userData = userSnapshot.data() ?? {};
              return {
                ...profile,
                displayName: userData.displayName ?? userData.name ?? userData.email ?? profile.id,
                email: userData.email ?? undefined,
              };
            } catch (innerError) {
              console.warn('Failed to fetch therapist user profile', innerError);
              return { ...profile };
            }
          })
        );
        setTherapistDetails(entries);
      } catch (innerError) {
        console.error('Failed to hydrate therapist directory', innerError);
        setTherapistDetails(profiles);
      }
    };

    if (!user) {
      setTherapistDetails([]);
      return;
    }

    if (verifiedTherapists.length > 0) {
      void hydrate(verifiedTherapists);
      return;
    }

    const loadFallback = async () => {
      try {
        const db = getFirestore(getFirebaseApp());
        const snapshot = await getDocs(
          query(
            collection(db, 'therapistProfiles'),
            where('status', '==', 'VERIFIED'),
            where('visible', '==', true)
          )
        );
        const fallback = snapshot.docs.map((docSnapshot) => docSnapshot.data() as TherapistProfile);
        await hydrate(fallback);
      } catch (innerError) {
        console.error('Failed to load fallback therapists', innerError);
      }
    };

    void loadFallback();
  }, [verifiedTherapists, user]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Support & Resources</h1>
            <p className="text-sm text-gray-600">
              Connect with caring professionals and on-campus services ready to help.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          These contacts are provided by your counseling center. Reach out to schedule an appointment,
          ask a question, or learn about available support options.
        </p>
      </section>

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((contact, index) => (
            <article
              key={`${contact.name}-${index}`}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 space-y-4"
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
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Verified Lumora therapists</h2>
              <p className="text-sm text-slate-600">
                Browse licensed clinicians who are approved to support Lumora members. Send a request to connect directly.
              </p>
            </div>
            <Link
              href="/resources/therapists"
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-900"
            >
              View directory
            </Link>
          </header>

          {therapistError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              We couldn&apos;t load therapist profiles right now. Please try again soon.
            </div>
          ) : null}

          {therapistsLoading && therapistDetails.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-32 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 animate-pulse" />
              ))}
            </div>
          ) : therapistDetails.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No verified therapists are available yet. Check back soon as our network grows.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {therapistDetails.map((therapist) => (
                <article key={therapist.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{therapist.displayName ?? 'Lumora therapist'}</h3>
                      {therapist.email && (
                        <p className="text-xs text-slate-500">{therapist.email}</p>
                      )}
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
                  <Link
                    href="/resources/therapists"
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-900"
                  >
                    Request to connect
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              ))}
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
    </div>
  );
}
