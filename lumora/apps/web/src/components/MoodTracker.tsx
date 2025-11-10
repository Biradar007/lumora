'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Smile, Loader2 } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { MoodEntry } from '@/types/domain';

const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
const moodColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];

const activities = [
  'Exercise',
  'Meditation',
  'Social Time',
  'Work',
  'Sleep',
  'Nature',
  'Reading',
  'Music',
];

interface MoodErrorState {
  fetch?: string;
  submit?: string;
}

interface MoodEntryView extends MoodEntry {
  displayDateLabel: string;
}

function getLocalTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function MoodTracker() {
  const headers = useApiHeaders();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<MoodErrorState>({});

  const hasUser = useMemo(() => Boolean(headers['x-user-id']), [headers]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const handleActivityToggle = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  useEffect(() => {
    let cancelled = false;
    if (!hasUser) {
      setMoodEntries([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/moods', { headers, cache: 'no-store' });
        if (!response.ok) {
          if (response.status === 401) {
            if (!cancelled) {
              setMoodEntries([]);
              setErrors((prev) => ({
                ...prev,
                fetch: 'Log in to track your mood and view past entries.',
              }));
            }
            return;
          }
          if (response.status === 403) {
            if (!cancelled) {
              setMoodEntries([]);
              setErrors((prev) => ({
                ...prev,
                fetch: 'Your account cannot access mood tracking at this time.',
              }));
            }
            return;
          }
          const responseText = await response.text().catch(() => '');
          console.warn('Failed to load mood entries', { status: response.status, responseText });
          if (!cancelled) {
            setErrors((prev) => ({
              ...prev,
              fetch: 'We could not load your mood history. Please try again shortly.',
            }));
          }
          return;
        }
        const data = (await response.json()) as { entries: MoodEntry[] };
        if (!cancelled) {
          setMoodEntries((data.entries ?? []).sort((a, b) => b.createdAt - a.createdAt));
          setErrors((prev) => ({ ...prev, fetch: undefined }));
        }
      } catch (error) {
        console.error('Unexpected error while loading mood entries', error);
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            fetch: 'We could not load your mood history. Please try again shortly.',
          }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [headers, hasUser]);

  const handleSubmit = async () => {
    if (selectedMood === null || submitting || !hasUser) {
      return;
    }
    const payload = {
      mood: selectedMood,
      note: note.trim(),
      activities: selectedActivities,
      entryDate: getLocalTodayDateString(),
    };
    setSubmitting(true);
    try {
      const response = await fetch('/api/moods', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setErrors((prev) => ({
            ...prev,
            submit: 'Please log in to save your mood.',
          }));
          return;
        }
        if (response.status === 403) {
          setErrors((prev) => ({
            ...prev,
            submit: 'Your account cannot save mood entries yet.',
          }));
          return;
        }
        const responseText = await response.text().catch(() => '');
        console.warn('Failed to save mood entry', { status: response.status, responseText });
        throw new Error('Failed to save mood entry.');
      }
      const data = (await response.json()) as { entry: MoodEntry };
      setMoodEntries((prev) => {
        const next = [data.entry, ...prev];
        return next.sort((a, b) => b.createdAt - a.createdAt);
      });
      setSelectedMood(null);
      setNote('');
      setSelectedActivities([]);
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

  const averageMood = useMemo(() => {
    if (moodEntries.length === 0) {
      return null;
    }
    const recentEntries = moodEntries.slice(0, 7);
    const total = recentEntries.reduce((sum, entry) => sum + entry.mood, 0);
    return total / recentEntries.length;
  }, [moodEntries]);

  const formattedEntries = useMemo<MoodEntryView[]>(() => {
    return moodEntries.map((entry) => {
      const createdAtDate = new Date(entry.createdAt);
      let displayDate = startOfLocalDay(createdAtDate);

      if (typeof entry.entryDate === 'string') {
        const parts = entry.entryDate.split('-').map((part) => Number.parseInt(part, 10));
        if (parts.length === 3 && parts.every((value) => Number.isFinite(value))) {
          const [year, month, day] = parts;
          const entryLocalDate = new Date(year, month - 1, day);
          if (!Number.isNaN(entryLocalDate.getTime())) {
            const entryLocalStart = startOfLocalDay(entryLocalDate);
            const createdLocalStart = startOfLocalDay(createdAtDate);
            const diffMs = Math.abs(entryLocalStart.getTime() - createdLocalStart.getTime());
            if (diffMs <= 12 * 60 * 60 * 1000) {
              displayDate = entryLocalStart;
            }
          }
        }
      }

      return {
        ...entry,
        displayDateLabel: dateFormatter.format(displayDate),
      };
    });
  }, [dateFormatter, moodEntries]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-4xl mx-auto space-y-6">
      {/* Today's Mood Entry */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
            <Smile className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">How are you feeling today?</h2>
        </div>

        {/* Mood Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select your mood:</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-md sm:justify-between">
            {moodEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => setSelectedMood(index)}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200
                  ${selectedMood === index 
                    ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' 
                    : 'hover:bg-gray-100 hover:scale-105'
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
          {selectedMood !== null && (
            <p className={`text-sm font-medium mt-2 ${moodColors[selectedMood]}`}>
              {moodLabels[selectedMood]}
            </p>
          )}
        </div>

        {/* Activities */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">What activities did you do today?</p>
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <button
                key={activity}
                onClick={() => handleActivityToggle(activity)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
                  ${selectedActivities.includes(activity)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a note (optional):
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What made your day special? Any thoughts or feelings you’d like to remember..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={selectedMood === null || submitting || !hasUser}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            Save Today’s Mood
          </button>
          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
          {!hasUser && <p className="text-sm text-gray-500">Log in to save your mood entries.</p>}
        </div>
      </div>

      {/* Mood History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Your Mood Journey</h2>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-gray-600">7-day average</p>
            {averageMood !== null ? (
              <p className={`text-2xl font-bold ${moodColors[Math.round(averageMood)]}`}>
                {moodEmojis[Math.round(averageMood)]} {moodLabels[Math.round(averageMood)]}
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-500">No entries yet</p>
            )}
          </div>
        </div>

        {errors.fetch && <p className="text-sm text-red-500 mb-4">{errors.fetch}</p>}

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading your mood history…</span>
          </div>
        ) : formattedEntries.length === 0 ? (
          <p className="text-gray-600">Track your feelings to see your mood journey appear here.</p>
        ) : (
          <div className="space-y-3">
            {formattedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between w-full sm:w-20 text-sm text-gray-600">
                  <span>{entry.displayDateLabel}</span>
                  <span className={`text-xs font-medium sm:hidden ${moodColors[entry.mood]}`}>
                    {moodLabels[entry.mood]}
                  </span>
                </div>
                <div className="text-2xl">{moodEmojis[entry.mood]}</div>
                <div className="flex-1 w-full">
                  <p className="font-medium text-gray-800">{entry.note || 'No note added.'}</p>
                  {entry.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.activities.map((activity) => (
                        <span key={activity} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {activity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`hidden sm:block text-sm font-medium ${moodColors[entry.mood]}`}>
                  {moodLabels[entry.mood]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
