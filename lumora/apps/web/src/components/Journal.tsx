'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, PenLine } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { JournalEntry } from '@/types/domain';

interface JournalErrorState {
  fetch?: string;
  submit?: string;
}

export function Journal() {
  const headers = useApiHeaders();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<JournalErrorState>({});

  const hasUser = useMemo(() => Boolean(headers['x-user-id']), [headers]);

  useEffect(() => {
    if (!hasUser) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/journals', { headers, cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load journal entries.');
        }
        const data = (await response.json()) as { entries: JournalEntry[] };
        setEntries((data.entries ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setErrors((prev) => ({ ...prev, fetch: undefined }));
      } catch (error) {
        console.error(error);
        setErrors((prev) => ({
          ...prev,
          fetch: 'We could not load your journal right now. Please try again shortly.',
        }));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [headers, hasUser]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Write a few thoughts before saving.',
      }));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: trimmed }),
      });
      if (!response.ok) {
        throw new Error('Failed to save journal entry.');
      }
      const data = (await response.json()) as { entry: JournalEntry };
      setEntries((prev) => [data.entry, ...prev]);
      setContent('');
      setErrors((prev) => ({ ...prev, submit: undefined }));
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        submit: 'We could not save this entry. Please try again.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasUser) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Log in to start journaling with Lumora.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-50 p-2">
            <PenLine className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Daily Journal</h1>
            <p className="text-sm text-slate-600">
              Capture how you&apos;re feeling, reflect on your day, and build a mindful habit.
            </p>
          </div>
        </div>
      </div>

      <form
        className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <label htmlFor="journal-entry" className="text-sm font-medium text-slate-700">
            What&apos;s on your mind?
          </label>
          <textarea
            id="journal-entry"
            name="journal-entry"
            className="w-full min-h-[160px] resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Write freely. Only you can see your journal."
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (errors.submit) {
                setErrors((prev) => ({ ...prev, submit: undefined }));
              }
            }}
            disabled={submitting}
          />
          {errors.submit && <p className="text-xs font-medium text-rose-600">{errors.submit}</p>}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save entry
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your entries</h2>
        {errors.fetch ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errors.fetch}
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading your journal…
          </div>
        ) : null}
        {!loading && entries.length === 0 && !errors.fetch ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No entries yet. Your reflections will appear here once you start journaling.
          </div>
        ) : null}
        <div className="space-y-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{entry.content}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
