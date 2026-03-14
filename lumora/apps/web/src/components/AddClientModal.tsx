'use client';

import { useEffect, useState } from 'react';
import type { ClientRecord, Connection } from '@/types/domain';
import { useApiHeaders } from '@/hooks/useApiHeaders';

export interface AddClientResult {
  client: ClientRecord;
  connection: Connection;
  invite: {
    requested: boolean;
    status: 'sent' | 'skipped' | 'failed';
  };
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: AddClientResult) => void | Promise<void>;
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

export function AddClientModal({ isOpen, onClose, onCreated }: AddClientModalProps) {
  const headers = useApiHeaders();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      return 'First name is required.';
    }
    if (form.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(form.email.trim().toLowerCase())) {
        return 'Enter a valid email address or leave it blank.';
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/therapist/clients', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as AddClientResult & { error?: string };
      if (!response.ok) {
        const message =
          payload.error === 'client_already_connected'
            ? 'This client is already connected to you.'
            : payload.error === 'invalid_email'
              ? 'Enter a valid email address or leave it blank.'
              : payload.error === 'first_name_required'
                ? 'First name is required.'
                : 'Unable to add this client right now.';
        throw new Error(message);
      }
      await onCreated(payload);
      setForm(EMPTY_FORM);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add this client right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Add client</h2>
            <p className="text-sm text-slate-600">
              Create the client record now. If you add an email, Lumora will send an invite automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">First name</span>
              <input
                value={form.firstName}
                onChange={(event) => handleChange('firstName', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                placeholder="First name"
                maxLength={80}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Last name</span>
              <input
                value={form.lastName}
                onChange={(event) => handleChange('lastName', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                placeholder="Last name"
                maxLength={80}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                placeholder="name@example.com"
                maxLength={320}
              />
              <span className="block text-xs text-slate-500">Optional for now. If included, Lumora sends an invite.</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                placeholder="Phone number"
                maxLength={40}
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
              placeholder="Optional context for your internal client list"
              maxLength={2000}
            />
          </label>

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Adding client…' : 'Add client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
