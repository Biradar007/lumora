'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Calendar, Award, BarChart3, Heart, BookOpen, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import { listSessions, type SessionRecord } from '@/lib/chatStore';
import type { MoodEntry, JournalEntry } from '@/types/domain';

const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
const moodColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
const moodTextColors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-blue-600', 'text-green-600'];

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shortDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function parseEntryDate(entry: MoodEntry): Date {
  if (typeof entry.entryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate)) {
    const [year, month, day] = entry.entryDate.split('-').map((part) => Number.parseInt(part, 10));
    return new Date(year, month - 1, day);
  }
  return new Date(entry.createdAt);
}

function formatRelative(date?: Date) {
  if (!date) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function excerpt(content: string, max = 140): string {
  const clean = content.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function Dashboard() {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUser = Boolean(uid);

  useEffect(() => {
    let cancelled = false;
    if (!hasUser) {
      setMoodEntries([]);
      setJournalEntries([]);
      setError('Log in to see your personalized dashboard.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [moodRes, journalRes] = await Promise.all([
          fetch('/api/moods', { headers, cache: 'no-store' }),
          fetch('/api/journals', { headers, cache: 'no-store' }),
        ]);

        if (moodRes.status === 401 || journalRes.status === 401) {
          if (!cancelled) {
            setMoodEntries([]);
            setJournalEntries([]);
            setError('Log in to see your personalized dashboard.');
          }
          return;
        }

        if (moodRes.status === 403 || journalRes.status === 403) {
          if (!cancelled) {
            setMoodEntries([]);
            setJournalEntries([]);
            setError('Your account cannot access these insights yet.');
          }
          return;
        }

        if (!moodRes.ok) {
          const detail = await moodRes.text().catch(() => '');
          console.warn('Failed to load moods', { status: moodRes.status, detail });
          throw new Error('moods_fetch_failed');
        }
        if (!journalRes.ok) {
          const detail = await journalRes.text().catch(() => '');
          console.warn('Failed to load journals', { status: journalRes.status, detail });
          throw new Error('journals_fetch_failed');
        }

        const moodData = (await moodRes.json()) as { entries: MoodEntry[] };
        const journalData = (await journalRes.json()) as { entries: JournalEntry[] };

        if (!cancelled) {
          setMoodEntries((moodData.entries ?? []).sort((a, b) => b.createdAt - a.createdAt));
          setJournalEntries((journalData.entries ?? []).sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Dashboard data load failed', err);
          setError('We could not load your insights right now. Please try again.');
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

  useEffect(() => {
    if (!uid) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    const unsubscribe = listSessions(
      uid,
      {
        limit: 20,
        onError: () => setSessionsLoading(false),
      },
      (records) => {
        setSessions(records);
        setSessionsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      setSessions([]);
    };
  }, [uid]);

  const weeklyMoods = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const buckets = new Map<string, { moods: number[]; activities: number }>();

    moodEntries.forEach((entry) => {
      const key = entry.entryDate || formatDateKey(new Date(entry.createdAt));
      const existing = buckets.get(key) ?? { moods: [], activities: 0 };
      existing.moods.push(entry.mood);
      existing.activities += Array.isArray(entry.activities) ? entry.activities.length : 0;
      buckets.set(key, existing);
    });

    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - i);
      const key = formatDateKey(date);
      const bucket = buckets.get(key);
      const averageMood = bucket ? bucket.moods.reduce((sum, value) => sum + value, 0) / bucket.moods.length : null;
      days.push({
        label: shortDayLabel(date),
        dateKey: key,
        averageMood,
        count: bucket?.moods.length ?? 0,
        activityCount: bucket?.activities ?? 0,
      });
    }
    return days;
  }, [moodEntries]);

  const moodsThisWeek = useMemo(() => weeklyMoods.reduce((sum, day) => sum + day.count, 0), [weeklyMoods]);
  const maxWeeklyActivities = useMemo(
    () => weeklyMoods.reduce((max, day) => Math.max(max, day.activityCount), 0),
    [weeklyMoods]
  );

  const last7DayMoodAverage = useMemo(() => {
    if (!weeklyMoods.length) return null;
    const counts = weeklyMoods.reduce(
      (acc, day) => {
        if (day.count === 0) return acc;
        return {
          sum: acc.sum + (day.averageMood ?? 0) * day.count,
          count: acc.count + day.count,
        };
      },
      { sum: 0, count: 0 }
    );
    if (counts.count === 0) return null;
    return counts.sum / counts.count;
  }, [weeklyMoods]);

  const moodStreak = useMemo(() => {
    if (!moodEntries.length) return 0;
    const dates = new Set(
      moodEntries.map((entry) => {
        const parsed = parseEntryDate(entry);
        return formatDateKey(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
      })
    );
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i += 1) {
      const key = formatDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      if (dates.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [moodEntries]);

  const topActivities = useMemo(() => {
    const counts = new Map<string, number>();
    moodEntries.forEach((entry) => {
      entry.activities.forEach((activity) => {
        counts.set(activity, (counts.get(activity) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [moodEntries]);

  const achievements = useMemo(
    () => [
      {
        title: '7-day streak',
        description: 'Logged your mood for a full week.',
        earned: moodStreak >= 7,
      },
      {
        title: 'Consistent check-ins',
        description: 'Recorded 4+ moods this week.',
        earned: moodsThisWeek >= 4,
      },
      {
        title: 'Reflective writer',
        description: 'Saved 5 journal entries.',
        earned: journalEntries.length >= 5,
      },
      {
        title: 'Chat explorer',
        description: 'Started 3 AI conversations.',
        earned: sessions.length >= 3,
      },
    ],
    [journalEntries.length, moodStreak, moodsThisWeek, sessions.length]
  );

  const recentJournals = useMemo(() => journalEntries.slice(0, 2), [journalEntries]);
  const latestMood = moodEntries[0] ?? null;
  const latestSession = sessions[0] ?? null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">Your live mental health journey</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Track real check-ins, journals, and AI chats to see how you&apos;re progressing.
              </p>
            </div>
            {loading && <Loader2 className="h-5 w-5 text-slate-400 animate-spin" aria-label="Loading dashboard" />}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average mood (7 days)</p>
              <p className="text-2xl font-bold text-gray-800">
                {last7DayMoodAverage !== null ? (last7DayMoodAverage + 1).toFixed(1) : '—'}/5
              </p>
            </div>
          </div>
          {last7DayMoodAverage !== null && (
            <p className={`text-sm font-medium ${moodTextColors[Math.round(last7DayMoodAverage)]}`}>
              {moodLabels[Math.round(last7DayMoodAverage)]}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Mood streak</p>
              <p className="text-2xl font-bold text-gray-800">{moodStreak} days</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Latest entry: {latestMood ? formatRelative(new Date(latestMood.createdAt)) : '—'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Journal entries</p>
              <p className="text-2xl font-bold text-gray-800">{journalEntries.length || '0'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {recentJournals[0] ? `Last: ${formatRelative(new Date(recentJournals[0].createdAt))}` : 'No reflections yet'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">AI chat sessions</p>
              <p className="text-2xl font-bold text-gray-800">{sessions.length || '0'}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {sessionsLoading ? 'Syncing chats…' : latestSession ? `Last active ${formatRelative(latestSession.updatedAt)}` : 'Start a conversation'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">This week&apos;s mood</h2>
              <p className="text-sm text-gray-600">Entries this week: {moodsThisWeek}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading your mood history…</span>
            </div>
          ) : weeklyMoods.every((day) => day.count === 0) ? (
            <p className="text-gray-600">Track your feelings to see a live chart of your week.</p>
          ) : (
            <div className="space-y-5">
              {weeklyMoods.map((day) => (
                <div key={day.dateKey} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center justify-between w-full sm:w-16">
                    <div className="text-sm font-medium text-gray-600">{day.label}</div>
                    <div className="text-sm font-semibold text-gray-700 sm:hidden">
                      {day.averageMood !== null ? `${(day.averageMood + 1).toFixed(1)}/5` : '—'}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full ${day.averageMood !== null ? moodColors[Math.round(day.averageMood)] : 'bg-gray-300'} transition-all duration-500`}
                        style={{ width: `${day.averageMood !== null ? ((day.averageMood + 1) / 5) * 100 : 6}%` }}
                      />
                    </div>
                    <div className="hidden sm:block text-sm font-medium text-gray-700 w-12">
                      {day.averageMood !== null ? `${(day.averageMood + 1).toFixed(1)}/5` : '—'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: Math.max(maxWeeklyActivities, 1) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < day.activityCount ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{day.activityCount} activities</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Activity spotlight</h2>
          </div>
          {topActivities.length === 0 ? (
            <p className="text-gray-600">Add activities to mood check-ins to see what helps most.</p>
          ) : (
            <div className="space-y-3">
              {topActivities.map(([activity, count]) => (
                <div key={activity} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="font-semibold text-amber-800">{activity}</p>
                    <p className="text-xs text-amber-700">Linked to your moods</p>
                  </div>
                  <div className="text-sm font-bold text-amber-900">{count}×</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Recent journals</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading journal entries…</span>
            </div>
          ) : recentJournals.length === 0 ? (
            <p className="text-gray-600">Your reflections will appear here after you start journaling.</p>
          ) : (
            <div className="space-y-3">
              {recentJournals.map((entry) => (
                <div key={entry.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{new Date(entry.createdAt).toLocaleString([], { month: 'short', day: 'numeric' })}</span>
                    <span>{formatRelative(new Date(entry.createdAt))}</span>
                  </div>
                  <p className="text-sm text-gray-800">{excerpt(entry.content)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">AI conversations</h2>
          </div>
          {sessionsLoading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Syncing chat sessions…</span>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-gray-600">Start a chat with Lumora to see your conversations here.</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 3).map((session) => (
                <div key={session.id} className="p-3 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-blue-50">
                  <p className="font-semibold text-gray-800">{session.title || 'New conversation'}</p>
                  <p className="text-xs text-gray-600">
                    Updated {formatRelative(session.updatedAt)} · {session.lastMessagePreview || 'Jump back in anytime'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <Award className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Achievements</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.title}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                achievement.earned
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    achievement.earned
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  🏆
                </div>
                <div>
                  <h3 className={`font-semibold ${achievement.earned ? 'text-orange-800' : 'text-gray-600'}`}>
                    {achievement.title}
                  </h3>
                  <p className={`text-sm ${achievement.earned ? 'text-orange-600' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
