import React from 'react';
import { useApp } from '../context/AppContext';
import { Code2, ChevronLeft, LogOut, Github, Zap, ZapOff } from 'lucide-react';

const Header = () => {
  const { user, aiStatus, view, setView, activeProject, logout } = useApp();

  return (
    <header className="flex items-center h-12 px-4 bg-omni-surface border-b border-omni-border
                        shrink-0 z-50 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-omni-accent to-omni-purple
                        flex items-center justify-center shadow-lg shadow-omni-accent/20">
          <Code2 className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-sm tracking-widest text-omni-text">
          OMNI<span className="text-omni-accent">IDE</span>
        </span>
      </div>

      {/* Breadcrumb */}
      {view === 'workspace' && activeProject && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setView('dashboard')}
            className="text-omni-muted hover:text-omni-accent transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Repos</span>
          </button>
          <span className="text-omni-dim">/</span>
          <span className="text-omni-text font-medium truncate max-w-48">
            {activeProject.repo || activeProject.name}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* AI Status Indicator */}
      <div className="flex items-center mr-4">
        {aiStatus.online ? (
          <div className="omni-status-live flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-omni-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-omni-green" />
            </span>
            <span className="font-semibold tracking-wide">🟢 OMNI LIVE</span>
            {aiStatus.latency && (
              <span className="opacity-60 text-xs">{aiStatus.latency}ms</span>
            )}
          </div>
        ) : (
          <div className="omni-status-offline flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-omni-red opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-omni-red" />
            </span>
            <span className="font-semibold">🔴 OMNI OFFLINE</span>
          </div>
        )}
      </div>

      {/* Offline Banner Message */}
      {!aiStatus.online && (
        <div className="hidden md:flex items-center gap-1.5 text-xs text-omni-red/80 mr-3
                        bg-omni-red/5 border border-omni-red/20 rounded-lg px-3 py-1.5">
          <ZapOff className="w-3 h-3 shrink-0" />
          <span>
            AI is offline. Contact Admin on{' '}
            <a
              href="https://wa.me/923114397148"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-omni-accent hover:text-omni-accentDark"
            >
              WhatsApp: +923114397148
            </a>
          </span>
        </div>
      )}

      {/* User menu */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-7 h-7 rounded-full border border-omni-border"
            />
            <span className="text-sm text-omni-muted hidden sm:block">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-omni-muted hover:text-omni-red hover:bg-omni-red/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
