'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, CalendarClock, TrendingUp } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';

type InsightPlan = 'free' | 'pro';

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

interface InsightReportsResponse {
  plan: InsightPlan;
  frequency: string;
  nextGeneration: string;
  upgradeMessage: string | null;
  insufficientDataMessage: string | null;
  latestReport: InsightReportSummary | null;
  history: InsightReportSummary[];
  reportList: InsightReportSummary[];
}

interface InsightReportsProps {
  mode: 'dashboard' | 'full';
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

export function InsightReports({ mode }: InsightReportsProps) {
  const headers = useApiHeaders();
  const [data, setData] = useState<InsightReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!headers['x-user-id']) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const includeMarkdown = mode === 'full' ? '1' : '0';
        const limit = mode === 'full' ? '36' : '16';
        const response = await fetch(`/api/insights/reports?includeMarkdown=${includeMarkdown}&limit=${limit}`, {
          headers,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('insights_fetch_failed');
        }
        const payload = (await response.json()) as InsightReportsResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch (fetchError) {
        console.error('Failed to load insight reports', fetchError);
        if (!cancelled) {
          setError('We could not load your insight reports right now.');
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
  }, [headers, mode]);

  const historyList = useMemo(() => {
    if (!data) {
      return [];
    }
    return mode === 'dashboard' ? data.history : data.reportList.slice(1);
  }, [data, mode]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading insight reports…</span>
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
            <p className="text-xs font-medium text-slate-600">{data.frequency}</p>
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
          {data.plan === 'free' ? (
            <Link
              href="/#pricing"
              className="inline-flex items-center rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Upgrade to Pro
            </Link>
          ) : null}
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
            <p className="text-sm font-medium text-slate-700">{data.frequency}</p>
          </div>
        </div>
        {data.plan === 'free' ? (
          <p className="mt-3 text-sm text-indigo-700">
            {data.upgradeMessage}{' '}
            <Link href="/#pricing" className="font-semibold underline">
              View plans
            </Link>
          </p>
        ) : null}
        {data.insufficientDataMessage ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {data.insufficientDataMessage}
          </p>
        ) : null}
      </div>

      {data.reportList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          No reports yet. Keep journaling and tracking mood to unlock deeper insights.
        </div>
      ) : (
        <div className="grid gap-4">
          {data.reportList.map((report, index) => (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {report.periodType} report {index === 0 ? '• Latest' : ''}
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
      )}
    </div>
  );
}

