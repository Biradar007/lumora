'use client';

import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { ViewType } from './user/viewTypes';

interface HeaderProps {
  onMenuClick: () => void;
  currentView: ViewType;
  showDirectoryShortcut?: boolean;
}

export function Header({ onMenuClick, currentView, showDirectoryShortcut = true }: HeaderProps) {
  const router = useRouter();

  const viewCopy: Partial<Record<ViewType, { title: string; subtitle?: string }>> = {
    resources: { title: 'Resources', subtitle: 'Guides, tips, and exercises.' },
    mood: { title: 'Mood tracker', subtitle: 'Daily check-ins and trends.' },
    journal: { title: 'Journal', subtitle: 'Reflect and capture what matters.' },
    dashboard: { title: 'Dashboard', subtitle: 'Your wellbeing at a glance.' },
    reports: { title: 'Reports', subtitle: 'Automatically generated mental health insights.' },
    crisis: { title: 'Crisis support', subtitle: 'Immediate help and safety tools.' },
  };

  const handleToggleConversations = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('lumora:toggle-mobile-conversations'));
  };

  const handleViewDirectory = () => {
    router.push('/resources/therapists');
  };

  const getViewLabel = () => {
    if (currentView === 'chat') {
      return (
        <div className="space-y-0.5">
          <h1 className="text-base font-semibold text-slate-900">Chat</h1>
          <p className="text-xs font-medium text-emerald-600">Online • Always here for you</p>
        </div>
      );
    }
    const copy = viewCopy[currentView];
    if (copy) {
      return (
        <div className="space-y-0.5">
          <h1 className="text-base font-semibold text-slate-900">{copy.title}</h1>
          {copy.subtitle ? <p className="text-xs text-slate-500">{copy.subtitle}</p> : null}
        </div>
      );
    }
    return (
      <div>
        <h1 className="text-base font-semibold text-slate-900">Lumora</h1>
      </div>
    );
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between md:hidden fixed top-0 inset-x-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        {getViewLabel()}
      </div>
      {currentView === 'chat' ? (
        <button
          type="button"
          onClick={handleToggleConversations}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50"
        >
          Conversations
        </button>
      ) : currentView === 'resources' && showDirectoryShortcut ? (
        <button
          type="button"
          onClick={handleViewDirectory}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50"
        >
          View directory
        </button>
      ) : null}
    </header>
  );
}
