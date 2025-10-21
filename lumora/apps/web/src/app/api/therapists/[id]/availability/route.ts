import { NextResponse } from 'next/server';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import { getServerFirestore } from '@/lib/firestoreServer';
import { fetchGoogleBusyBlocks } from '@/lib/googleCalendar';
import type { Appointment } from '@/types/domain';

export const runtime = 'nodejs';

interface AvailabilitySlot {
  start: number;
  end: number;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':');
  return { hour: Number(hourStr ?? '0'), minute: Number(minuteStr ?? '0') };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function normalizeTimeZone(timeZone?: string): string {
  if (!timeZone) {
    return 'UTC';
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch (error) {
    console.warn('Invalid timezone provided, falling back to UTC:', timeZone, error);
    return 'UTC';
  }
}

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = WEEKDAYS.indexOf((lookup.weekday as (typeof WEEKDAYS)[number]) ?? 'Sun');
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    weekday: weekday >= 0 ? weekday : 0,
  };
}

function getTimeZoneOffset(timestamp: number, timeZone: string): number {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second ?? '0')
  );
  return (asUtc - timestamp) / (60 * 1000);
}

function zonedDateForDay(day: Date, time: string, timeZone: string): Date {
  const { year, month, day: dayNumber } = getZonedDateParts(day, timeZone);
  const { hour, minute } = parseTime(time);
  const localMillis = Date.UTC(year, month - 1, dayNumber, hour, minute, 0);
  const offsetMinutes = getTimeZoneOffset(localMillis, timeZone);
  return new Date(localMillis - offsetMinutes * 60 * 1000);
}

function overlaps(range: { start: number; end: number }, slot: { start: number; end: number }) {
  return range.start < slot.end && slot.start < range.end;
}

function toBusyRanges(appointments: Appointment[], ignoreIds: Set<string>): { start: number; end: number }[] {
  return appointments
    .filter((appt) => !ignoreIds.has(appt.id) && ['PENDING', 'CONFIRMED'].includes(appt.status))
    .map((appt) => ({ start: appt.start, end: appt.end }));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: therapistId } = await params;
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();

    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const rangeStart = fromParam ? Number(fromParam) : Date.now();
    const defaultEnd = new Date(rangeStart);
    defaultEnd.setDate(defaultEnd.getDate() + 14);
    const rangeEnd = toParam ? Number(toParam) : defaultEnd.getTime();

    if (auth.role === 'user') {
      const connectionCheck = await db
        .collection('connections')
        .where('userId', '==', auth.userId)
        .where('therapistId', '==', therapistId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      if (connectionCheck.empty) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    const profileSnapshot = await db.collection('therapistProfiles').doc(therapistId).get();
    if (!profileSnapshot.exists) {
      return NextResponse.json({ error: 'therapist_not_found' }, { status: 404 });
    }
    const profile = profileSnapshot.data() as {
      availability?: { day: number; start: string; end: string }[];
      timezone?: string;
      sessionLengthMinutes?: 25 | 50;
    };

    const timezone = normalizeTimeZone(profile.timezone);
    const availability = profile.availability ?? [];
    const sessionLength = profile.sessionLengthMinutes ?? 50;

    if (!availability.length) {
      return NextResponse.json({ availability: [], timezone, sessionLengthMinutes: sessionLength });
    }

    // Fetch existing appointments in range
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('therapistId', '==', therapistId)
      .where('start', '>=', rangeStart)
      .where('start', '<', rangeEnd)
      .get();
    const appointments = appointmentsSnapshot.docs.map((doc) => doc.data() as Appointment);

    const busyRanges = toBusyRanges(appointments, new Set());

    // Google busy blocks
    const googleBusy = await fetchGoogleBusyBlocks(therapistId, new Date(rangeStart).toISOString(), new Date(rangeEnd).toISOString());
    googleBusy.forEach((slot) => {
      if (slot.start && slot.end) {
        busyRanges.push({ start: Date.parse(slot.start), end: Date.parse(slot.end) });
      }
    });

    busyRanges.sort((a, b) => a.start - b.start);

    const slots: AvailabilitySlot[] = [];
    const cursor = new Date(rangeStart);

    while (cursor.getTime() < rangeEnd) {
      const zonedParts = getZonedDateParts(cursor, timezone);
      const dayAvailability = availability.filter((slot) => slot.day === zonedParts.weekday);
      if (dayAvailability.length) {
        dayAvailability.forEach((window) => {
          const windowStart = zonedDateForDay(cursor, window.start, timezone);
          const windowEnd = zonedDateForDay(cursor, window.end, timezone);
          let slotStart = windowStart.getTime();
          const slotEndBoundary = windowEnd.getTime();
          while (slotStart + sessionLength * 60 * 1000 <= slotEndBoundary) {
            const slotEnd = slotStart + sessionLength * 60 * 1000;
            if (slotStart >= rangeStart) {
              const candidate = { start: slotStart, end: slotEnd };
              const overlapping = busyRanges.some((busy) => overlaps(busy, candidate));
              if (!overlapping) {
                slots.push(candidate);
              }
            }
            slotStart = slotStart + sessionLength * 60 * 1000;
          }
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
    }

    return NextResponse.json({
      availability: slots,
      timezone,
      sessionLengthMinutes: sessionLength,
    });
  } catch (error) {
    return jsonError(error);
  }
}
