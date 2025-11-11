'use client';

import { ClipboardCheck, Users2, LogOut, Shield } from 'lucide-react';

interface AdminSidebarProps {
  adminName: string;
  onLogout: () => Promise<void>;
  signingOut: boolean;
  activeSection: 'pending' | 'all';
  onSelectSection: (section: 'pending' | 'all') => void;
}

const NAV_ITEMS = [
  { id: 'pending', label: 'Pending review', Icon: ClipboardCheck },
  { id: 'all', label: 'All therapists', Icon: Users2 },
];

export function AdminSidebar({ adminName, onLogout, signingOut, activeSection, onSelectSection }: AdminSidebarProps) {
  const initials = adminName
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'AD';

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 lg:w-72 md:flex-col border-r border-gray-200 bg-white">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lumora
                </span>
                <span className="text-sm text-gray-500">(Beta)</span>
              </div>
              <p className="text-sm font-bold text-gray-500 hidden sm:block">Light for the mind</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectSection(id as 'pending' | 'all')}
              className={`
                w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 border-l-4
                ${isActive
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-indigo-500'}`} />
                <span className="font-medium">{label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-gray-200 p-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold shadow-md">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Administrator</p>
              <p className="text-sm font-semibold text-slate-900">{adminName}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-indigo-700">
            Approve trusted clinicians to keep the Lumora network safe and effective.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void onLogout();
          }}
          disabled={signingOut}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </aside>
  );
}
