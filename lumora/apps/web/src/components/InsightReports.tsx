'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, FileText, CalendarClock, TrendingUp } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import { useAuth } from '@/contexts/AuthContext';
import { createCheckoutSessionUrl, getBillingErrorMessage } from '@/lib/billingClient';

type InsightPlan = 'free' | 'pro';
type WeeklySlotStatus = 'past' | 'previous' | 'active' | 'future';

interface InsightReportSummary {
  id: string;
  periodType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  markdownPreview: string;
  markdown?: string;
  compareToReportId: string | null;
  metrics: {
    emotionalVolatilityScore: number;
    emotionalGrowthScore: number;
    forecastConfidence: number;
  };
}

interface WeeklySlot {
  weekStart: string;
  weekEnd: string;
  label: string;
  status: WeeklySlotStatus;
  canGenerate: boolean;
  hasReport: boolean;
  reportId: string | null;
  journalDaysTracked: number;
  moodDaysTracked: number;
  insufficientData: boolean;
  message: string | null;
}

interface InsightReportsResponse {
  plan: InsightPlan;
  nextGeneration: string;
  upgradeMessage: string | null;
  insufficientDataMessage: string | null;
  latestReport: InsightReportSummary | null;
  history: InsightReportSummary[];
  reportList: InsightReportSummary[];
  weeklyGeneration?: {
    monthLabel: string;
    weeks: WeeklySlot[];
  };
}

interface InsightReportsProps {
  mode: 'dashboard' | 'full';
}

interface ReportMonthGroup {
  key: string;
  monthLabel: string;
  reports: InsightReportSummary[];
}

function formatPeriodLabel(report: InsightReportSummary): string {
  const start = new Date(report.periodStart);
  const end = new Date(report.periodEnd);
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getWeekStatusLabel(status: WeeklySlotStatus): string {
  switch (status) {
    case 'previous':
      return 'Previous week';
    case 'active':
      return 'Current week';
    case 'future':
      return 'Future week';
    default:
      return 'Past week';
  }
}

function getGenerateButtonLabel(slot: WeeklySlot, generating: boolean): string {
  if (generating) {
    return 'Generating...';
  }
  if (slot.hasReport) {
    return 'Generated';
  }
  if (slot.status === 'active') {
    return 'Current week';
  }
  if (slot.status === 'future') {
    return 'Future week';
  }
  if (slot.status === 'past') {
    return 'Locked';
  }
  return 'Generate report';
}

export function InsightReports({ mode }: InsightReportsProps) {
  const headers = useApiHeaders();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [data, setData] = useState<InsightReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [generatingWeekStart, setGeneratingWeekStart] = useState<string | null>(null);
  const [generateNotice, setGenerateNotice] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!headers['x-user-id']) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const includeMarkdown = mode === 'full' ? '1' : '0';
      const limit = mode === 'full' ? '200' : '16';
      const response = await fetch(`/api/insights/reports?includeMarkdown=${includeMarkdown}&limit=${limit}`, {
        headers,
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('insights_fetch_failed');
      }
      const payload = (await response.json()) as InsightReportsResponse;
      setData(payload);
    } catch (fetchError) {
      console.error('Failed to load insight reports', fetchError);
      setError('We could not load your insight reports right now.');
    } finally {
      setLoading(false);
    }
  }, [headers, mode]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleUpgradeToPro = useCallback(async () => {
    if (upgradeLoading) {
      return;
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/billing/upgrade')}`);
      return;
    }

    setUpgradeLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const checkoutUrl = await createCheckoutSessionUrl({
        idToken: token,
        returnPath: pathname || '/user/reports',
      });
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      console.error('Failed to start checkout from insights', checkoutError);
      const errorCode = checkoutError instanceof Error ? checkoutError.message : 'billing_session_failed';
      setError(getBillingErrorMessage(errorCode));
      setUpgradeLoading(false);
    }
  }, [pathname, router, upgradeLoading, user]);

  const handleGenerateWeeklyReport = useCallback(
    async (weekStart: string) => {
      if (generatingWeekStart) {
        return;
      }

      setGeneratingWeekStart(weekStart);
      setGenerateNotice(null);
      setError(null);

      try {
        const response = await fetch('/api/insights/reports', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            periodStart: weekStart,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };

        if (!response.ok) {
          if (payload.code === 'INSUFFICIENT_DATA') {
            setGenerateNotice(payload.message ?? 'Insufficient data. please journal and moodtrack regularly.');
          } else if (payload.code === 'WEEK_LOCKED') {
            setGenerateNotice('Only the previous completed week can be generated.');
          } else {
            setError(payload.message ?? 'Could not generate report right now.');
          }
          return;
        }

        if (payload.code === 'REPORT_EXISTS') {
          setGenerateNotice('Report already exists for the previous week.');
        } else {
          setGenerateNotice('Report generated successfully.');
        }

        await loadReports();
      } catch (generateError) {
        console.error('Failed to generate report', generateError);
        setError('Could not generate report right now.');
      } finally {
        setGeneratingWeekStart(null);
      }
    },
    [generatingWeekStart, headers, loadReports]
  );

  const historyList = useMemo(() => {
    if (!data) {
      return [];
    }
    return mode === 'dashboard' ? data.history.slice(0, 6) : data.reportList.slice(1);
  }, [data, mode]);

  const groupedReports = useMemo<ReportMonthGroup[]>(() => {
    if (!data || mode !== 'full') {
      return [];
    }

    const buckets = new Map<string, { monthLabel: string; monthStart: number; reports: InsightReportSummary[] }>();

    for (const report of data.reportList) {
      const start = new Date(report.periodStart);
      if (Number.isNaN(start.getTime())) {
        continue;
      }
      const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
      const monthLabel = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const existing = buckets.get(key) ?? {
        monthLabel,
        monthStart,
        reports: [],
      };
      existing.reports.push(report);
      buckets.set(key, existing);
    }

    return Array.from(buckets.entries())
      .sort((a, b) => b[1].monthStart - a[1].monthStart)
      .map(([key, value]) => ({
        key,
        monthLabel: value.monthLabel,
        reports: value.reports.sort(
          (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
        ),
      }));
  }, [data, mode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading insight reports...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-600">No report data available.</p>;
  }

  if (mode === 'dashboard') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
            <p className="text-xs text-slate-500">{data.nextGeneration}</p>
          </div>
        </div>

        {data.insufficientDataMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {data.insufficientDataMessage}
          </div>
        ) : null}

        {data.latestReport ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 capitalize">{data.latestReport.periodType} report</p>
              <span className="text-[11px] text-slate-500">{formatCreatedAt(data.latestReport.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-500">{formatPeriodLabel(data.latestReport)}</p>
            <p className="text-sm text-slate-700">{data.latestReport.markdownPreview}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No generated reports yet.</p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
          {historyList.length === 0 ? (
            <p className="text-sm text-slate-600">Your previous reports will appear here.</p>
          ) : (
            <ul className="space-y-2">
              {historyList.map((report) => (
                <li key={report.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm font-medium text-slate-800 capitalize">{report.periodType} report</p>
                  <p className="text-xs text-slate-500">{formatPeriodLabel(report)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/user/reports"
            className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            View all reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Your Reports</h2>
            <p className="text-sm text-slate-600">{data.nextGeneration}</p>
          </div>
        </div>

        {data.insufficientDataMessage ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {data.insufficientDataMessage}
          </p>
        ) : null}

        {generateNotice ? (
          <p className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            {generateNotice}
          </p>
        ) : null}
      </div>

      {data.weeklyGeneration ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Weeks in {data.weeklyGeneration.monthLabel}</h3>
            <p className="text-sm text-slate-600">
              Generate report is enabled only for the previous completed week.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.weeklyGeneration.weeks.map((slot) => {
              const generating = generatingWeekStart === slot.weekStart;
              const disabled = !slot.canGenerate || generating;

              return (
                <div key={slot.weekStart} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {getWeekStatusLabel(slot.status)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Tracked days: Journal {slot.journalDaysTracked} • Mood {slot.moodDaysTracked}
                  </p>

                  {slot.insufficientData ? (
                    <p className="text-xs text-amber-700">{slot.message}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void handleGenerateWeeklyReport(slot.weekStart)}
                    className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {getGenerateButtonLabel(slot, generating)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {groupedReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          No reports yet. Generate the previous week report once enough data is available.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedReports.map((group) => (
            <section key={group.key} className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">{group.monthLabel}</h3>
              <div className="grid gap-4">
                {group.reports.map((report, index) => (
                  <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {report.periodType} report {group.key === groupedReports[0]?.key && index === 0 ? '• Latest' : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatPeriodLabel(report)} · Generated {formatCreatedAt(report.createdAt)}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Growth {report.metrics.emotionalGrowthScore}/100
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        Volatility: <span className="font-semibold">{report.metrics.emotionalVolatilityScore}/100</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        Growth: <span className="font-semibold">{report.metrics.emotionalGrowthScore}/100</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        Forecast confidence: <span className="font-semibold">{report.metrics.forecastConfidence}/100</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {report.markdown && report.markdown.trim().length > 0 ? report.markdown : report.markdownPreview}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
