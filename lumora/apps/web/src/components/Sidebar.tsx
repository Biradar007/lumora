import React from 'react';
import Image from 'next/image';
import { MessageCircle, Heart, BookOpen, BarChart3, AlertCircle, X } from 'lucide-react';
import { ViewType } from '../AppShell';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'chat' as ViewType, label: 'Chat Support', icon: MessageCircle, color: 'text-blue-600', preview: false },
  { id: 'mood' as ViewType, label: 'Mood Tracker', icon: Heart, color: 'text-pink-600', preview: true },
  { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen, color: 'text-green-600', preview: true },
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: BarChart3, color: 'text-purple-600', preview: true },
  { id: 'crisis' as ViewType, label: 'Crisis Support', icon: AlertCircle, color: 'text-red-600', preview: false },
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
           {/* Header */}
      {/* <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/Logo1.png"
            alt="Lumora logo"
            width={40}
            height={40}
            className="object-cover rounded-full"
            priority
          />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Lumora
            </h1>
            <p className="text-sm text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
        </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div> */}

      <div className="p-6 border-b border-gray-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {/* Gradient Circle instead of Image */}
      <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Lumora
              </h1>
                <span className="text-sm text-gray-500">(Beta)</span>
            </div>
            <p className="text-sm font-bold text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
    </div>
    <button
      onClick={onClose}
      className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Close menu"
    >
      <X className="w-5 h-5 text-gray-500" />
    </button>
  </div>
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
                    w-full flex items-center justify-between gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }
                  `}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {item.preview && (
                    <span className="rounded-full border border-serene-200 bg-serene-50 px-2 py-0.5 text-xs font-semibold text-serene-600">
                      Preview
                    </span>
                  )}
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
