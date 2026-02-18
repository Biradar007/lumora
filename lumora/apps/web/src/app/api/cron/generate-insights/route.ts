import { NextResponse } from 'next/server';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { getServerFirestore } from '@/lib/firestoreServer';
import {
  buildInsightReportId,
  generateInsightReport,
  getMonthlyInsightPeriod,
  getPreviousInsightPeriod,
  getWeeklyInsightPeriod,
  toDate,
  type InsightComparisonInput,
  type InsightPeriod,
  type InsightPeriodType,
  type InsightSourceInput,
} from '@/lib/insightReports';

type Plan = 'free' | 'pro';

type UserRecord = {
  plan?: Plan;
  lastWeeklyInsightAt?: unknown;
  lastMonthlyInsightAt?: unknown;
};

type InsightReportDoc = {
  periodType: InsightPeriodType;
  periodStart: unknown;
  periodEnd: unknown;
  createdAt: unknown;
  content?: {
    json?: unknown;
    markdown?: unknown;
  };
};

type UserProcessResult = {
  uid: string;
  plan: Plan;
  status: 'generated' | 'skipped' | 'failed';
  reason: string;
  periodType?: InsightPeriodType;
  reportId?: string;
};

const MAX_USERS_PER_RUN = 50;
const INSUFFICIENT_WEEKLY_DATA_MESSAGE =
  'Insufficient data. Please journal and mood track daily to get proper report.';

function resolvePlan(value: unknown): Plan {
  return value === 'pro' ? 'pro' : 'free';
}

function toTimestampMs(value: unknown): number | null {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }
  return parsed.getTime();
}

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }
  return match[1].trim() === secret;
}

function resolveMarkdown(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
}

async function fetchSourceData(
  db: Firestore,
  uid: string,
  period: InsightPeriod
): Promise<InsightSourceInput> {
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
      const content = typeof data.content === 'string' ? data.content : '';
      return {
        id: docSnapshot.id,
        createdAt: createdAtMs,
        content,
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
      const moodValue =
        typeof data.mood === 'number' && Number.isFinite(data.mood) ? Math.round(data.mood) : 0;
      const note = typeof data.note === 'string' ? data.note : undefined;
      const activities = Array.isArray(data.activities)
        ? data.activities
            .map((activity) => (typeof activity === 'string' ? activity.trim() : ''))
            .filter((activity) => activity.length > 0)
        : [];
      return {
        id: docSnapshot.id,
        createdAt: createdAtMs,
        mood: moodValue,
        note,
        activities,
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

function getPreviousReportContext(reportId: string, snapshotData: InsightReportDoc): InsightComparisonInput {
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

async function processUser(params: {
  db: Firestore;
  uid: string;
  userData: UserRecord;
  now: Date;
  weeklyPeriod: InsightPeriod;
  monthlyPeriod: InsightPeriod;
}): Promise<UserProcessResult> {
  const { db, uid, userData, now, weeklyPeriod, monthlyPeriod } = params;
  const plan = resolvePlan(userData.plan);
  const period = plan === 'pro' ? weeklyPeriod : monthlyPeriod;
  const userRef = db.collection('users').doc(uid);
  const reportsRef = db.collection('insights').doc(uid).collection('reports');

  const lastGeneratedAt = toDate(plan === 'pro' ? userData.lastWeeklyInsightAt : userData.lastMonthlyInsightAt);
  if (lastGeneratedAt && lastGeneratedAt.getTime() >= period.periodStart.getTime()) {
    return {
      uid,
      plan,
      status: 'skipped',
      reason: `already_generated_for_${period.periodType}_period`,
      periodType: period.periodType,
    };
  }

  const reportId = buildInsightReportId(period.periodType, period.periodStart);
  const reportRef = reportsRef.doc(reportId);
  const existingSnapshot = await reportRef.get();
  if (existingSnapshot.exists) {
    return {
      uid,
      plan,
      status: 'skipped',
      reason: 'report_exists_idempotent_skip',
      periodType: period.periodType,
      reportId,
    };
  }

  const sources = await fetchSourceData(db, uid, period);

  if (plan === 'pro' && (sources.journals.length === 0 || sources.moods.length === 0)) {
    return {
      uid,
      plan,
      status: 'skipped',
      reason: INSUFFICIENT_WEEKLY_DATA_MESSAGE,
      periodType: period.periodType,
    };
  }

  const previousPeriod = getPreviousInsightPeriod(period);
  const previousReportId = buildInsightReportId(previousPeriod.periodType, previousPeriod.periodStart);
  const previousSnapshot = await reportsRef.doc(previousReportId).get();
  const previousReport = previousSnapshot.exists
    ? getPreviousReportContext(previousReportId, previousSnapshot.data() as InsightReportDoc)
    : null;

  const modelResult = await generateInsightReport({
    uid,
    period,
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
    `# ${period.periodType === 'weekly' ? 'Weekly' : 'Monthly'} Insight Report\n\nNo markdown report was returned.`
  );

  const batch = db.batch();
  batch.set(reportRef, {
    periodType: period.periodType,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
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
    userRef,
    plan === 'pro'
      ? {
          lastWeeklyInsightAt: now,
        }
      : {
          lastMonthlyInsightAt: now,
        },
    { merge: true }
  );

  await batch.commit();

  return {
    uid,
    plan,
    status: 'generated',
    reason: 'generated_successfully',
    periodType: period.periodType,
    reportId,
  };
}

export const runtime = 'nodejs';

async function handleCronGenerateInsights(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const weeklyPeriod = getWeeklyInsightPeriod(now);
  const monthlyPeriod = getMonthlyInsightPeriod(now);
  const db = getServerFirestore();
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');

  let query = db.collection('users').orderBy(FieldPath.documentId()).limit(MAX_USERS_PER_RUN + 1);
  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const documents = snapshot.docs.slice(0, MAX_USERS_PER_RUN);
  const hasMore = snapshot.docs.length > MAX_USERS_PER_RUN;
  const nextCursor = hasMore && documents.length > 0 ? documents[documents.length - 1].id : null;

  const results: UserProcessResult[] = [];

  for (const docSnapshot of documents) {
    const uid = docSnapshot.id;
    const userData = (docSnapshot.data() ?? {}) as UserRecord;
    try {
      const result = await processUser({
        db,
        uid,
        userData,
        now,
        weeklyPeriod,
        monthlyPeriod,
      });
      results.push(result);
    } catch (error) {
      console.error('[cron/generate-insights] failed user', { uid, error });
      results.push({
        uid,
        plan: resolvePlan(userData.plan),
        status: 'failed',
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  const summary = {
    processed: results.length,
    generated: results.filter((result) => result.status === 'generated').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
  };

  return NextResponse.json({
    ok: true,
    now: now.toISOString(),
    weeklyPeriod: {
      start: weeklyPeriod.periodStart.toISOString(),
      end: weeklyPeriod.periodEnd.toISOString(),
    },
    monthlyPeriod: {
      start: monthlyPeriod.periodStart.toISOString(),
      end: monthlyPeriod.periodEnd.toISOString(),
    },
    summary,
    nextCursor,
    results,
  });
}

export async function POST(request: Request) {
  return handleCronGenerateInsights(request);
}

export async function GET(request: Request) {
  return handleCronGenerateInsights(request);
}
