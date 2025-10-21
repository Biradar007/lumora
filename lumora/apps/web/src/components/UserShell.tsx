'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthGate } from './AuthGate';
import { VIEW_TO_PATH, type ViewType } from './user/viewTypes';

interface UserShellProps {
  activeView: ViewType;
  children: ReactNode;
}

export function UserShell({ activeView, children }: UserShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = useCallback(
    (view: ViewType) => {
      const target = VIEW_TO_PATH[view] ?? VIEW_TO_PATH.chat;
      router.push(target);
    },
    [router]
  );

  const navigateAndClose = useCallback(
    (view: ViewType) => {
      handleNavigate(view);
      setSidebarOpen(false);
    },
    [handleNavigate]
  );

  return (
    <AuthGate>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Sidebar
          activeView={activeView}
          onNavigate={navigateAndClose}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex h-screen flex-col transition-[margin] duration-300 ease-in-out md:ml-64 lg:ml-72">
          <Header onMenuClick={() => setSidebarOpen(true)} currentView={activeView} />

          <main className={`flex-1 ${activeView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>{children}</main>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </AuthGate>
  );
}
