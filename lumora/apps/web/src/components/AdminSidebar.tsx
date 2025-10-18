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
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 lg:w-72 md:flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Lumora
              </span>
              <span className="text-xs font-semibold text-slate-500">(Beta)</span>
            </div>
            <p className="text-sm font-bold text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectSection(id as 'pending' | 'all')}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              activeSection === id ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className={`h-5 w-5 ${activeSection === id ? 'text-indigo-600' : 'text-indigo-500'}`} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-4 border-t border-slate-200 px-6 py-6">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Signed in as</p>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </aside>
  );
}
