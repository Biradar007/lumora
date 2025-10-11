'use client';

import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { MoodTracker } from './components/MoodTracker';
import { Resources } from './components/Resources';
import { Dashboard } from './components/Dashboard';
import { CrisisSupport } from './components/CrisisSupport';
import { Journal } from './components/Journal';
import LandingPage from './components/LandingPage';
import { AuthGate } from './components/AuthGate';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export type ViewType = 'chat' | 'mood' | 'journal' | 'resources' | 'dashboard' | 'crisis';

function CoreAppShell() {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface />;
      case 'mood':
        return <MoodTracker />;
      case 'journal':
        return <Journal />;
      case 'resources':
        return <Resources onNavigateToCrisis={() => setCurrentView('crisis')} />;
      case 'dashboard':
        return <Dashboard />;
      case 'crisis':
        return <CrisisSupport onReturnToChat={() => setCurrentView('chat')} />;
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
  const { user, loading, profile } = useAuth();
  const wasAuthenticatedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (loading || showLanding) {
      return;
    }
    if (profile?.role === 'therapist') {
      router.replace('/therapist/dashboard');
    } else if (profile?.role === 'admin') {
      router.replace('/admin');
    }
  }, [loading, profile?.role, router, showLanding]);

  useEffect(() => {
    if (user) {
      wasAuthenticatedRef.current = true;
      return;
    }

    if (!loading && wasAuthenticatedRef.current) {
      setShowLanding(true);
      wasAuthenticatedRef.current = false;
    }
  }, [loading, user]);

  if (!loading && profile?.role === 'therapist') {
    const handleEnterTherapistApp = () => {
      router.replace('/therapist/dashboard');
    };
    if (showLanding) {
      return <LandingPage onEnterApp={handleEnterTherapistApp} />;
    }
    return null;
  }

  if (!loading && profile?.role === 'admin') {
    const handleEnterAdminApp = () => {
      router.replace('/admin');
    };
    if (showLanding) {
      return <LandingPage onEnterApp={handleEnterAdminApp} />;
    }
    return null;
  }

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  return (
    <AuthGate>
      <CoreAppShell />
    </AuthGate>
  );
}

export { CoreAppShell };
