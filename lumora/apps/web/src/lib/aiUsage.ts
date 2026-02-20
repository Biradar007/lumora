export type UserPlan = 'free' | 'pro';

export const FREE_MONTHLY_MESSAGE_LIMIT = 30;
export const FREE_DAILY_COOLDOWN_START = 10;
export const FREE_DAILY_COOLDOWN_STEP = 5;
export const FREE_COOLDOWN_SECONDS = 60;

export interface UsageState {
  periodStart: Date;
  periodEnd: Date;
  messagesUsed: number;
  dailyCounts: Record<string, number>;
  cooldownUntil: Date | null;
  lastMessageAt: Date | null;
}

export interface UsageResponsePayload {
  plan: UserPlan;
  messagesUsed: number;
  messagesRemaining?: number;
  periodEnd: string;
  cooldownUntil?: string;
  retryAfterSeconds?: number;
}

type FirestoreTimestampLike = {
  toDate?: () => Date;
};

function toDate(value: unknown): Date | null {
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
  if (typeof value === 'object' && value) {
    const candidate = value as FirestoreTimestampLike;
    if (typeof candidate.toDate === 'function') {
      const parsed = candidate.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

export function resolvePlan(value: unknown): UserPlan {
  return value === 'pro' ? 'pro' : 'free';
}

export function getCurrentMonthPeriod(now: Date): { periodStart: Date; periodEnd: Date } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    periodStart: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    periodEnd: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)),
  };
}

export function getUtcDayKey(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDailyCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const dailyCounts: Record<string, number> = {};
  for (const [day, count] of entries) {
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      dailyCounts[day] = Math.floor(count);
    }
  }
  return dailyCounts;
}

export function createUsageState(now: Date): UsageState {
  const { periodStart, periodEnd } = getCurrentMonthPeriod(now);
  return {
    periodStart,
    periodEnd,
    messagesUsed: 0,
    dailyCounts: {},
    cooldownUntil: null,
    lastMessageAt: null,
  };
}

export function normalizeUsageState(raw: unknown, now: Date): UsageState {
  const source = (raw ?? {}) as Record<string, unknown>;
  const fallback = createUsageState(now);
  const periodStart = toDate(source.periodStart) ?? fallback.periodStart;
  const periodEnd = toDate(source.periodEnd) ?? fallback.periodEnd;
  const messagesUsedRaw = source.messagesUsed;
  const messagesUsed =
    typeof messagesUsedRaw === 'number' && Number.isFinite(messagesUsedRaw) && messagesUsedRaw >= 0
      ? Math.floor(messagesUsedRaw)
      : 0;

  return {
    periodStart,
    periodEnd,
    messagesUsed,
    dailyCounts: normalizeDailyCounts(source.dailyCounts),
    cooldownUntil: toDate(source.cooldownUntil),
    lastMessageAt: toDate(source.lastMessageAt),
  };
}

export function shouldResetUsagePeriod(usage: UsageState, now: Date): boolean {
  return now.getTime() >= usage.periodEnd.getTime();
}

export function resetUsageForCurrentMonth(now: Date): UsageState {
  return createUsageState(now);
}

export function serializeUsageState(usage: UsageState): Record<string, unknown> {
  return {
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
    messagesUsed: usage.messagesUsed,
    dailyCounts: usage.dailyCounts,
    cooldownUntil: usage.cooldownUntil,
    lastMessageAt: usage.lastMessageAt,
  };
}

export function getCooldownRemainingSeconds(usage: UsageState, now: Date): number {
  if (!usage.cooldownUntil) {
    return 0;
  }
  const diffMs = usage.cooldownUntil.getTime() - now.getTime();
  if (diffMs <= 0) {
    return 0;
  }
  return Math.ceil(diffMs / 1000);
}

export function buildUsageResponse(plan: UserPlan, usage: UsageState, now: Date): UsageResponsePayload {
  const retryAfterSeconds = getCooldownRemainingSeconds(usage, now);
  const response: UsageResponsePayload = {
    plan,
    messagesUsed: usage.messagesUsed,
    periodEnd: usage.periodEnd.toISOString(),
  };

  if (plan === 'free') {
    response.messagesRemaining = Math.max(0, FREE_MONTHLY_MESSAGE_LIMIT - usage.messagesUsed);
  }
  if (retryAfterSeconds > 0 && usage.cooldownUntil) {
    response.cooldownUntil = usage.cooldownUntil.toISOString();
    response.retryAfterSeconds = retryAfterSeconds;
  }
  return response;
}

export function shouldApplyFreeCooldown(nextMessageCount: number): boolean {
  if (nextMessageCount === FREE_DAILY_COOLDOWN_START) {
    return true;
  }
  if (nextMessageCount <= FREE_DAILY_COOLDOWN_START) {
    return false;
  }
  return (nextMessageCount - FREE_DAILY_COOLDOWN_START) % FREE_DAILY_COOLDOWN_STEP === 0;
}
