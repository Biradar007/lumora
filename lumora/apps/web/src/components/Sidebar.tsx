import React from 'react';
import { MessageCircle, Heart, BookOpen, BarChart3, AlertCircle, X } from 'lucide-react';
import { ViewType } from '../AppShell';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'chat' as ViewType, label: 'Chat Support', icon: MessageCircle, color: 'text-blue-600' },
  { id: 'mood' as ViewType, label: 'Mood Tracker', icon: Heart, color: 'text-pink-600' },
  { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen, color: 'text-green-600' },
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: BarChart3, color: 'text-purple-600' },
  { id: 'crisis' as ViewType, label: 'Crisis Support', icon: AlertCircle, color: 'text-red-600' },
];

export function Sidebar({ currentView, setCurrentView, isOpen, onClose }: SidebarProps) {
  return (
    <>
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
            <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Emergency notice */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium mb-1">Emergency?</p>
              <p className="text-xs text-red-600">
                If you're in crisis, call 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
