"use client";

import { useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { MoodTracker } from './components/MoodTracker';
import { Resources } from './components/Resources';
import { Dashboard } from './components/Dashboard';
import { CrisisSupport } from './components/CrisisSupport';
import LandingPage from './components/LandingPage';

export type ViewType = 'chat' | 'mood' | 'resources' | 'dashboard' | 'crisis';

function CoreAppShell() {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface />;
      case 'mood':
        return <MoodTracker />;
      case 'resources':
        return <Resources onNavigateToCrisis={() => setCurrentView('crisis')} />;
      case 'dashboard':
        return <Dashboard />;
      case 'crisis':
        return <CrisisSupport />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} currentView={currentView} />

        <main className={`flex-1 ${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {renderContent()}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default function AppShell() {
  const [showLanding, setShowLanding] = useState(true);

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  return <CoreAppShell />;
}

export { CoreAppShell };
