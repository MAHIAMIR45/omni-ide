import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import RepoDashboard from './components/RepoDashboard';
import Workspace from './components/Workspace';

const AppContent = () => {
  const { view, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-omni-bg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-omni-accent/10 border border-omni-accent/30
                          flex items-center justify-center animate-pulse-slow">
            <svg className="w-8 h-8 text-omni-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <p className="text-omni-muted text-sm font-mono">Initializing OMNI IDE...</p>
        </div>
      </div>
    );
  }

  if (view === 'workspace') {
    return (
      <div className="flex flex-col h-full bg-omni-bg">
        <Header />
        <Workspace />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-omni-bg">
      <Header />
      <main className="flex-1 overflow-auto">
        {view === 'landing' ? <LandingPage /> : <RepoDashboard />}
      </main>
    </div>
  );
};

const App = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
