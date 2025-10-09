'use client';

import { useState } from 'react';
import { Menu, LogIn, LogOut } from 'lucide-react';
import { ViewType } from '../AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthUI } from '@/contexts/AuthUIContext';

interface HeaderProps {
  onMenuClick: () => void;
  currentView: ViewType;
}

const viewTitles: Record<ViewType, string> = {
  chat: 'Chat with Lumora',
  mood: 'Mood Tracking',
  resources: 'Resources & Tools',
  dashboard: 'Your Journey',
  crisis: 'Crisis Support'
};

export function Header({ onMenuClick, currentView }: HeaderProps) {
  const { profile, user, logout, guestMode } = useAuth();
  const { requestLogin } = useAuthUI();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile?.name || user?.displayName || user?.email || (guestMode ? 'Guest session' : 'Lumora');

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between md:hidden">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        
        {/* <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Lumora
            </h1>
            <p className="text-sm text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
        </div> */}
      </div>
      <div className="flex items-center gap-4">
        <h2 className="hidden sm:block text-left text-lg font-semibold text-gray-800">
          {viewTitles[currentView]}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">{displayName}</span>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {signingOut ? '...' : 'Log out'}
            </button>
          ) : (
            <button
              type="button"
              onClick={requestLogin}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
