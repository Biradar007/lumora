'use client';

import { useState } from 'react';
import type { TherapistProfile } from '@/types/domain';

type AvailabilitySlot = TherapistProfile['availability'][number];

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityGridProps {
  value: AvailabilitySlot[];
  onChange: (value: AvailabilitySlot[]) => void;
}

export function AvailabilityGrid({ value, onChange }: AvailabilityGridProps) {
  const [draft, setDraft] = useState<AvailabilitySlot>({ day: 0, start: '09:00', end: '17:00' });

  const updateDraft = (partial: Partial<AvailabilitySlot>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const handleAdd = () => {
    if (!draft.start || !draft.end) {
      return;
    }
    onChange([...value, draft]);
    setDraft({ day: 0, start: '09:00', end: '17:00' });
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Day
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
            value={draft.day}
            onChange={(event) => updateDraft({ day: Number(event.target.value) })}
          >
            {dayLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Start
          <input
            type="time"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={draft.start}
            onChange={(event) => updateDraft({ start: event.target.value })}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          End
          <input
            type="time"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            value={draft.end}
            onChange={(event) => updateDraft({ end: event.target.value })}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Add availability
      </button>
      <ul className="space-y-2">
        {value.length === 0 && <li className="text-sm text-slate-500">No availability added yet.</li>}
        {value.map((slot, index) => (
          <li key={`${slot.day}-${slot.start}-${slot.end}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-700">
              {dayLabels[slot.day]} {slot.start} – {slot.end}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
