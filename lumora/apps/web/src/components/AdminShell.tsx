'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';

type AdminSection = 'pending' | 'all';

interface AdminShellProps {
  children: ReactNode;
}

interface AdminSectionContextValue {
  activeSection: AdminSection;
  setActiveSection: (section: AdminSection) => void;
}

const AdminSectionContext = createContext<AdminSectionContextValue | null>(null);

export function useAdminSection(): AdminSectionContextValue {
  const ctx = useContext(AdminSectionContext);
  if (!ctx) {
    throw new Error('useAdminSection must be used within an AdminShell');
  }
  return ctx;
}

export function AdminShell({ children }: AdminShellProps) {
  const { profile, loading, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('pending');

  useEffect(() => {
    if (loading) {
      return;
    }
    if (profile?.role !== 'admin') {
      if (profile?.role === 'therapist') {
        router.replace('/therapist/dashboard');
      } else {
        router.replace('/home');
      }
    }
  }, [loading, profile?.role, router]);

  const adminName = useMemo(
    () => profile?.displayName ?? profile?.name ?? profile?.email ?? 'Admin workspace',
    [profile?.displayName, profile?.email, profile?.name]
  );

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading || profile?.role !== 'admin') {
    return null;
  }

  return (
    <AdminSectionContext.Provider value={{ activeSection, setActiveSection }}>
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">
          <AdminSidebar
            adminName={adminName}
            onLogout={handleLogout}
            signingOut={signingOut}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
          <div className="flex flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-3xl font-semibold uppercase tracking-wide text-slate-500">Moderator workspace</p>
                </div>
                <div className="flex gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveSection('pending')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      activeSection === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('all')}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      activeSection === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All therapists
                  </button>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
          </div>
        </div>
      </div>
    </AdminSectionContext.Provider>
  );
}
