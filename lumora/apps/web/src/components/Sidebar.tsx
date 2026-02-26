'use client';

import { MessageCircle, Heart, BookOpen, BarChart3, AlertCircle, PenSquare, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthUI } from '@/contexts/AuthUIContext';
import type { ViewType } from './user/viewTypes';
import { UserProfileMenu } from './UserProfileMenu';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    id: 'chat' as ViewType,
    label: 'Chat Support',
    icon: MessageCircle,
    color: 'text-blue-600',
    preview: false,
    requiresAuth: false,
  },
  {
    id: 'mood' as ViewType,
    label: 'Mood Tracker',
    icon: Heart,
    color: 'text-pink-600',
    preview: false,
    requiresAuth: true,
  },
  {
    id: 'journal' as ViewType,
    label: 'Journal',
    icon: PenSquare,
    color: 'text-amber-600',
    preview: false,
    requiresAuth: true,
  },
  {
    id: 'resources' as ViewType,
    label: 'Resources',
    icon: BookOpen,
    color: 'text-green-600',
    preview: true,
    requiresAuth: true,
  },
  {
    id: 'dashboard' as ViewType,
    label: 'Dashboard',
    icon: BarChart3,
    color: 'text-purple-600',
    preview: false,
    requiresAuth: true,
  },
  {
    id: 'crisis' as ViewType,
    label: 'Crisis Support',
    icon: AlertCircle,
    color: 'text-red-600',
    preview: false,
    requiresAuth: false,
  },
];

export function Sidebar({ activeView, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const { requestLogin } = useAuthUI();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-full w-[280px] bg-white
          border-r border-border shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          sm:w-64 md:translate-x-0 md:shadow-none lg:w-72 xl:w-80
        `}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5 border-b border-border bg-gradient-to-b from-background to-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
<div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
<h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Lumora
                    </h1>
                    {/* <span className="text-xs sm:text-sm text-muted-foreground font-medium">(Beta)</span> */}
                  </div>
                  {/* <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">Light for the mind</p> */}
                </div>
              </div>

              <button
                onClick={onClose}
                className="md:hidden flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 sm:px-4 lg:px-5 lg:py-5 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isDisabled = !isAuthenticated && item.requiresAuth;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      requestLogin();
                      return;
                    }
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`
                    group w-full flex items-center justify-between gap-2.5 px-3 py-2.5 sm:py-3 text-left rounded-xl
                    transition-all duration-200 text-sm sm:text-base
                    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02] active:scale-[0.98]'}
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 shadow-sm'
                        : 'hover:bg-muted/50'
                    }
                  `}
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : 0}
                  title={isDisabled ? 'Log in to view this module' : undefined}
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <Icon
                      className={`h-5 w-5 flex-shrink-0 transition-colors ${
                        isDisabled
                          ? 'text-muted-foreground/50'
                          : isActive
                            ? 'text-blue-600'
                            : `${item.color} group-hover:scale-110 transition-transform`
                      }`}
                    />
                    <span className={`font-medium truncate ${isActive ? 'text-blue-700' : 'text-foreground'}`}>
                      {item.label}
                    </span>
                  </span>
                  {item.preview && (
                    <span className="flex-shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                      Preview
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 border-t border-border space-y-3 bg-gradient-to-t from-muted/20 to-background">
            <UserProfileMenu />

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-3.5 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-red-800 font-semibold mb-1">Emergency?</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    If you&apos;re in crisis, call <span className="font-bold">988</span> (Suicide & Crisis Lifeline) or
                    go to your nearest emergency room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
