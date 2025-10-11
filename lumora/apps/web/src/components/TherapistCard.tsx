'use client';

import type { ReactNode } from 'react';
import type { TherapistProfile } from '@/types/domain';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface TherapistCardProps {
  profile: TherapistProfile;
  name?: string;
  photoUrl?: string;
  connectionStatus?: ReactNode;
  actions?: ReactNode;
}

export function TherapistCard({ profile, name, photoUrl, connectionStatus, actions }: TherapistCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-indigo-100">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={name ?? 'Therapist'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-indigo-600">
                  {(name ?? 'T')[0]?.toUpperCase() ?? 'T'}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{name ?? 'Therapist'}</h3>
              <p className="text-sm text-slate-600">{profile.credentials?.join(', ') || 'Licensed therapist'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Specialties: {profile.specialties?.join(', ') || 'General practice'}</p>
          <p className="text-sm text-slate-500">Languages: {profile.languages?.join(', ') || 'English'}</p>
        </div>
        {connectionStatus}
      </header>
      <p className="text-sm leading-relaxed text-slate-700 line-clamp-4">{profile.bio || 'No bio provided yet.'}</p>
      {profile.availability?.length ? (
        <p className="text-xs text-slate-500">
          Next available:{' '}
          {(() => {
            const slot = profile.availability[0];
            const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day] ?? 'Day';
            return `${day} ${slot.start}–${slot.end}`;
          })()}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-700">
        {profile.credentials?.map((credential) => (
          <span key={credential} className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 font-medium">
            {credential}
          </span>
        ))}
        {profile.modality?.telehealth && <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">Telehealth</span>}
        {profile.modality?.inPerson && <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">In-person</span>}
      </div>
      <footer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ConnectionStatusBadge status={profile.status} visible={profile.visible} />
        {actions}
      </footer>
    </article>
  );
}
