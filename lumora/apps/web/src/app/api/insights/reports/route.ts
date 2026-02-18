import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import { getWeeklyInsightPeriod, toDate, type InsightPeriodType } from '@/lib/insightReports';

type Plan = 'free' | 'pro';

type UserDoc = {
  plan?: Plan;
};

type InsightReportData = {
  periodType?: InsightPeriodType;
  periodStart?: unknown;
  periodEnd?: unknown;
  createdAt?: unknown;
  content?: {
    markdown?: unknown;
    json?: unknown;
  };
  metrics?: {
    emotionalVolatilityScore?: unknown;
    emotionalGrowthScore?: unknown;
    forecastConfidence?: unknown;
  };
  compareToReportId?: unknown;
};

type ReportSummary = {
  id: string;
  periodType: InsightPeriodType;
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
};

function resolvePlan(value: unknown): Plan {
  return value === 'pro' ? 'pro' : 'free';
}

function toIso(value: unknown): string {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : new Date(0).toISOString();
}

function toScore(value: unknown): number {
  const numeric =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function toPreview(markdown: string): string {
  const normalized = markdown.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No report content available yet.';
  }
  return normalized.length > 240 ? `${normalized.slice(0, 239)}…` : normalized;
}

function mapReportSnapshot(
  reportId: string,
  data: InsightReportData,
  includeMarkdown: boolean
): ReportSummary | null {
  const periodType = data.periodType;
  if (periodType !== 'weekly' && periodType !== 'monthly') {
    return null;
  }
  const markdown =
    data.content && typeof data.content.markdown === 'string' ? data.content.markdown : '';
  return {
    id: reportId,
    periodType,
    periodStart: toIso(data.periodStart),
    periodEnd: toIso(data.periodEnd),
    createdAt: toIso(data.createdAt),
    markdownPreview: toPreview(markdown),
    markdown: includeMarkdown ? markdown : undefined,
    compareToReportId:
      typeof data.compareToReportId === 'string' && data.compareToReportId.trim().length > 0
        ? data.compareToReportId
        : null,
    metrics: {
      emotionalVolatilityScore: toScore(data.metrics?.emotionalVolatilityScore),
      emotionalGrowthScore: toScore(data.metrics?.emotionalGrowthScore),
      forecastConfidence: toScore(data.metrics?.forecastConfidence),
    },
  };
}

async function hasSufficientWeeklyData(uid: string): Promise<boolean> {
  const db = getServerFirestore();
  const period = getWeeklyInsightPeriod(new Date());
  const startMs = period.periodStart.getTime();
  const endMs = period.periodEnd.getTime();

  const [journalSnapshot, moodSnapshot] = await Promise.all([
    db.collection('journals').where('userId', '==', uid).get(),
    db.collection('moodEntries').where('userId', '==', uid).get(),
  ]);

  const journalCount = journalSnapshot.docs.filter((docSnapshot) => {
    const createdAt = toDate((docSnapshot.data() as { createdAt?: unknown }).createdAt);
    return createdAt && createdAt.getTime() >= startMs && createdAt.getTime() < endMs;
  }).length;

  const moodCount = moodSnapshot.docs.filter((docSnapshot) => {
    const createdAt = toDate((docSnapshot.data() as { createdAt?: unknown }).createdAt);
    return createdAt && createdAt.getTime() >= startMs && createdAt.getTime() < endMs;
  }).length;

  return journalCount > 0 && moodCount > 0;
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const url = new URL(request.url);
    const includeMarkdown = url.searchParams.get('includeMarkdown') === '1';
    const requestedLimitRaw = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const requestedLimit =
      Number.isFinite(requestedLimitRaw) && requestedLimitRaw > 0
        ? Math.min(requestedLimitRaw, 50)
        : 24;

    const userSnapshot = await db.collection('users').doc(auth.userId).get();
    const userData = (userSnapshot.data() ?? {}) as UserDoc;
    const plan = resolvePlan(userData.plan);
    const expectedPeriodType: InsightPeriodType = plan === 'pro' ? 'weekly' : 'monthly';
    const historyLimit = plan === 'pro' ? 8 : 3;

    const reportsSnapshot = await db
      .collection('insights')
      .doc(auth.userId)
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(requestedLimit)
      .get();

    const reports = reportsSnapshot.docs
      .map((docSnapshot) =>
        mapReportSnapshot(docSnapshot.id, docSnapshot.data() as InsightReportData, includeMarkdown)
      )
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter((entry) => entry.periodType === expectedPeriodType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const latestReport = reports[0] ?? null;
    const history = reports.slice(1, historyLimit + 1);
    const reportList = reports.slice(0, Math.max(historyLimit + 1, 20));

    let insufficientDataMessage: string | null = null;
    if (plan === 'pro') {
      const weeklyPeriod = getWeeklyInsightPeriod(new Date());
      const hasCurrentWeeklyReport =
        latestReport && new Date(latestReport.periodStart).getTime() >= weeklyPeriod.periodStart.getTime();
      if (!hasCurrentWeeklyReport) {
        const sufficient = await hasSufficientWeeklyData(auth.userId);
        if (!sufficient) {
          insufficientDataMessage =
            'Insufficient data. Please journal and mood track daily to get proper report.';
        }
      }
    }

    return NextResponse.json({
      plan,
      frequency: plan === 'pro' ? 'Weekly report (1/week)' : 'Monthly report (1/month)',
      nextGeneration: 'Next report is generated automatically',
      upgradeMessage:
        plan === 'free' ? 'Upgrade to Pro to receive weekly reports.' : null,
      insufficientDataMessage,
      latestReport,
      history,
      reportList,
    });
  } catch (error) {
    return jsonError(error);
  }
}

