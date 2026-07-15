import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useApp } from '../context/AppContext';
import { X, Circle } from 'lucide-react';

// Configure Monaco to load locally
loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs' },
});

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
  yml: 'yaml', yaml: 'yaml', sh: 'shell', bash: 'shell', rs: 'rust',
  go: 'go', java: 'java', cpp: 'cpp', c: 'c', rb: 'ruby', php: 'php',
  swift: 'swift', kt: 'kotlin', cs: 'csharp', sql: 'sql', xml: 'xml',
  txt: 'plaintext', gitignore: 'plaintext', env: 'plaintext',
};

const getLanguage = (filename) => {
  if (!filename) return 'plaintext';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
};

const OMNI_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword', foreground: '00d4ff', fontStyle: 'bold' },
    { token: 'string', foreground: '00ff88' },
    { token: 'number', foreground: 'ffd32a' },
    { token: 'type', foreground: 'a78bfa' },
    { token: 'function', foreground: '60a5fa' },
    { token: 'variable', foreground: 'e2e8f0' },
  ],
  colors: {
    'editor.background': '#0f1525',
    'editor.foreground': '#e2e8f0',
    'editor.lineHighlightBackground': '#1e2d4520',
    'editor.selectionBackground': '#00d4ff25',
    'editor.findMatchBackground': '#ffd32a30',
    'editorLineNumber.foreground': '#334155',
    'editorLineNumber.activeForeground': '#00d4ff',
    'editorCursor.foreground': '#00d4ff',
    'editorGutter.background': '#0f1525',
    'editorWidget.background': '#111827',
    'editorWidget.border': '#1e2d45',
    'input.background': '#0a0e1a',
    'input.border': '#1e2d45',
    'scrollbarSlider.background': '#1e2d4580',
    'scrollbarSlider.hoverBackground': '#00d4ff30',
    'editorIndentGuide.background1': '#1e2d4540',
    'editorBracketMatch.background': '#00d4ff20',
    'editorBracketMatch.border': '#00d4ff',
    'titleBar.activeBackground': '#0f1525',
    'sideBar.background': '#0f1525',
    'activityBar.background': '#0a0e1a',
    'statusBar.background': '#0a0e1a',
  },
};

const CodeEditor = () => {
  const { files, activeFile, updateFile, setActiveFile } = useApp();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const openFiles = Object.entries(files)
    .filter(([, v]) => v.content !== undefined)
    .map(([path]) => path);

  const currentContent = activeFile ? (files[activeFile]?.content ?? '') : '';
  const language = getLanguage(activeFile || '');

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register theme
    monaco.editor.defineTheme('omni-dark', OMNI_THEME);
    monaco.editor.setTheme('omni-dark');

    // Configure editor options
    editor.updateOptions({
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.7,
      padding: { top: 12, bottom: 12 },
      smoothScrolling: true,
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      scrollBeyondLastLine: false,
      suggest: { preview: true, showStatusBar: true },
      quickSuggestions: { other: true, comments: false, strings: true },
      parameterHints: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'full',
      folding: true,
      foldingHighlight: true,
      renderLineHighlight: 'gutter',
      occurrencesHighlight: 'singleFile',
      links: true,
      colorDecorators: true,
    });

    // Save with Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save notification (file is already tracked in state)
      const action = editor.getAction('editor.action.formatDocument');
      if (action) action.run();
    });
  }, []);

  const handleChange = useCallback((value) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile, value);
    }
  }, [activeFile, updateFile]);

  const closeTab = (e, path) => {
    e.stopPropagation();
    const idx = openFiles.indexOf(path);
    if (activeFile === path) {
      const next = openFiles[idx + 1] || openFiles[idx - 1] || null;
      setActiveFile(next);
    }
  };

  if (!activeFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-omni-bg text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-omni-accent/5 border border-omni-accent/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-omni-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
          </svg>
        </div>
        <p className="text-omni-muted text-sm">Select a file from the explorer<br />or ask the AI to create one</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-omni-bg overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-end h-8 bg-omni-surface border-b border-omni-border shrink-0 overflow-x-auto custom-scroll">
        {openFiles.map(path => {
          const name = path.split('/').pop();
          const isActive = path === activeFile;
          const isModified = files[path]?.modified;
          return (
            <div
              key={path}
              onClick={() => setActiveFile(path)}
              className={`flex items-center gap-1.5 px-3 h-full border-r border-omni-border cursor-pointer
                          whitespace-nowrap text-xs transition-colors shrink-0 min-w-0 max-w-48 group
                          ${isActive
                  ? 'bg-omni-bg text-omni-text border-t-2 border-t-omni-accent'
                  : 'text-omni-muted hover:text-omni-text hover:bg-omni-bg/50'}`}
            >
              <span className="truncate">{name}</span>
              {isModified ? (
                <Circle className="w-2 h-2 text-omni-accent fill-omni-accent shrink-0" />
              ) : (
                <button
                  onClick={(e) => closeTab(e, path)}
                  className="opacity-0 group-hover:opacity-100 hover:text-omni-red transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={activeFile}
          value={currentContent}
          language={language}
          theme="omni-dark"
          onChange={handleChange}
          onMount={handleMount}
          options={{
            automaticLayout: true,
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
          }}
          loading={
            <div className="h-full flex items-center justify-center bg-omni-bg">
              <div className="text-omni-muted text-xs font-mono animate-pulse">Loading editor...</div>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default CodeEditor;
