"use client";

import useSWR from 'swr';
import { Phone, Mail, MapPin, Clock, ExternalLink, HeartHandshake, ArrowRight } from 'lucide-react';

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

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function Resources({ onNavigateToCrisis }: ResourcesProps) {
  const { data, isLoading, error } = useSWR<{ contacts: Contact[] }>(
    '/api/resources',
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const contacts = data?.contacts ?? [];

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

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          We could not load the resource list right now. Please try again in a few minutes.
        </div>
      )}

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

          {contacts.length === 0 && (
            <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-500">
              No counseling contacts are available yet. Check back soon or reach out to your
              counseling center directly.
            </div>
          )}
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
