import React from 'react';
import { Github, Code2, Zap, GitBranch, Terminal, Bot, Shield, Cpu } from 'lucide-react';

const LandingPage = () => {
  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github';
  };

  const features = [
    { icon: <Bot className="w-5 h-5" />, title: 'AI Code Agent', desc: 'Generates, tests, and deploys code autonomously with real-time streaming.' },
    { icon: <Code2 className="w-5 h-5" />, title: 'Monaco Editor', desc: 'Full VS Code editing experience with IntelliSense and syntax highlighting.' },
    { icon: <GitBranch className="w-5 h-5" />, title: 'GitHub Integration', desc: 'Import repos, commit changes, and publish with GitHub Pages in one click.' },
    { icon: <Terminal className="w-5 h-5" />, title: 'Piston Execution', desc: 'Run and debug Node.js, Python, and 30+ languages via the Piston API.' },
    { icon: <Zap className="w-5 h-5" />, title: 'Instant Deploy', desc: 'Static sites auto-deployed to GitHub Pages. Dynamic apps guided to Render.' },
    { icon: <Shield className="w-5 h-5" />, title: 'Ephemeral Uploads', desc: 'Files auto-purged after 20–25 minutes. Zero storage bloat.' },
  ];

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-12
                    bg-omni-bg relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-30"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,212,255,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-omni-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-omni-purple/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl w-full">
        {/* Logo + badge */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-omni-accent to-omni-purple
                          flex items-center justify-center shadow-2xl shadow-omni-accent/30">
            <Code2 className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-omni-accent/10 border border-omni-accent/20 text-omni-accent text-xs font-medium mb-4">
          <Cpu className="w-3.5 h-3.5" />
          Powered by OMNI AI • mcode/mimo-auto
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
          Code Smarter with{' '}
          <span className="bg-gradient-to-r from-omni-accent to-omni-purple bg-clip-text text-transparent">
            OMNI IDE
          </span>
        </h1>

        <p className="text-omni-muted text-lg mb-8 max-w-lg mx-auto leading-relaxed">
          A premium AI-powered coding environment. Import repos, generate code, test with Piston,
          and deploy to GitHub Pages — all in one workspace.
        </p>

        {/* Sign In Button */}
        <div className="relative inline-block mb-3 glow-border rounded-xl">
          <button
            onClick={handleGitHubLogin}
            className="flex items-center gap-3 px-8 py-4 bg-omni-surface text-white font-semibold
                       text-base rounded-xl hover:bg-omni-panel transition-all duration-200
                       active:scale-95 border border-omni-border relative z-10"
          >
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </button>
        </div>

        <p className="text-omni-muted text-xs mb-10">
          Free • No credit card required • Requires GitHub account
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {features.map((f, i) => (
            <div key={i}
              className="omni-panel p-4 hover:border-omni-accent/40 transition-colors duration-200 group">
              <div className="text-omni-accent mb-2 group-hover:scale-110 transition-transform inline-block">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-omni-text mb-1">{f.title}</h3>
              <p className="text-xs text-omni-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-omni-dim text-xs">
          Built by{' '}
          <a href="https://wa.me/923114397148" target="_blank" rel="noopener noreferrer"
             className="text-omni-accent hover:underline">
            Mian Amir
          </a>
          {' '}• OMNI IDE v1.0.0
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
