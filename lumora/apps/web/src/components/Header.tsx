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
  journal: 'Daily Journal',
  resources: 'Resources & Tools',
  dashboard: 'Your Journey',
  crisis: 'Crisis Support',
};

export function Header({ onMenuClick, currentView }: HeaderProps) {
  const { profile, user, logout, guestMode } = useAuth();
  const { requestLogin } = useAuthUI();
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    profile?.displayName ||
    profile?.name ||
    user?.displayName ||
    user?.email ||
    (guestMode ? 'Guest session' : 'Lumora');

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
      </div>
    </header>
  );
}
