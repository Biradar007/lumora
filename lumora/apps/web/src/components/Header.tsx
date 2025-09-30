import React from 'react';
import { Menu, Heart, Shield } from 'lucide-react';
import { ViewType } from '../AppShell';

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
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Lumora
            </h1>
            <p className="text-sm text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <h2 className="hidden sm:block text-lg font-semibold text-gray-800">
          {viewTitles[currentView]}
        </h2>
        
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Secure & Private</span>
          <span className="sm:hidden">Secure</span>
        </div>
      </div>
    </header>
  );
}
