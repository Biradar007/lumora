'use client';

import { useState } from 'react';

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
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [location, setLocation] = useState<'video' | 'in-person'>('video');
  const [videoLink, setVideoLink] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: number; end: number } | null>(null);

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
      setDate('');
      setStart('');
      setVideoLink('');
      setSelectedSlot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setPending(false);
    }
  };

  const formatSlot = (slot: { start: number; end: number }) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${formatter.format(new Date(slot.start))} – ${formatter.format(new Date(slot.end))}`;
  };

  const handleSlotSelect = (slot: { start: number; end: number }) => {
    setSelectedSlot(slot);
    setDate('');
    setStart('');
    setSuccess(false);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Appointment requested.</p>}
      {availableSlots.length ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Available slots ({timezone})</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableSlots.map((slot, index) => {
              const key = `${slot.start}-${slot.end}-${index}`;
              const isSelected = selectedSlot?.start === slot.start && selectedSlot.end === slot.end;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSlotSelect(slot)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                  disabled={pending}
                >
                  {formatSlot(slot)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Can’t find a fit? Pick a custom time below and we’ll send it as a request.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            disabled={pending}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Start time
          <input
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            disabled={pending}
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
        {location === 'video' && (
          <label className="text-sm font-medium text-slate-700">
            Video link (optional)
            <input
              type="url"
              value={videoLink}
              onChange={(event) => setVideoLink(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={pending}
            />
          </label>
        )}
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
