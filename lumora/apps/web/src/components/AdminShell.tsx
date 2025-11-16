'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const [signingOut, setSigningOut] = useState(false);
  const [activeSection, setActiveSectionState] = useState<AdminSection>(() => {
    const sectionParam = searchParams.get('section');
    return sectionParam === 'all' ? 'all' : 'pending';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    const sectionParam = searchParams.get('section');
    const nextSection = sectionParam === 'all' ? 'all' : 'pending';
    setActiveSectionState(nextSection);
  }, [searchParams]);

  const handleSectionChange = (section: AdminSection) => {
    setActiveSectionState(section);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    const queryString = params.toString();
    router.replace(queryString ? `/admin?${queryString}` : '/admin', { scroll: false });
  };

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
    <AdminSectionContext.Provider value={{ activeSection, setActiveSection: handleSectionChange }}>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar
          adminName={adminName}
          onLogout={handleLogout}
          signingOut={signingOut}
          activeSection={activeSection}
          onSelectSection={handleSectionChange}
        />
        <div className="flex h-screen flex-col transition-[margin] duration-300 ease-in-out md:ml-64 lg:ml-72">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur fixed inset-x-0 top-0 z-40 md:static">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="border-slate-200 p-2 text-slate-600 md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <p className="text-xl font-semibold uppercase tracking-wide text-slate-500 sm:text-2xl">
                  Moderator workspace
                </p>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-4 py-6 pt-20 sm:px-6 md:pt-0">{children}</main>
        </div>
        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-full bg-white shadow-2xl transition-transform md:hidden">
              <AdminSidebar
                adminName={adminName}
                onLogout={async () => {
                  await handleLogout();
                  setSidebarOpen(false);
                }}
                signingOut={signingOut}
                activeSection={activeSection}
                onSelectSection={(section) => {
                  handleSectionChange(section);
                  setSidebarOpen(false);
                }}
                variant="mobile"
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        ) : null}
      </div>
    </AdminSectionContext.Provider>
  );
}
