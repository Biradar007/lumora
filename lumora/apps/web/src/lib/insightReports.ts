import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@lumora/db';

type Provider = 'openai' | 'gemini';

export type InsightPeriodType = 'weekly' | 'monthly';

export interface InsightPeriod {
  periodType: InsightPeriodType;
  periodStart: Date;
  periodEnd: Date;
}

export interface InsightSourceInput {
  journals: Array<{ id: string; createdAt: number; content: string }>;
  moods: Array<{ id: string; createdAt: number; mood: number; note?: string; activities?: string[] }>;
  threads: Array<{ threadId: string; updatedAt: number; rollingSummary?: string }>;
}

export interface InsightComparisonInput {
  reportId: string;
  summary?: string;
  keyThemes?: string[];
  emotionalVolatility?: number;
  emotionalGrowth?: number;
  forecast?: string;
}

export interface InsightStructuredJson {
  periodType: InsightPeriodType;
  periodStart: string;
  periodEnd: string;
  summary: {
    emotionalTrend: string;
    keyThemes: string[];
    reflectionQuestion: string;
  };
  scores: {
    emotionalVolatility: number;
    emotionalGrowth: number;
  };
  stressTriggers: {
    topTriggers: Array<{
      trigger: string;
      evidence: string;
      correlatedMood: string;
    }>;
  };
  cognitiveDistortions: {
    distortions: Array<{
      type: string;
      evidence: string;
      reframe: string;
    }>;
  };
  behaviorPatterns: {
    patterns: Array<{
      pattern: string;
      evidence: string;
      impact: string;
    }>;
  };
  relationshipTone: {
    applicable: boolean;
    summary: string;
    signals: string[];
  };
  actions: {
    suggestions: string[];
    roadmap: Array<{
      title: string;
      description: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  };
  forecast: {
    forecast: string;
    confidence: number;
    earlyWarningSignals: string[];
  };
  comparison: {
    hasPrevious: boolean;
    previousReportId: string | null;
    changes: Array<{
      area: string;
      lastPeriod: string;
      thisPeriod: string;
      interpretation: string;
    }>;
  };
}

interface InsightModelResult {
  json: InsightStructuredJson;
  markdown: string;
  rawModelOutput: string;
  parseError?: string;
}

let openaiClient: OpenAI | undefined;
let geminiClient: GoogleGenerativeAI | undefined;

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const getOpenAIClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const getGeminiClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
};

function isProvider(value: unknown): value is Provider {
  return value === 'openai' || value === 'gemini';
}

function clampScore(value: unknown): number {
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

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const strings = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return strings.length ? strings : fallback;
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function extractJsonCandidates(raw: string): string[] {
  const candidates: string[] = [];
  const trimmed = raw.trim();
  if (trimmed.length > 0) {
    candidates.push(trimmed);
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim());
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1).trim());
  }

  return Array.from(new Set(candidates));
}

function parseModelEnvelope(raw: string): { json: unknown; markdown: string; parseError?: string } {
  const candidates = extractJsonCandidates(raw);
  let parsed: unknown = null;

  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      continue;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      json: null,
      markdown: '',
      parseError: 'model_output_not_json',
    };
  }

  const objectValue = parsed as Record<string, unknown>;
  const envelopeJson = objectValue.json ?? parsed;
  const envelopeMarkdown =
    typeof objectValue.markdown === 'string'
      ? objectValue.markdown.trim()
      : typeof objectValue.reportMarkdown === 'string'
        ? objectValue.reportMarkdown.trim()
        : '';

  return {
    json: envelopeJson,
    markdown: envelopeMarkdown,
  };
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }
  return 'easy';
}

function normalizeRoadmap(value: unknown): InsightStructuredJson['actions']['roadmap'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const title = asString(row.title);
      const description = asString(row.description);
      if (!title || !description) {
        return null;
      }
      return {
        title,
        description,
        difficulty: normalizeDifficulty(row.difficulty),
      };
    })
    .filter((entry): entry is InsightStructuredJson['actions']['roadmap'][number] => Boolean(entry));
}

function normalizeChanges(value: unknown): InsightStructuredJson['comparison']['changes'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        area: asString(row.area),
        lastPeriod: asString(row.lastPeriod),
        thisPeriod: asString(row.thisPeriod),
        interpretation: asString(row.interpretation),
      };
    })
    .filter(
      (entry): entry is InsightStructuredJson['comparison']['changes'][number] =>
        Boolean(entry && entry.area && entry.lastPeriod && entry.thisPeriod && entry.interpretation)
    );
}

function normalizeInsightJson(params: {
  rawJson: unknown;
  periodType: InsightPeriodType;
  periodStartIso: string;
  periodEndIso: string;
  previousReportId: string | null;
}): InsightStructuredJson {
  const { rawJson, periodType, periodStartIso, periodEndIso, previousReportId } = params;
  const source = (rawJson && typeof rawJson === 'object' ? rawJson : {}) as Record<string, unknown>;
  const rawSummary = (source.summary && typeof source.summary === 'object' ? source.summary : {}) as Record<string, unknown>;
  const rawScores = (source.scores && typeof source.scores === 'object' ? source.scores : {}) as Record<string, unknown>;
  const rawTriggers = (source.stressTriggers && typeof source.stressTriggers === 'object'
    ? source.stressTriggers
    : {}) as Record<string, unknown>;
  const rawDistortions = (source.cognitiveDistortions && typeof source.cognitiveDistortions === 'object'
    ? source.cognitiveDistortions
    : {}) as Record<string, unknown>;
  const rawBehavior = (source.behaviorPatterns && typeof source.behaviorPatterns === 'object'
    ? source.behaviorPatterns
    : {}) as Record<string, unknown>;
  const rawRelationship = (source.relationshipTone && typeof source.relationshipTone === 'object'
    ? source.relationshipTone
    : {}) as Record<string, unknown>;
  const rawActions = (source.actions && typeof source.actions === 'object' ? source.actions : {}) as Record<string, unknown>;
  const rawForecast = (source.forecast && typeof source.forecast === 'object' ? source.forecast : {}) as Record<string, unknown>;
  const rawComparison = (source.comparison && typeof source.comparison === 'object'
    ? source.comparison
    : {}) as Record<string, unknown>;

  const topTriggers = Array.isArray(rawTriggers.topTriggers)
    ? (rawTriggers.topTriggers as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const row = entry as Record<string, unknown>;
          return {
            trigger: asString(row.trigger),
            evidence: asString(row.evidence),
            correlatedMood: asString(row.correlatedMood),
          };
        })
        .filter(
          (entry): entry is InsightStructuredJson['stressTriggers']['topTriggers'][number] =>
            Boolean(entry && entry.trigger && entry.evidence && entry.correlatedMood)
        )
    : [];

  const distortions = Array.isArray(rawDistortions.distortions)
    ? (rawDistortions.distortions as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const row = entry as Record<string, unknown>;
          return {
            type: asString(row.type),
            evidence: asString(row.evidence),
            reframe: asString(row.reframe),
          };
        })
        .filter(
          (entry): entry is InsightStructuredJson['cognitiveDistortions']['distortions'][number] =>
            Boolean(entry && entry.type && entry.evidence && entry.reframe)
        )
    : [];

  const patterns = Array.isArray(rawBehavior.patterns)
    ? (rawBehavior.patterns as unknown[])
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          const row = entry as Record<string, unknown>;
          return {
            pattern: asString(row.pattern),
            evidence: asString(row.evidence),
            impact: asString(row.impact),
          };
        })
        .filter(
          (entry): entry is InsightStructuredJson['behaviorPatterns']['patterns'][number] =>
            Boolean(entry && entry.pattern && entry.evidence && entry.impact)
        )
    : [];

  const suggestions = asStringArray(rawActions.suggestions, [
    'Spend 5 minutes journaling one emotional highlight each day.',
    'Do a short mood check-in before bed to track patterns.',
    'Pick one calming routine and repeat it at the same time each day.',
  ]).slice(0, 3);

  let roadmap = normalizeRoadmap(rawActions.roadmap);
  if (roadmap.length < 3) {
    roadmap = [
      ...roadmap,
      {
        title: 'Daily check-in routine',
        description: 'Journal and record one mood entry each day to improve pattern clarity.',
        difficulty: 'easy',
      },
      {
        title: 'Trigger log',
        description: 'Capture stressful moments with context to uncover recurring trigger loops.',
        difficulty: 'medium',
      },
      {
        title: 'Weekly reflection review',
        description: 'Review the week and note one progress win and one area to adjust.',
        difficulty: 'easy',
      },
    ];
  }
  roadmap = roadmap.slice(0, 5);

  const hasPrevious = Boolean(previousReportId);
  const changes = normalizeChanges(rawComparison.changes);

  return {
    periodType,
    periodStart: periodStartIso,
    periodEnd: periodEndIso,
    summary: {
      emotionalTrend: asString(
        rawSummary.emotionalTrend,
        'Emotional patterns were mixed this period with opportunities for steadier routines.'
      ),
      keyThemes: asStringArray(rawSummary.keyThemes, ['Consistency', 'Emotional awareness']),
      reflectionQuestion: asString(
        rawSummary.reflectionQuestion,
        'What one small habit helped you feel more stable this period?'
      ),
    },
    scores: {
      emotionalVolatility: clampScore(rawScores.emotionalVolatility),
      emotionalGrowth: clampScore(rawScores.emotionalGrowth),
    },
    stressTriggers: {
      topTriggers:
        topTriggers.length > 0
          ? topTriggers
          : [
              {
                trigger: 'No clear trigger data',
                evidence: 'Limited explicit trigger references in available entries.',
                correlatedMood: 'neutral',
              },
            ],
    },
    cognitiveDistortions: {
      distortions:
        distortions.length > 0
          ? distortions
          : [
              {
                type: 'No dominant distortion detected',
                evidence: 'Limited language indicating clear distortion patterns.',
                reframe: 'Keep noting thoughts to identify patterns over time.',
              },
            ],
    },
    behaviorPatterns: {
      patterns:
        patterns.length > 0
          ? patterns
          : [
              {
                pattern: 'Tracking consistency needs improvement',
                evidence: 'Not enough repeated entries to infer strong routines.',
                impact: 'Lower confidence in trend detection and forecasting.',
              },
            ],
    },
    relationshipTone: {
      applicable: Boolean(rawRelationship.applicable),
      summary: asString(rawRelationship.summary, ''),
      signals: asStringArray(rawRelationship.signals, []),
    },
    actions: {
      suggestions,
      roadmap,
    },
    forecast: {
      forecast: asString(
        rawForecast.forecast,
        'If current patterns continue, mood stability may improve with consistent daily check-ins.'
      ),
      confidence: clampScore(rawForecast.confidence),
      earlyWarningSignals: asStringArray(rawForecast.earlyWarningSignals, [
        'Skipping journal entries for multiple days',
        'Sudden drop in mood check-ins',
      ]),
    },
    comparison: {
      hasPrevious,
      previousReportId: hasPrevious ? previousReportId : null,
      changes: hasPrevious ? changes : [],
    },
  };
}

function fallbackMarkdown(input: InsightStructuredJson): string {
  const volatility = input.scores.emotionalVolatility;
  const growth = input.scores.emotionalGrowth;
  const confidence = input.forecast.confidence;
  const roadmap = input.actions.roadmap.slice(0, 5);
  const suggestions = input.actions.suggestions.slice(0, 3);

  return [
    `# ${input.periodType === 'weekly' ? 'Weekly' : 'Monthly'} Insight Report`,
    '',
    `## Emotional Trend Summary`,
    input.summary.emotionalTrend,
    '',
    `- Emotional volatility score: **${volatility}/100**`,
    `- Emotional growth score: **${growth}/100**`,
    '',
    `## Stress Trigger Mapping`,
    ...input.stressTriggers.topTriggers.map(
      (trigger) => `- **${trigger.trigger}**: ${trigger.evidence} (correlated mood: ${trigger.correlatedMood})`
    ),
    '',
    `## Cognitive Distortions`,
    ...input.cognitiveDistortions.distortions.map(
      (distortion) => `- **${distortion.type}**: ${distortion.evidence} | Reframe: ${distortion.reframe}`
    ),
    '',
    `## Behavior Patterns`,
    ...input.behaviorPatterns.patterns.map(
      (pattern) => `- **${pattern.pattern}**: ${pattern.evidence} | Impact: ${pattern.impact}`
    ),
    '',
    `## Relationship Tone Analysis`,
    input.relationshipTone.applicable
      ? input.relationshipTone.summary || 'Relationship dynamics were present but subtle this period.'
      : 'Not enough relationship-related content to infer tone for this period.',
    ...(input.relationshipTone.signals.length > 0
      ? input.relationshipTone.signals.map((signal) => `- ${signal}`)
      : []),
    '',
    `## Personalized Action Roadmap`,
    ...roadmap.map((step, index) => `${index + 1}. **${step.title}** (${step.difficulty}) - ${step.description}`),
    '',
    `## Forecast`,
    `${input.forecast.forecast} (confidence: ${confidence}/100)`,
    ...input.forecast.earlyWarningSignals.map((signal) => `- ${signal}`),
    '',
    `## Comparison With Previous Period`,
    input.comparison.hasPrevious
      ? input.comparison.changes.length > 0
        ? input.comparison.changes
            .map(
              (change) =>
                `- **${change.area}**: ${change.lastPeriod} -> ${change.thisPeriod}. ${change.interpretation}`
            )
            .join('\n')
        : 'Previous period exists, but specific change details are limited.'
      : 'No previous period report was available for comparison.',
    '',
    `## Reflection Question`,
    input.summary.reflectionQuestion,
    '',
    `## 3 Actionable Suggestions`,
    ...suggestions.map((suggestion) => `- ${suggestion}`),
  ].join('\n');
}

function buildPrompt(params: {
  uid: string;
  period: InsightPeriod;
  sources: InsightSourceInput;
  previousReport: InsightComparisonInput | null;
}): string {
  const { uid, period, sources, previousReport } = params;

  const journalSlice = sources.journals.slice(0, 50).map((entry) => ({
    id: entry.id,
    createdAt: new Date(entry.createdAt).toISOString(),
    content: truncateText(entry.content, 1000),
  }));

  const moodSlice = sources.moods.slice(0, 80).map((entry) => ({
    id: entry.id,
    createdAt: new Date(entry.createdAt).toISOString(),
    mood: entry.mood,
    note: truncateText(entry.note ?? '', 300),
    activities: (entry.activities ?? []).slice(0, 8),
  }));

  const threadSlice = sources.threads.slice(0, 10).map((thread) => ({
    threadId: thread.threadId,
    updatedAt: new Date(thread.updatedAt).toISOString(),
    rollingSummary: truncateText(thread.rollingSummary ?? '', 1000),
  }));

  const previousBlock = previousReport
    ? {
        reportId: previousReport.reportId,
        summary: previousReport.summary ?? '',
        keyThemes: previousReport.keyThemes ?? [],
        emotionalVolatility: previousReport.emotionalVolatility ?? null,
        emotionalGrowth: previousReport.emotionalGrowth ?? null,
        forecast: previousReport.forecast ?? '',
      }
    : null;

  return [
    'You are Lumora Insight Engine.',
    'Generate a clinical-style but supportive report based ONLY on provided data.',
    'Output must be a single JSON object with EXACTLY two top-level keys: "json" and "markdown".',
    'Do not include code fences. Do not include extra keys.',
    '',
    'The "json" key must follow this exact schema and key names:',
    '{',
    '  "periodType": "weekly" | "monthly",',
    '  "periodStart": "ISO",',
    '  "periodEnd": "ISO",',
    '  "summary": {',
    '    "emotionalTrend": "string",',
    '    "keyThemes": ["string"],',
    '    "reflectionQuestion": "string"',
    '  },',
    '  "scores": {',
    '    "emotionalVolatility": 0-100,',
    '    "emotionalGrowth": 0-100',
    '  },',
    '  "stressTriggers": {',
    '    "topTriggers": [{ "trigger": "string", "evidence": "string", "correlatedMood": "string" }]',
    '  },',
    '  "cognitiveDistortions": {',
    '    "distortions": [{ "type": "string", "evidence": "string", "reframe": "string" }]',
    '  },',
    '  "behaviorPatterns": {',
    '    "patterns": [{ "pattern": "string", "evidence": "string", "impact": "string" }]',
    '  },',
    '  "relationshipTone": {',
    '    "applicable": true|false,',
    '    "summary": "string",',
    '    "signals": ["string"]',
    '  },',
    '  "actions": {',
    '    "suggestions": ["string","string","string"],',
    '    "roadmap": [{ "title":"string","description":"string","difficulty":"easy|medium|hard" }]',
    '  },',
    '  "forecast": {',
    '    "forecast": "string",',
    '    "confidence": 0-100,',
    '    "earlyWarningSignals": ["string"]',
    '  },',
    '  "comparison": {',
    '    "hasPrevious": true|false,',
    '    "previousReportId": "string|null",',
    '    "changes": [{ "area":"string","lastPeriod":"string","thisPeriod":"string","interpretation":"string" }]',
    '  }',
    '}',
    '',
    'The "markdown" key must be a readable report with these sections:',
    '1) Emotional trend summary',
    '2) Emotional volatility score + explanation',
    '3) Stress trigger mapping',
    '4) Cognitive distortion detection',
    '5) Behavioral pattern detection',
    '6) Relationship tone analysis',
    '7) Emotional growth score',
    '8) Personalized action roadmap (3–5 steps)',
    '9) Forecast prediction + confidence',
    '10) Comparison with previous period',
    'Also include one reflection question and 3 actionable suggestions.',
    '',
    'If data is limited, still fill ALL required fields with reasonable defaults and explicit uncertainty.',
    '',
    `User ID: ${uid}`,
    `Period Type: ${period.periodType}`,
    `Period Start (ISO): ${period.periodStart.toISOString()}`,
    `Period End (ISO): ${period.periodEnd.toISOString()}`,
    '',
    `Previous report context: ${JSON.stringify(previousBlock)}`,
    '',
    `Journal entries (${journalSlice.length}): ${JSON.stringify(journalSlice)}`,
    `Mood entries (${moodSlice.length}): ${JSON.stringify(moodSlice)}`,
    `Chat summaries (${threadSlice.length}): ${JSON.stringify(threadSlice)}`,
  ].join('\n');
}

export function buildInsightReportId(periodType: InsightPeriodType, periodStart: Date): string {
  const normalized = periodStart.toISOString().replace(/[:.]/g, '-');
  return `${periodType}_${normalized}`;
}

export function resolvePeriodFromReportId(reportId: string): { periodType: InsightPeriodType; periodStartIso: string } | null {
  const match = reportId.match(/^(weekly|monthly)_(.+)$/);
  if (!match) {
    return null;
  }
  const periodType = match[1] as InsightPeriodType;
  const periodStartIso = match[2].replace(/-/g, (value, index, input) => {
    const colonPositions = [13, 16];
    if (colonPositions.includes(index) || index === 19) {
      return ':';
    }
    if (index === 22) {
      return '.';
    }
    return value;
  });
  return {
    periodType,
    periodStartIso,
  };
}

export function getWeeklyInsightPeriod(now: Date): InsightPeriod {
  const weekEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay(), 0, 0, 0, 0)
  );
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    periodType: 'weekly',
    periodStart: weekStart,
    periodEnd: weekEnd,
  };
}

export function getMonthlyInsightPeriod(now: Date): InsightPeriod {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    periodType: 'monthly',
    periodStart: monthStart,
    periodEnd: monthEnd,
  };
}

export function getPreviousInsightPeriod(period: InsightPeriod): InsightPeriod {
  if (period.periodType === 'weekly') {
    const previousEnd = new Date(period.periodStart.getTime());
    const previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      periodType: 'weekly',
      periodStart: previousStart,
      periodEnd: previousEnd,
    };
  }
  const previousStart = new Date(
    Date.UTC(period.periodStart.getUTCFullYear(), period.periodStart.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );
  const previousEnd = new Date(
    Date.UTC(period.periodStart.getUTCFullYear(), period.periodStart.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  return {
    periodType: 'monthly',
    periodStart: previousStart,
    periodEnd: previousEnd,
  };
}

export function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function generateInsightReport(params: {
  uid: string;
  period: InsightPeriod;
  sources: InsightSourceInput;
  previousReport: InsightComparisonInput | null;
}): Promise<InsightModelResult> {
  const { uid, period, sources, previousReport } = params;
  const provider: Provider = isProvider(env.AI_PROVIDER) ? env.AI_PROVIDER : 'openai';
  const prompt = buildPrompt({
    uid,
    period,
    sources,
    previousReport,
  });

  let rawModelOutput = '';

  if (provider === 'gemini') {
    const completion = await getGeminiClient()
      .getGenerativeModel({ model: DEFAULT_GEMINI_MODEL })
      .generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 2800,
        },
      });
    rawModelOutput = completion.response.text() ?? '';
  } else {
    const completion = await getOpenAIClient().chat.completions.create({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0.35,
      max_tokens: 2800,
      messages: [
        {
          role: 'system',
          content:
            'You are a mental-health insights assistant. Return only valid JSON as instructed with keys "json" and "markdown".',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    rawModelOutput = completion.choices[0]?.message?.content ?? '';
  }

  const envelope = parseModelEnvelope(rawModelOutput);
  const normalizedJson = normalizeInsightJson({
    rawJson: envelope.json,
    periodType: period.periodType,
    periodStartIso: period.periodStart.toISOString(),
    periodEndIso: period.periodEnd.toISOString(),
    previousReportId: previousReport?.reportId ?? null,
  });
  const markdown = envelope.markdown || fallbackMarkdown(normalizedJson);

  return {
    json: normalizedJson,
    markdown,
    rawModelOutput,
    parseError: envelope.parseError,
  };
}

