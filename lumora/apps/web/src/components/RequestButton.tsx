'use client';

import { useState } from 'react';
import type { RequestStatus } from '@/types/domain';

interface RequestButtonProps {
  status: RequestStatus | 'AVAILABLE' | 'CONNECTED';
  onRequest: () => Promise<void>;
}

export function RequestButton({ status, onRequest }: RequestButtonProps) {
  const [pending, setPending] = useState(false);
  const disabled = pending || status !== 'AVAILABLE';

  const labelMap: Record<RequestStatus | 'AVAILABLE' | 'CONNECTED', string> = {
    AVAILABLE: 'Request connection',
    PENDING: 'Requested',
    ACCEPTED: 'Connected',
    DECLINED: 'Request declined',
    EXPIRED: 'Request expired',
    CONNECTED: 'Connected',
  };

  const toneMap: Record<RequestStatus | 'AVAILABLE' | 'CONNECTED', string> = {
    AVAILABLE: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    PENDING: 'bg-slate-200 text-slate-600',
    ACCEPTED: 'bg-emerald-500 text-white',
    DECLINED: 'bg-rose-100 text-rose-700',
    EXPIRED: 'bg-amber-100 text-amber-700',
    CONNECTED: 'bg-emerald-500 text-white',
  };

  const handleClick = async () => {
    if (disabled) {
      return;
    }
    setPending(true);
    try {
      await onRequest();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex w-full sm:w-auto sm:min-w-[180px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition text-center disabled:cursor-not-allowed disabled:opacity-80 ${toneMap[status]}`}
    >
      {pending ? 'Sending…' : labelMap[status]}
    </button>
  );
}
