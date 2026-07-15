import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import axios from 'axios';
import { Play, Square, Trash2, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const LANGUAGE_DETECT = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', cpp: 'cpp', c: 'c', php: 'php', sh: 'bash',
};

const Terminal = forwardRef(({ output, project, files, writeTerminal }, ref) => {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [xtermReady, setXtermReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [cmd, setCmd] = useState('');
  const { activeFile } = useApp();

  useImperativeHandle(ref, () => ({
    writeLine: (text) => {
      if (termRef.current) {
        termRef.current.writeln(text);
      }
    },
    clear: () => {
      if (termRef.current) termRef.current.clear();
    },
  }));

  useEffect(() => {
    let term, fitAddon, webLinksAddon;

    const initXterm = async () => {
      try {
        const { Terminal: XTerm } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');
        await import('@xterm/xterm/css/xterm.css');

        term = new XTerm({
          theme: {
            background: '#0a0e1a',
            foreground: '#e2e8f0',
            cursor: '#00d4ff',
            cursorAccent: '#0a0e1a',
            black: '#0a0e1a',
            red: '#ff4757',
            green: '#00ff88',
            yellow: '#ffd32a',
            blue: '#00d4ff',
            magenta: '#7c3aed',
            cyan: '#00d4ff',
            white: '#e2e8f0',
            brightBlack: '#334155',
            brightRed: '#ff6b7a',
            brightGreen: '#33ff9d',
            brightYellow: '#ffdd57',
            brightBlue: '#33ddff',
            brightMagenta: '#9d5dff',
            brightCyan: '#33ddff',
            brightWhite: '#f8fafc',
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
          lineHeight: 1.5,
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 1000,
          convertEol: true,
        });

        fitAddon = new FitAddon();
        webLinksAddon = new WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        if (containerRef.current) {
          term.open(containerRef.current);
          fitAddon.fit();
          termRef.current = term;
          fitAddonRef.current = fitAddon;
          setXtermReady(true);

          term.writeln('\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
          term.writeln('\x1b[36m║        OMNI IDE Terminal v1.0        ║\x1b[0m');
          term.writeln('\x1b[36m╚══════════════════════════════════════╝\x1b[0m');
          term.writeln('\x1b[90mPowered by Piston API • Type a command or run code\x1b[0m');
          term.writeln('');
        }
      } catch (err) {
        console.warn('xterm.js not available, using fallback terminal');
        setXtermReady(false);
      }
    };

    initXterm();

    const handleResize = () => { if (fitAddonRef.current) fitAddonRef.current.fit(); };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (term) term.dispose();
    };
  }, []);

  // Write new output lines to xterm
  useEffect(() => {
    if (!termRef.current || !xtermReady || output.length === 0) return;
    const last = output[output.length - 1];
    if (!last) return;
    const prefix = last.type === 'error' ? '\x1b[31m' : last.type === 'success' ? '\x1b[32m' : '\x1b[36m';
    termRef.current.writeln(`${prefix}${last.text}\x1b[0m`);
  }, [output, xtermReady]);

  const detectLanguage = (filename) => {
    if (!filename) return null;
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return LANGUAGE_DETECT[ext] || null;
  };

  const runActiveFile = async () => {
    if (!activeFile || running) return;
    const fileData = files[activeFile];
    if (!fileData?.content) return;

    const language = detectLanguage(activeFile);
    if (!language) {
      writeTerminal(`[RUN] Cannot execute ${activeFile} — unsupported language`, 'error');
      return;
    }

    setRunning(true);
    writeTerminal(`[RUN] Executing ${activeFile} via Piston API...`, 'info');
    if (termRef.current) {
      termRef.current.writeln(`\x1b[33m$ Running: ${activeFile}\x1b[0m`);
    }

    try {
      const { data } = await axios.post('/api/piston/execute', {
        language,
        code: fileData.content,
      });

      if (termRef.current) {
        if (data.stdout) {
          data.stdout.split('\n').forEach(line => {
            termRef.current.writeln(`\x1b[37m${line}\x1b[0m`);
          });
        }
        if (data.stderr) {
          data.stderr.split('\n').forEach(line => {
            termRef.current.writeln(`\x1b[31m${line}\x1b[0m`);
          });
        }
        const exitColor = data.exitCode === 0 ? '\x1b[32m' : '\x1b[31m';
        termRef.current.writeln(`${exitColor}[Exit: ${data.exitCode}]\x1b[0m`);
      }

      if (data.exitCode === 0) {
        writeTerminal(`[RUN] ✅ ${activeFile} executed successfully`, 'success');
      } else {
        writeTerminal(`[RUN] ❌ ${activeFile} exited with code ${data.exitCode}`, 'error');
      }
    } catch (err) {
      writeTerminal(`[RUN] ❌ ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const runCustomCmd = async () => {
    if (!cmd.trim() || running) return;
    const trimmed = cmd.trim();
    setCmd('');
    writeTerminal(`> ${trimmed}`, 'info');
    if (termRef.current) termRef.current.writeln(`\x1b[90m$ ${trimmed}\x1b[0m`);

    // Parse: run <lang> <code>
    const runMatch = trimmed.match(/^run\s+(\w+)\s+([\s\S]+)$/);
    if (runMatch) {
      setRunning(true);
      try {
        const { data } = await axios.post('/api/piston/execute', {
          language: runMatch[1],
          code: runMatch[2],
        });
        if (termRef.current) {
          if (data.stdout) termRef.current.writeln(data.stdout);
          if (data.stderr) termRef.current.writeln(`\x1b[31m${data.stderr}\x1b[0m`);
        }
      } catch (err) {
        writeTerminal(err.message, 'error');
      } finally {
        setRunning(false);
      }
    } else if (trimmed === 'clear') {
      if (termRef.current) termRef.current.clear();
    } else {
      writeTerminal(`Unknown command: ${trimmed}. Try: run python print("hello")`, 'error');
    }
  };

  const clearTerminal = () => {
    if (termRef.current) termRef.current.clear();
  };

  const canRun = activeFile && detectLanguage(activeFile) && files[activeFile]?.content;

  return (
    <div className="h-full flex flex-col bg-omni-bg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-omni-surface border-b border-omni-border shrink-0">
        {canRun && (
          <button
            onClick={runActiveFile}
            disabled={running}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg font-medium transition-colors
              ${running
                ? 'bg-omni-dim text-omni-muted cursor-not-allowed'
                : 'bg-omni-green/15 text-omni-green border border-omni-green/30 hover:bg-omni-green/25'}`}
          >
            {running ? (
              <><Square className="w-3 h-3" /> Running...</>
            ) : (
              <><Play className="w-3 h-3" /> Run {activeFile?.split('/').pop()}</>
            )}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={clearTerminal} className="p-1 rounded text-omni-muted hover:text-omni-text transition-colors" title="Clear">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* xterm container */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-1" />

      {/* Fallback output if xterm fails */}
      {!xtermReady && (
        <div className="flex-1 overflow-y-auto custom-scroll p-3 font-mono text-xs">
          {output.map((line, i) => (
            <div key={i} className={
              line.type === 'error' ? 'text-omni-red' :
              line.type === 'success' ? 'text-omni-green' : 'text-omni-accent'
            }>
              {line.text}
            </div>
          ))}
        </div>
      )}

      {/* Command input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-omni-border bg-omni-surface shrink-0">
        <ChevronRight className="w-3.5 h-3.5 text-omni-accent shrink-0" />
        <input
          type="text"
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runCustomCmd()}
          placeholder='run javascript console.log("hello") | clear'
          className="flex-1 bg-transparent text-xs text-omni-text placeholder-omni-dim outline-none font-mono"
        />
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';
export default Terminal;
