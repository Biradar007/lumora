import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import {
  buildInsightReportId,
  generateInsightReport,
  getPreviousInsightPeriod,
  getWeeklyInsightPeriod,
  toDate,
  type InsightComparisonInput,
  type InsightPeriod,
  type InsightPeriodType,
  type InsightSourceInput,
} from '@/lib/insightReports';

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

type WeeklySlotStatus = 'past' | 'previous' | 'active' | 'future';

type WeeklySlot = {
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
};

type WeekTrackingSummary = {
  journalDaysTracked: number;
  moodDaysTracked: number;
  sufficient: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_TRACKED_DAYS = 3;
const INSUFFICIENT_DATA_MESSAGE = 'Insufficient data. please journal and moodtrack regularly.';

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
  const markdown = data.content && typeof data.content.markdown === 'string' ? data.content.markdown : '';
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

function getUtcDayKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - date.getUTCDay(), 0, 0, 0, 0)
  );
}

function getCurrentMonthWeeklyPeriods(now: Date): InsightPeriod[] {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  const periods: InsightPeriod[] = [];
  let cursor = getWeekStartUtc(monthStart);

  while (cursor.getTime() < monthEnd.getTime()) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    periods.push({
      periodType: 'weekly',
      periodStart: start,
      periodEnd: end,
    });
    cursor = end;
  }

  return periods;
}

function getSlotStatus(period: InsightPeriod, now: Date): WeeklySlotStatus {
  const previousWeek = getWeeklyInsightPeriod(now);
  const activeWeekStart = previousWeek.periodEnd;
  const startMs = period.periodStart.getTime();

  if (startMs === previousWeek.periodStart.getTime()) {
    return 'previous';
  }
  if (startMs === activeWeekStart.getTime()) {
    return 'active';
  }
  if (startMs > activeWeekStart.getTime()) {
    return 'future';
  }
  return 'past';
}

function formatWeekLabel(period: InsightPeriod): string {
  const startLabel = period.periodStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endPreview = new Date(period.periodEnd.getTime() - 1);
  const endLabel = endPreview.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
}

function resolveMarkdown(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
}

function getPreviousReportContext(reportId: string, snapshotData: InsightReportData): InsightComparisonInput {
  const contentJson = snapshotData.content?.json;
  const jsonValue = (contentJson && typeof contentJson === 'object' ? contentJson : {}) as Record<string, unknown>;
  const summaryObj =
    jsonValue.summary && typeof jsonValue.summary === 'object'
      ? (jsonValue.summary as Record<string, unknown>)
      : {};
  const scoresObj =
    jsonValue.scores && typeof jsonValue.scores === 'object'
      ? (jsonValue.scores as Record<string, unknown>)
      : {};
  const forecastObj =
    jsonValue.forecast && typeof jsonValue.forecast === 'object'
      ? (jsonValue.forecast as Record<string, unknown>)
      : {};

  return {
    reportId,
    summary: typeof summaryObj.emotionalTrend === 'string' ? summaryObj.emotionalTrend : undefined,
    keyThemes: Array.isArray(summaryObj.keyThemes)
      ? summaryObj.keyThemes
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0)
      : undefined,
    emotionalVolatility:
      typeof scoresObj.emotionalVolatility === 'number' ? scoresObj.emotionalVolatility : undefined,
    emotionalGrowth: typeof scoresObj.emotionalGrowth === 'number' ? scoresObj.emotionalGrowth : undefined,
    forecast: typeof forecastObj.forecast === 'string' ? forecastObj.forecast : undefined,
  };
}

function toTimestampMs(value: unknown): number | null {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }
  return parsed.getTime();
}

async function fetchSourceData(
  uid: string,
  period: InsightPeriod
): Promise<InsightSourceInput> {
  const db = getServerFirestore();
  const startMs = period.periodStart.getTime();
  const endMs = period.periodEnd.getTime();

  const [journalSnapshot, moodSnapshot, threadSnapshot] = await Promise.all([
    db.collection('journals').where('userId', '==', uid).get(),
    db.collection('moodEntries').where('userId', '==', uid).get(),
    db.collection('chats').doc(uid).collection('threads').orderBy('updatedAt', 'desc').limit(30).get().catch(() => null),
  ]);

  const journals = journalSnapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data() as { content?: unknown; createdAt?: unknown };
      const createdAtMs = toTimestampMs(data.createdAt);
      if (createdAtMs === null || createdAtMs < startMs || createdAtMs >= endMs) {
        return null;
      }
      return {
        id: docSnapshot.id,
        createdAt: createdAtMs,
        content: typeof data.content === 'string' ? data.content : '',
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);

  const moods = moodSnapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data() as {
        createdAt?: unknown;
        mood?: unknown;
        note?: unknown;
        activities?: unknown;
      };
      const createdAtMs = toTimestampMs(data.createdAt);
      if (createdAtMs === null || createdAtMs < startMs || createdAtMs >= endMs) {
        return null;
      }
      return {
        id: docSnapshot.id,
        createdAt: createdAtMs,
        mood: typeof data.mood === 'number' && Number.isFinite(data.mood) ? Math.round(data.mood) : 0,
        note: typeof data.note === 'string' ? data.note : undefined,
        activities: Array.isArray(data.activities)
          ? data.activities
              .map((activity) => (typeof activity === 'string' ? activity.trim() : ''))
              .filter((activity) => activity.length > 0)
          : [],
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 80);

  const threads = (threadSnapshot?.docs ?? [])
    .map((docSnapshot) => {
      const data = docSnapshot.data() as { rollingSummary?: unknown; updatedAt?: unknown };
      const updatedAtMs = toTimestampMs(data.updatedAt);
      if (updatedAtMs === null || updatedAtMs < startMs || updatedAtMs >= endMs) {
        return null;
      }
      return {
        threadId: docSnapshot.id,
        updatedAt: updatedAtMs,
        rollingSummary: typeof data.rollingSummary === 'string' ? data.rollingSummary : undefined,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, 10);

  return {
    journals,
    moods,
    threads,
  };
}

function summarizeTrackedDaysForSources(sources: InsightSourceInput): WeekTrackingSummary {
  const journalDays = new Set<string>();
  const moodDays = new Set<string>();

  for (const journal of sources.journals) {
    journalDays.add(getUtcDayKey(new Date(journal.createdAt)));
  }
  for (const mood of sources.moods) {
    moodDays.add(getUtcDayKey(new Date(mood.createdAt)));
  }

  const journalDaysTracked = journalDays.size;
  const moodDaysTracked = moodDays.size;

  return {
    journalDaysTracked,
    moodDaysTracked,
    sufficient: journalDaysTracked >= MIN_TRACKED_DAYS && moodDaysTracked >= MIN_TRACKED_DAYS,
  };
}

async function buildCurrentMonthWeeklySlots(params: {
  uid: string;
  reports: ReportSummary[];
  now: Date;
}): Promise<{ monthLabel: string; weeks: WeeklySlot[]; previousWeekInsufficient: boolean }> {
  const { uid, reports, now } = params;
  const periods = getCurrentMonthWeeklyPeriods(now);
  const reportMap = new Map(
    reports
      .filter((report) => report.periodType === 'weekly')
      .map((report) => [new Date(report.periodStart).toISOString(), report.id])
  );

  const rangeStart = periods[0]?.periodStart ?? getWeeklyInsightPeriod(now).periodStart;
  const rangeEnd = periods.length > 0 ? periods[periods.length - 1].periodEnd : getWeeklyInsightPeriod(now).periodEnd;

  const db = getServerFirestore();
  const [journalSnapshot, moodSnapshot] = await Promise.all([
    db.collection('journals').where('userId', '==', uid).get(),
    db.collection('moodEntries').where('userId', '==', uid).get(),
  ]);

  const journalDayMap = new Map<string, Set<string>>();
  const moodDayMap = new Map<string, Set<string>>();

  for (const docSnapshot of journalSnapshot.docs) {
    const createdAt = toDate((docSnapshot.data() as { createdAt?: unknown }).createdAt);
    if (!createdAt) {
      continue;
    }
    if (createdAt.getTime() < rangeStart.getTime() || createdAt.getTime() >= rangeEnd.getTime()) {
      continue;
    }
    const weekKey = getWeekStartUtc(createdAt).toISOString();
    const current = journalDayMap.get(weekKey) ?? new Set<string>();
    current.add(getUtcDayKey(createdAt));
    journalDayMap.set(weekKey, current);
  }

  for (const docSnapshot of moodSnapshot.docs) {
    const createdAt = toDate((docSnapshot.data() as { createdAt?: unknown }).createdAt);
    if (!createdAt) {
      continue;
    }
    if (createdAt.getTime() < rangeStart.getTime() || createdAt.getTime() >= rangeEnd.getTime()) {
      continue;
    }
    const weekKey = getWeekStartUtc(createdAt).toISOString();
    const current = moodDayMap.get(weekKey) ?? new Set<string>();
    current.add(getUtcDayKey(createdAt));
    moodDayMap.set(weekKey, current);
  }

  let previousWeekInsufficient = false;

  const weeks = periods.map((period) => {
    const weekKey = period.periodStart.toISOString();
    const status = getSlotStatus(period, now);
    const journalDaysTracked = journalDayMap.get(weekKey)?.size ?? 0;
    const moodDaysTracked = moodDayMap.get(weekKey)?.size ?? 0;
    const insufficientData = journalDaysTracked < MIN_TRACKED_DAYS || moodDaysTracked < MIN_TRACKED_DAYS;
    const hasReport = reportMap.has(weekKey);

    if (status === 'previous' && insufficientData) {
      previousWeekInsufficient = true;
    }

    return {
      weekStart: period.periodStart.toISOString(),
      weekEnd: period.periodEnd.toISOString(),
      label: formatWeekLabel(period),
      status,
      canGenerate: status === 'previous' && !hasReport,
      hasReport,
      reportId: reportMap.get(weekKey) ?? null,
      journalDaysTracked,
      moodDaysTracked,
      insufficientData,
      message: insufficientData ? INSUFFICIENT_DATA_MESSAGE : null,
    } satisfies WeeklySlot;
  });

  const monthLabel = now.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return {
    monthLabel,
    weeks,
    previousWeekInsufficient,
  };
}

function sortReports(reports: ReportSummary[]): ReportSummary[] {
  return reports.sort((a, b) => {
    const timeDiff = new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const now = new Date();
    const url = new URL(request.url);
    const includeMarkdown = url.searchParams.get('includeMarkdown') === '1';
    const requestedLimitRaw = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
    const requestedLimit =
      Number.isFinite(requestedLimitRaw) && requestedLimitRaw > 0
        ? Math.min(requestedLimitRaw, 200)
        : 120;

    const userSnapshot = await db.collection('users').doc(auth.userId).get();
    const userData = (userSnapshot.data() ?? {}) as UserDoc;
    const plan = resolvePlan(userData.plan);

    const reportsSnapshot = await db
      .collection('insights')
      .doc(auth.userId)
      .collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(requestedLimit)
      .get();

    const reports = sortReports(
      reportsSnapshot.docs
        .map((docSnapshot) =>
          mapReportSnapshot(docSnapshot.id, docSnapshot.data() as InsightReportData, includeMarkdown)
        )
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    );

    const latestReport = reports[0] ?? null;
    const history = reports.slice(1);

    const weeklyGeneration = await buildCurrentMonthWeeklySlots({
      uid: auth.userId,
      reports,
      now,
    });

    return NextResponse.json({
      plan,
      nextGeneration: 'Generate reports for the previous week.',
      upgradeMessage: plan === 'free' ? 'Upgrade to Pro to unlock premium benefits.' : null,
      insufficientDataMessage: weeklyGeneration.previousWeekInsufficient ? INSUFFICIENT_DATA_MESSAGE : null,
      latestReport,
      history,
      reportList: reports,
      weeklyGeneration,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const now = new Date();
    const payload = (await request.json().catch(() => ({}))) as { periodStart?: unknown };

    const targetPeriod = getWeeklyInsightPeriod(now);
    const requestedPeriodStart = toDate(payload.periodStart);

    if (
      requestedPeriodStart &&
      requestedPeriodStart.getTime() !== targetPeriod.periodStart.getTime()
    ) {
      return NextResponse.json(
        {
          code: 'WEEK_LOCKED',
          message: 'You can only generate a report for the previous completed week.',
          allowedWeekStart: targetPeriod.periodStart.toISOString(),
          allowedWeekEnd: targetPeriod.periodEnd.toISOString(),
        },
        { status: 400 }
      );
    }

    const db = getServerFirestore();
    const reportsRef = db.collection('insights').doc(auth.userId).collection('reports');
    const reportId = buildInsightReportId(targetPeriod.periodType, targetPeriod.periodStart);
    const reportRef = reportsRef.doc(reportId);

    const existingSnapshot = await reportRef.get();
    if (existingSnapshot.exists) {
      const mapped = mapReportSnapshot(
        reportId,
        existingSnapshot.data() as InsightReportData,
        true
      );
      return NextResponse.json({
        code: 'REPORT_EXISTS',
        report: mapped,
      });
    }

    const sources = await fetchSourceData(auth.userId, targetPeriod);
    const trackingSummary = summarizeTrackedDaysForSources(sources);

    if (!trackingSummary.sufficient) {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_DATA',
          message: INSUFFICIENT_DATA_MESSAGE,
          weekStart: targetPeriod.periodStart.toISOString(),
          weekEnd: targetPeriod.periodEnd.toISOString(),
          journalDaysTracked: trackingSummary.journalDaysTracked,
          moodDaysTracked: trackingSummary.moodDaysTracked,
        },
        { status: 400 }
      );
    }

    const previousPeriod = getPreviousInsightPeriod(targetPeriod);
    const previousReportId = buildInsightReportId(previousPeriod.periodType, previousPeriod.periodStart);
    const previousSnapshot = await reportsRef.doc(previousReportId).get();
    const previousReport = previousSnapshot.exists
      ? getPreviousReportContext(previousReportId, previousSnapshot.data() as InsightReportData)
      : null;

    const modelResult = await generateInsightReport({
      uid: auth.userId,
      period: targetPeriod,
      sources,
      previousReport,
    });

    const contentJson =
      modelResult.parseError || modelResult.rawModelOutput.trim().length === 0
        ? {
            ...modelResult.json,
            _meta: {
              parseError: modelResult.parseError ?? 'empty_model_output',
              rawModelOutput: modelResult.rawModelOutput.slice(0, 8000),
            },
          }
        : modelResult.json;

    const markdown = resolveMarkdown(
      modelResult.markdown,
      '# Weekly Insight Report\n\nNo markdown report was returned.'
    );

    const batch = db.batch();
    batch.set(reportRef, {
      periodType: targetPeriod.periodType,
      periodStart: targetPeriod.periodStart,
      periodEnd: targetPeriod.periodEnd,
      createdAt: now,
      content: {
        json: contentJson,
        markdown,
      },
      metrics: {
        emotionalVolatilityScore: modelResult.json.scores.emotionalVolatility,
        emotionalGrowthScore: modelResult.json.scores.emotionalGrowth,
        forecastConfidence: modelResult.json.forecast.confidence,
      },
      sources: {
        journalIds: sources.journals.map((entry) => entry.id),
        moodEntryIds: sources.moods.map((entry) => entry.id),
        threadIds: sources.threads.map((entry) => entry.threadId),
      },
      compareToReportId: previousReport?.reportId ?? null,
    });

    batch.set(
      db.collection('users').doc(auth.userId),
      {
        lastWeeklyInsightAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    const reportSummary: ReportSummary = {
      id: reportId,
      periodType: 'weekly',
      periodStart: targetPeriod.periodStart.toISOString(),
      periodEnd: targetPeriod.periodEnd.toISOString(),
      createdAt: now.toISOString(),
      markdownPreview: toPreview(markdown),
      markdown,
      compareToReportId: previousReport?.reportId ?? null,
      metrics: {
        emotionalVolatilityScore: modelResult.json.scores.emotionalVolatility,
        emotionalGrowthScore: modelResult.json.scores.emotionalGrowth,
        forecastConfidence: modelResult.json.forecast.confidence,
      },
    };

    return NextResponse.json({
      code: 'REPORT_GENERATED',
      report: reportSummary,
      weekStart: targetPeriod.periodStart.toISOString(),
      weekEnd: targetPeriod.periodEnd.toISOString(),
      journalDaysTracked: trackingSummary.journalDaysTracked,
      moodDaysTracked: trackingSummary.moodDaysTracked,
    });
  } catch (error) {
    return jsonError(error);
  }
}
