'use client';

export type ViewType = 'chat' | 'mood' | 'journal' | 'resources' | 'dashboard' | 'reports' | 'crisis';

export const VALID_VIEWS: readonly ViewType[] = ['chat', 'mood', 'journal', 'resources', 'dashboard', 'reports', 'crisis'];

export const VIEW_TO_PATH: Record<ViewType, string> = {
  chat: '/user/chat',
  mood: '/user/mood',
  journal: '/user/journal',
  resources: '/user/resources',
  dashboard: '/user/dashboard',
  reports: '/user/reports',
  crisis: '/user/crisis',
};

export function isValidView(value: string): value is ViewType {
  return VALID_VIEWS.includes(value as ViewType);
}
