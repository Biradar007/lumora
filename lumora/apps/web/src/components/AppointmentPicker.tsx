'use client';

import { useEffect, useMemo, useState } from 'react';

interface AppointmentPickerProps {
  onBook: (payload: { start: number; end: number; location: 'video' | 'in-person'; videoLink?: string }) => Promise<void>;
  sessionLengthMinutes?: 25 | 50;
  availableSlots?: { start: number; end: number }[];
  timezone?: string;
}

export function AppointmentPicker({
  onBook,
  sessionLengthMinutes = 50,
  availableSlots = [],
  timezone = 'UTC',
}: AppointmentPickerProps) {
  const QUICK_SELECT_LIMIT = 6;
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [location, setLocation] = useState<'video' | 'in-person'>('video');
  const [videoLink, setVideoLink] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: number; end: number } | null>(null);
  const [showAllQuickDates, setShowAllQuickDates] = useState(false);

  const dayKeyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [timezone]
  );
  const dayLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [timezone]
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
      }),
    [timezone]
  );

  const dailySlots = useMemo(() => {
    if (!availableSlots.length) {
      return [];
    }
    const sortedSlots = [...availableSlots].sort((a, b) => a.start - b.start);
    const groups: { key: string; label: string; slots: { start: number; end: number }[] }[] = [];
    const indexByKey = new Map<string, number>();
    sortedSlots.forEach((slot) => {
      const slotDate = new Date(slot.start);
      const key = dayKeyFormatter.format(slotDate);
      const existingIndex = indexByKey.get(key);
      if (existingIndex !== undefined) {
        groups[existingIndex]?.slots.push(slot);
        return;
      }
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: dayLabelFormatter.format(slotDate),
        slots: [slot],
      });
    });
    return groups;
  }, [availableSlots, dayKeyFormatter, dayLabelFormatter]);

  useEffect(() => {
    if (!dailySlots.length) {
      if (date) {
        setDate('');
        setStart('');
        setSelectedSlot(null);
      }
      if (showAllQuickDates) {
        setShowAllQuickDates(false);
      }
      return;
    }
    if (!date) {
      setDate(dailySlots[0]?.key ?? '');
    }
    if (dailySlots.length <= QUICK_SELECT_LIMIT && showAllQuickDates) {
      setShowAllQuickDates(false);
    }
  }, [dailySlots, date, QUICK_SELECT_LIMIT, showAllQuickDates]);

  const selectedGroup = date ? dailySlots.find((group) => group.key === date) ?? null : null;
  const selectedDateLabel = date ? dayLabelFormatter.format(new Date(`${date}T12:00:00Z`)) : null;

  const derivedEnd = () => {
    if (!start) {
      return '';
    }
    const [hour, minute] = start.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return '';
    }
    const startDate = new Date(0, 0, 0, hour, minute);
    startDate.setMinutes(startDate.getMinutes() + sessionLengthMinutes);
    return `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    let startDate: Date;
    let endDate: Date;
    if (selectedSlot) {
      startDate = new Date(selectedSlot.start);
      endDate = new Date(selectedSlot.end);
    } else {
      if (!date || !start) {
        setError('Select a date and start time.');
        return;
      }
      const end = derivedEnd();
      if (!end) {
        setError('Unable to determine end time.');
        return;
      }
      startDate = new Date(`${date}T${start}:00Z`);
      endDate = new Date(`${date}T${end}:00Z`);
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      await onBook({
        start: startDate.getTime(),
        end: endDate.getTime(),
        location,
        videoLink: location === 'video' && videoLink ? videoLink : undefined,
      });
      setSuccess(true);
      setStart('');
      setVideoLink('');
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setPending(false);
    }
  };

  const formatSlot = (slot: { start: number; end: number }) =>
    `${timeFormatter.format(new Date(slot.start))} – ${timeFormatter.format(new Date(slot.end))}`;

  const handleSlotSelect = (slot: { start: number; end: number }) => {
    const slotDate = dayKeyFormatter.format(new Date(slot.start));
    setDate(slotDate);
    setSelectedSlot((previous) => {
      const isSame = previous?.start === slot.start && previous.end === slot.end;
      return isSame ? null : slot;
    });
    setStart('');
    setSuccess(false);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setStart('');
    setSelectedSlot(null);
    setSuccess(false);
  };

  const handleStartChange = (value: string) => {
    setStart(value);
    setSelectedSlot(null);
    setSuccess(false);
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
          </span>
          <span>Appointment requested.</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-medium text-slate-700">
            Pick a date
            <input
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={pending}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Select a day to view available times or choose your own.</p>
          <p className="mt-1 text-xs text-slate-500">Times shown in {timezone}.</p>
          {dailySlots.length ? (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick select</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(showAllQuickDates ? dailySlots : dailySlots.slice(0, QUICK_SELECT_LIMIT)).map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => handleDateChange(group.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      date === group.key
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                    disabled={pending}
                  >
                    {group.label}
                  </button>
                ))}
                {dailySlots.length > QUICK_SELECT_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setShowAllQuickDates((current) => !current)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    disabled={pending}
                  >
                    {showAllQuickDates ? 'Show fewer' : `+${dailySlots.length - QUICK_SELECT_LIMIT} more`}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-slate-500">No published availability yet.</p>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {selectedDateLabel ?? 'Select a date to view available slots'}
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{timezone}</span>
          </div>
          {selectedGroup?.slots.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedGroup.slots.map((slot, index) => {
                const slotKey = `${slot.start}-${slot.end}-${index}`;
                const isSelected = selectedSlot?.start === slot.start && selectedSlot.end === slot.end;
                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                    disabled={pending}
                  >
                    {formatSlot(slot)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {date ? 'No slots for this day. Enter a time request below.' : 'Pick a date to see available slots.'}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Request a different time</h3>
        <p className="mt-1 text-xs text-slate-500">
          We will send your therapist the selected date and start time even if there are no preset slots.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Start time
            <input
              type="time"
              value={start}
              onChange={(event) => handleStartChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={pending || !date}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Location
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value as 'video' | 'in-person')}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={pending}
            >
              <option value="video">Video</option>
              <option value="in-person">In-person</option>
            </select>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? 'Requesting…' : 'Request appointment'}
      </button>
    </div>
  );
}
