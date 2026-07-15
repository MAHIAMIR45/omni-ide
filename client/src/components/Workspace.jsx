import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';
import Terminal from './Terminal';
import Preview from './Preview';
import AIChat from './AIChat';
import {
  FolderOpen, Code2, TerminalSquare, Bot,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Terminal as TerminalIcon, Eye, GitCommit, ExternalLink,
  GitBranch, Loader2, CheckCircle, AlertCircle, ChevronLeft,
} from 'lucide-react';

const MIN_PANEL = 200;

const useWindowWidth = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};

const Workspace = () => {
  const { activeProject, files, setFiles, activeFile, setActiveFile, setFileTree, setActiveProject } = useApp();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  // Desktop panel state
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(360);
  const [bottomTab, setBottomTab] = useState('terminal');
  const [bottomHeight, setBottomHeight] = useState(200);

  // Mobile tab: 'files' | 'editor' | 'terminal' | 'ai'
  const [mobileTab, setMobileTab] = useState('editor');

  // Shared state
  const [loadingTree, setLoadingTree] = useState(false);
  const [commitStatus, setCommitStatus] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [showCommitBar, setShowCommitBar] = useState(false);
  const [pagesUrl, setPagesUrl] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (activeProject) {
      if (activeProject.type === 'import') loadRepoTree();
      else if (activeProject.initialFiles) {
        setFiles(activeProject.initialFiles);
        const paths = Object.keys(activeProject.initialFiles);
        if (paths.length > 0) setActiveFile(paths[0]);
      }
    }
  }, [activeProject?.fullName]);

  const loadRepoTree = async () => {
    setLoadingTree(true);
    try {
      const { data } = await axios.get(
        `/api/github/repos/${activeProject.owner}/${activeProject.repo}/tree`
      );
      const treeItems = data.tree.filter(item => item.type === 'blob');
      setFileTree(treeItems.map(i => i.path));
      const autoOpen = treeItems.find(i =>
        /^(README\.md|index\.(html|js|ts|jsx|tsx|py))$/i.test(i.path)
      );
      if (autoOpen) loadFileContent(autoOpen.path);
    } catch (err) {
      writeTerminal(`[ERROR] Failed to load repo: ${err.message}`, 'error');
    } finally {
      setLoadingTree(false);
    }
  };

  const loadFileContent = async (filePath) => {
    if (files[filePath]?.content !== undefined) {
      setActiveFile(filePath);
      if (isMobile) setMobileTab('editor');
      return;
    }
    try {
      const { data } = await axios.get(
        `/api/github/repos/${activeProject.owner}/${activeProject.repo}/contents/${filePath}`
      );
      setFiles(prev => ({
        ...prev,
        [filePath]: { content: data.content, sha: data.sha, modified: false },
      }));
      setActiveFile(filePath);
      if (isMobile) setMobileTab('editor');
    } catch (err) {
      writeTerminal(`[ERROR] Failed to load file: ${err.message}`, 'error');
    }
  };

  const writeTerminal = useCallback((text, type = 'info') => {
    setTerminalOutput(prev => [...prev, { text, type, ts: Date.now() }]);
    if (terminalRef.current?.writeLine) {
      const prefix = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
      terminalRef.current.writeLine(`${prefix}${text}\x1b[0m`);
    }
  }, []);

  const handleCommit = async () => {
    const msg = commitMsg.trim() || `OMNI IDE: Update files`;
    const modifiedFiles = Object.entries(files)
      .filter(([, v]) => v.modified && v.content !== undefined)
      .map(([path, v]) => ({ path, content: v.content }));
    if (modifiedFiles.length === 0) return;
    setCommitStatus('saving');
    try {
      const { data } = await axios.post(
        `/api/github/repos/${activeProject.owner}/${activeProject.repo}/push`,
        { files: modifiedFiles, message: msg, branch: activeProject.defaultBranch }
      );
      setCommitStatus('success');
      writeTerminal(`✅ Committed: ${data.sha?.slice(0, 7)}`, 'success');
      setFiles(prev => {
        const next = { ...prev };
        modifiedFiles.forEach(f => { if (next[f.path]) next[f.path].modified = false; });
        return next;
      });
      setShowCommitBar(false);
      setCommitMsg('');
      setTimeout(() => setCommitStatus(null), 3000);
    } catch (err) {
      setCommitStatus('error');
      writeTerminal(`❌ ${err.response?.data?.error || err.message}`, 'error');
      setTimeout(() => setCommitStatus(null), 4000);
    }
  };

  const modifiedCount = Object.values(files).filter(f => f.modified).length;

  // Drag resize
  const onResizeLeft = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startW = leftWidth;
    const move = (ev) => setLeftWidth(Math.max(MIN_PANEL, Math.min(400, startW + ev.clientX - startX)));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }, [leftWidth]);

  const onResizeRight = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startW = rightWidth;
    const move = (ev) => setRightWidth(Math.max(MIN_PANEL, Math.min(560, startW - (ev.clientX - startX))));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }, [rightWidth]);

  const onResizeBottom = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY, startH = bottomHeight;
    const move = (ev) => setBottomHeight(Math.max(100, Math.min(500, startH - (ev.clientY - startY))));
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }, [bottomHeight]);

  // ─── Shared top bar ───────────────────────────────────────────────────────
  const TopBar = () => (
    <div className="flex items-center h-10 px-3 bg-omni-surface border-b border-omni-border shrink-0 gap-2">
      {/* Back button on mobile */}
      {isMobile ? (
        <button
          onClick={() => setActiveProject(null)}
          className="p-1.5 rounded text-omni-muted hover:text-omni-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={() => setShowLeft(p => !p)}
          className="p-1 rounded text-omni-muted hover:text-omni-text transition-colors"
          title={showLeft ? 'Hide explorer' : 'Show explorer'}>
          {showLeft ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      )}

      <div className="flex-1 flex items-center gap-1.5 text-xs text-omni-muted font-mono truncate min-w-0">
        {activeProject && (
          <>
            <GitBranch className="w-3 h-3 shrink-0" />
            <span className="truncate">{activeProject.fullName}</span>
            {!isMobile && <>
              <span className="text-omni-dim">•</span>
              <span className="text-omni-accent">{activeProject.defaultBranch}</span>
            </>}
          </>
        )}
        {loadingTree && <Loader2 className="w-3 h-3 animate-spin ml-1 shrink-0" />}
      </div>

      {modifiedCount > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-omni-yellow bg-omni-yellow/10 border border-omni-yellow/20 px-1.5 py-0.5 rounded hidden sm:inline">
            {modifiedCount}✎
          </span>
          {activeProject?.type !== 'local' && (
            <button
              onClick={() => setShowCommitBar(p => !p)}
              className="flex items-center gap-1 text-xs omni-btn-primary py-1 px-2"
            >
              {commitStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" />
                : commitStatus === 'success' ? <CheckCircle className="w-3 h-3" />
                : commitStatus === 'error' ? <AlertCircle className="w-3 h-3" />
                : <GitCommit className="w-3 h-3" />}
              {commitStatus === 'saving' ? 'Pushing...' : commitStatus === 'success' ? 'Pushed!' : 'Commit'}
            </button>
          )}
        </div>
      )}

      {pagesUrl && (
        <a href={pagesUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-omni-green bg-omni-green/10 border border-omni-green/20 px-2 py-1 rounded-lg hover:bg-omni-green/20 transition-colors shrink-0">
          <ExternalLink className="w-3 h-3" />
          Live
        </a>
      )}

      {!isMobile && (
        <button onClick={() => setShowRight(p => !p)}
          className="p-1 rounded text-omni-muted hover:text-omni-text transition-colors"
          title={showRight ? 'Hide AI chat' : 'Show AI chat'}>
          {showRight ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  // ─── Shared commit bar ─────────────────────────────────────────────────────
  const CommitBar = () => showCommitBar ? (
    <div className="flex items-center gap-2 px-3 py-2 bg-omni-surface border-b border-omni-border shrink-0">
      <GitCommit className="w-4 h-4 text-omni-accent shrink-0" />
      <input
        type="text"
        value={commitMsg}
        onChange={e => setCommitMsg(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCommit()}
        placeholder="Commit message..."
        className="omni-input flex-1 h-7 py-1 text-xs"
        autoFocus
      />
      <button onClick={handleCommit} disabled={commitStatus === 'saving'}
        className="omni-btn-primary text-xs py-1 px-3 disabled:opacity-50">Push</button>
      <button onClick={() => setShowCommitBar(false)} className="text-omni-muted hover:text-omni-text text-xs px-2">✕</button>
    </div>
  ) : null;

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    const MOBILE_TABS = [
      { id: 'files', icon: <FolderOpen className="w-5 h-5" />, label: 'Files' },
      { id: 'editor', icon: <Code2 className="w-5 h-5" />, label: 'Code' },
      { id: 'terminal', icon: <TerminalSquare className="w-5 h-5" />, label: 'Run' },
      { id: 'ai', icon: <Bot className="w-5 h-5" />, label: 'AI' },
    ];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <CommitBar />

        {/* Content panel */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'files' && (
            <div className="h-full overflow-hidden border-r-0 bg-omni-surface">
              <FileTree onFileSelect={loadFileContent} writeTerminal={writeTerminal} />
            </div>
          )}
          {mobileTab === 'editor' && (
            <div className="h-full overflow-hidden">
              <CodeEditor />
            </div>
          )}
          {mobileTab === 'terminal' && (
            <div className="h-full flex flex-col overflow-hidden bg-omni-bg">
              {/* Sub-tabs */}
              <div className="flex items-center h-8 bg-omni-surface border-b border-omni-border shrink-0 px-2 gap-1">
                {[
                  { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-3 h-3" /> },
                  { id: 'preview', label: 'Preview', icon: <Eye className="w-3 h-3" /> },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setBottomTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors
                      ${bottomTab === tab.id ? 'bg-omni-bg text-omni-text border border-omni-border' : 'text-omni-muted hover:text-omni-text'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                {bottomTab === 'terminal' ? (
                  <Terminal ref={terminalRef} output={terminalOutput} project={activeProject} files={files} writeTerminal={writeTerminal} />
                ) : (
                  <Preview files={files} activeFile={activeFile} />
                )}
              </div>
            </div>
          )}
          {mobileTab === 'ai' && (
            <div className="h-full overflow-hidden">
              <AIChat
                writeTerminal={writeTerminal}
                setPagesUrl={setPagesUrl}
                setBottomTab={(tab) => { setBottomTab(tab); setMobileTab('terminal'); }}
              />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-stretch bg-omni-surface border-t border-omni-border shrink-0 safe-bottom">
          {MOBILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors
                ${mobileTab === tab.id
                  ? 'text-omni-accent bg-omni-accent/10'
                  : 'text-omni-muted hover:text-omni-text'}`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'ai' && modifiedCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-omni-yellow" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar />
      <CommitBar />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: File Tree */}
        {showLeft && (
          <>
            <div style={{ width: leftWidth, minWidth: MIN_PANEL }}
              className="flex-shrink-0 flex flex-col overflow-hidden border-r border-omni-border bg-omni-surface">
              <FileTree onFileSelect={loadFileContent} writeTerminal={writeTerminal} />
            </div>
            <div className="resize-handle w-1 flex-shrink-0 cursor-col-resize" onMouseDown={onResizeLeft} />
          </>
        )}

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden" style={{ minHeight: 100 }}>
            <CodeEditor />
          </div>
          <div className="resize-handle h-1 flex-shrink-0 cursor-row-resize" onMouseDown={onResizeBottom} />
          <div style={{ height: bottomHeight }} className="flex-shrink-0 flex flex-col border-t border-omni-border overflow-hidden bg-omni-bg">
            <div className="flex items-center h-8 bg-omni-surface border-b border-omni-border shrink-0 px-2 gap-1">
              {[
                { id: 'terminal', icon: <TerminalIcon className="w-3.5 h-3.5" />, label: 'Terminal' },
                { id: 'preview', icon: <Eye className="w-3.5 h-3.5" />, label: 'Preview' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setBottomTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors
                    ${bottomTab === tab.id ? 'bg-omni-bg text-omni-text border border-omni-border' : 'text-omni-muted hover:text-omni-text'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {bottomTab === 'terminal' ? (
                <Terminal ref={terminalRef} output={terminalOutput} project={activeProject} files={files} writeTerminal={writeTerminal} />
              ) : (
                <Preview files={files} activeFile={activeFile} />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: AI Chat */}
        {showRight && (
          <>
            <div className="resize-handle w-1 flex-shrink-0 cursor-col-resize" onMouseDown={onResizeRight} />
            <div style={{ width: rightWidth, minWidth: MIN_PANEL }}
              className="flex-shrink-0 border-l border-omni-border overflow-hidden">
              <AIChat
                writeTerminal={writeTerminal}
                setPagesUrl={setPagesUrl}
                setBottomTab={setBottomTab}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Workspace;
