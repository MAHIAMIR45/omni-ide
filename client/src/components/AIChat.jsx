import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Send, Bot, User, Loader2, Trash2, Copy, Check,
  Zap, Globe, FileCode, X, ChevronDown, ChevronUp,
  CheckCircle2, Circle, ExternalLink, Play, GitBranch,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ModelSelector, { DEFAULT_MODEL } from './ModelSelector';

const escHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Markdown renderer with collapsible code blocks
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="language-${lang || 'code'}"><code>${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-omni-accent underline">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^([^<\n].+)$/gm, (line) => `<p>${line}</p>`);
};

const extractCodeBlocks = (text) => {
  const blocks = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null)
    blocks.push({ language: match[1] || 'text', code: match[2].trim() });
  return blocks;
};

const extractFileOps = (text) => {
  const ops = [];
  const regex = /```(\w+)?\n\/\/ FILE: ([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null)
    ops.push({ language: match[1], path: match[2].trim(), content: match[3].trim() });
  const fileRegex = /###\s+([^\n]+\.\w+)\n```(\w+)?\n([\s\S]*?)```/g;
  while ((match = fileRegex.exec(text)) !== null)
    ops.push({ language: match[2], path: match[1].trim(), content: match[3].trim() });
  return ops;
};

const SYSTEM_PROMPT = `You are OMNI IDE's AI coding agent — a senior full-stack developer and DevOps expert.

Your capabilities:
1. Write complete, production-ready code files
2. Debug and fix code errors autonomously  
3. Deploy static sites to GitHub Pages and return the live URL
4. Test code via Piston API (Node.js, Python, and 30+ languages)
5. Commit and push code to GitHub repos

When writing code files, ALWAYS format them as:
\`\`\`javascript
// FILE: index.js
[code here]
\`\`\`

For multiple files:
### index.html
\`\`\`html
[code here]
\`\`\`
### style.css
\`\`\`css
[code here]
\`\`\`

Actions you can signal:
- [ACTION:RUN_CODE:language] — test code via Piston
- [ACTION:DEPLOY_PAGES] — enable GitHub Pages
- [ACTION:COMMIT_FILES] — commit to GitHub
- [ACTION:SHOW_PREVIEW] — show live preview

After deploying, ALWAYS output the URL like this:
🌐 **Live URL:** https://username.github.io/repo-name/

Progress updates (use these):
📝 Writing files...
⚙️ Testing code...
🚀 Deploying...
✅ Done!`;

// ─── Step indicator (Replit Agent style) ────────────────────────────────────
const AgentStep = ({ text, status }) => {
  const icons = {
    done: <CheckCircle2 className="w-3.5 h-3.5 text-omni-green shrink-0" />,
    active: <Loader2 className="w-3.5 h-3.5 text-omni-accent animate-spin shrink-0" />,
    pending: <Circle className="w-3.5 h-3.5 text-omni-dim shrink-0" />,
  };
  return (
    <div className="flex items-center gap-2 py-1 px-2">
      {icons[status] || icons.pending}
      <span className={`text-xs ${status === 'done' ? 'text-omni-muted line-through' : status === 'active' ? 'text-omni-text' : 'text-omni-dim'}`}>
        {text}
      </span>
    </div>
  );
};

// ─── Live URL card ───────────────────────────────────────────────────────────
const UrlCard = ({ url }) => (
  <a href={url} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-3 p-3 mt-2 rounded-xl border border-omni-green/30 bg-omni-green/5
               hover:bg-omni-green/10 transition-colors group">
    <div className="w-8 h-8 rounded-lg bg-omni-green/15 flex items-center justify-center shrink-0">
      <Globe className="w-4 h-4 text-omni-green" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-omni-green mb-0.5">Site is Live!</p>
      <p className="text-xs text-omni-muted truncate">{url}</p>
    </div>
    <ExternalLink className="w-4 h-4 text-omni-green/60 group-hover:text-omni-green transition-colors shrink-0" />
  </a>
);

// ─── Code block with expand/collapse ────────────────────────────────────────
const CollapsibleCode = ({ code, language }) => {
  const [expanded, setExpanded] = useState(false);
  const lines = code.split('\n');
  const tooLong = lines.length > 15;
  const shown = tooLong && !expanded ? lines.slice(0, 15).join('\n') : code;
  return (
    <div className="my-2 rounded-lg border border-omni-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-omni-bg/80 border-b border-omni-border">
        <span className="text-xs font-mono text-omni-muted">{language || 'code'}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-omni-dim hover:text-omni-accent transition-colors flex items-center gap-1"
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="text-xs font-mono text-omni-text p-3 overflow-x-auto bg-omni-bg leading-relaxed">
        <code>{shown}</code>
        {tooLong && !expanded && <span className="text-omni-dim">...</span>}
      </pre>
      {tooLong && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-omni-muted
                     hover:text-omni-accent hover:bg-omni-accent/5 transition-colors border-t border-omni-border"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show {lines.length - 15} more lines</>}
        </button>
      )}
    </div>
  );
};

// ─── Message bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onApplyFiles }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';
  const isStatus = msg.role === 'status';
  const isUrl = msg.role === 'url';
  const isSteps = msg.role === 'steps';

  // URL card
  if (isUrl) return <UrlCard url={msg.content} />;

  // Agent steps
  if (isSteps) {
    return (
      <div className="rounded-xl border border-omni-border bg-omni-bg/50 p-2 my-1">
        {msg.steps.map((s, i) => <AgentStep key={i} text={s.text} status={s.status} />)}
      </div>
    );
  }

  // Status badge
  if (isStatus) {
    const colors = {
      info: 'text-omni-accent bg-omni-accent/8 border-omni-accent/20',
      success: 'text-omni-green bg-omni-green/8 border-omni-green/20',
      error: 'text-red-400 bg-red-400/8 border-red-400/20',
      warning: 'text-omni-yellow bg-omni-yellow/8 border-omni-yellow/20',
    };
    return (
      <div className="flex justify-center my-0.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${colors[msg.statusType] || colors.info}`}>
          {msg.content}
        </span>
      </div>
    );
  }

  const fileOps = !isUser && msg.content ? extractFileOps(msg.content) : [];
  const liveUrlMatch = !isUser && msg.content?.match(/https?:\/\/[^\s\)\"]+\.github\.io\/[^\s\)\"]+/);

  const copyAll = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex gap-2.5 flex-row-reverse">
        <div className="w-7 h-7 rounded-full bg-omni-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-omni-accent" />
        </div>
        <div className="max-w-[82%] flex flex-col items-end gap-1">
          <div className="bg-omni-accent/12 border border-omni-accent/20 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-omni-text">
            {msg.content}
          </div>
          <span className="text-xs text-omni-dim px-1">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    );
  }

  // AI message
  const hasContent = msg.content && msg.content.trim().length > 0;

  // Render content with collapsible code blocks
  const renderContent = (text) => {
    if (!text) return null;
    const parts = [];
    let lastIndex = 0;
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        parts.push(
          <div key={`text-${match.index}`}
            className="chat-content text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(before) }}
          />
        );
      }
      parts.push(
        <CollapsibleCode key={`code-${match.index}`} code={match[2].trim()} language={match[1]} />
      );
      lastIndex = match.index + match[0].length;
    }

    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      parts.push(
        <div key="remaining"
          className="chat-content text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(remaining) }}
        />
      );
    }

    return parts.length > 0 ? parts : (
      <div className="chat-content text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  };

  return (
    <div className="flex gap-2.5 group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-omni-purple/30 to-omni-accent/20
                      flex items-center justify-center shrink-0 mt-0.5 border border-omni-purple/20">
        <Bot className="w-3.5 h-3.5 text-omni-purple" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="bg-omni-surface border border-omni-border rounded-2xl rounded-tl-sm px-3.5 py-3 relative">
          {!hasContent && msg.streaming ? (
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-omni-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-omni-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-omni-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-omni-muted">Thinking...</span>
            </div>
          ) : (
            <>
              <div className={msg.streaming ? 'typing-cursor' : ''}>
                {renderContent(msg.content || '')}
              </div>

              {/* Live URL detected inline */}
              {liveUrlMatch && !msg.streaming && (
                <UrlCard url={liveUrlMatch[0]} />
              )}

              {/* Apply files button */}
              {fileOps.length > 0 && !msg.streaming && (
                <button
                  onClick={() => onApplyFiles(fileOps)}
                  className="mt-3 flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl w-full
                             bg-omni-accent/8 text-omni-accent border border-omni-accent/20
                             hover:bg-omni-accent/15 transition-colors font-medium"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Apply {fileOps.length} file{fileOps.length > 1 ? 's' : ''} to editor
                </button>
              )}

              {/* Copy */}
              {!msg.streaming && (
                <button
                  onClick={copyAll}
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded
                             text-omni-muted hover:text-omni-accent transition-all"
                  title="Copy"
                >
                  {copied ? <Check className="w-3 h-3 text-omni-green" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-omni-dim px-1">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// ─── Main AIChat component ────────────────────────────────────────────────────
const AIChat = ({ writeTerminal, setPagesUrl, setBottomTab }) => {
  const { user, activeProject, files, addFile, setActiveFile, fileTree, setFileTree, getProjectChat, addChatMessage, clearChatHistory } = useApp();
  const [input, setInput] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const projectId = activeProject?.fullName || 'default';
  const messages = getProjectChat(projectId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addStatus = useCallback((text, type = 'info') => {
    addChatMessage(projectId, { role: 'status', content: text, statusType: type, ts: Date.now() });
    writeTerminal(`[AI] ${text}`, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
  }, [projectId, addChatMessage, writeTerminal]);

  const buildSystemMessages = () => {
    const openFilePaths = Object.keys(files).join(', ') || 'none';
    const projectContext = activeProject ? `\nProject: ${activeProject.fullName}` : '';
    const fileContext = openFilePaths !== 'none' ? `\nOpen files: ${openFilePaths}` : '';
    return [{ role: 'system', content: SYSTEM_PROMPT + projectContext + fileContext }];
  };

  const processActions = async (responseText) => {
    if (responseText.includes('[ACTION:DEPLOY_PAGES]') && activeProject?.owner) {
      addStatus('🚀 Deploying to GitHub Pages...', 'info');
      try {
        const { data } = await axios.post(
          `/api/github/repos/${activeProject.owner}/${activeProject.repo}/pages`,
          { branch: activeProject.defaultBranch || 'main' }
        );
        if (data.url) {
          setPagesUrl(data.url);
          addStatus(`✅ Live at: ${data.url}`, 'success');
          addChatMessage(projectId, { role: 'url', content: data.url, ts: Date.now() });
        }
      } catch (err) {
        addStatus(`❌ Pages deploy failed: ${err.message}`, 'error');
      }
    }
    const runMatch = responseText.match(/\[ACTION:RUN_CODE:(\w+)\]/);
    if (runMatch) {
      const lang = runMatch[1];
      const blocks = extractCodeBlocks(responseText);
      const block = blocks.find(b => b.language.toLowerCase() === lang.toLowerCase()) || blocks[0];
      if (block) {
        addStatus(`⚙️ Testing ${lang} via Piston...`, 'info');
        setBottomTab('terminal');
        try {
          const { data } = await axios.post('/api/piston/execute', { language: lang.toLowerCase(), code: block.code });
          if (data.exitCode === 0) {
            addStatus(`✅ Tests passed (exit 0)`, 'success');
            if (data.stdout) writeTerminal(`Output: ${data.stdout.trim()}`, 'success');
          } else {
            addStatus(`❌ Test failed (exit ${data.exitCode})`, 'error');
            if (data.stderr) writeTerminal(`Error: ${data.stderr.trim()}`, 'error');
          }
        } catch (err) { addStatus(`❌ Piston: ${err.message}`, 'error'); }
      }
    }
    if (responseText.includes('[ACTION:SHOW_PREVIEW]')) setBottomTab('preview');
  };

  const handleApplyFiles = useCallback((fileOps) => {
    fileOps.forEach(op => {
      addFile(op.path, op.content);
      if (!fileTree.includes(op.path)) setFileTree(prev => [...prev, op.path]);
      writeTerminal(`📝 Applied: ${op.path}`, 'success');
    });
    if (fileOps.length > 0) setActiveFile(fileOps[0].path);
    addStatus(`✅ Applied ${fileOps.length} file(s) to editor`, 'success');
  }, [addFile, fileTree, setFileTree, setActiveFile, writeTerminal, addStatus]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    addChatMessage(projectId, { role: 'user', content: userMsg, ts: Date.now() });

    const historyMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    let enrichedUser = userMsg;
    if (activeProject) {
      const activeFileContent = Object.entries(files)
        .filter(([, v]) => v.content && v.modified)
        .slice(0, 3)
        .map(([p, v]) => `\`\`\`\n// FILE: ${p}\n${v.content.slice(0, 2000)}\n\`\`\``)
        .join('\n');
      if (activeFileContent) enrichedUser = `${userMsg}\n\nCurrent files:\n${activeFileContent}`;
    }

    const payload = [...buildSystemMessages(), ...historyMessages, { role: 'user', content: enrichedUser }];

    setLoading(true);
    const streamingId = Date.now();
    addChatMessage(projectId, { role: 'assistant', content: '', streaming: true, ts: streamingId });

    const isStaticSite = /html|css|js|webpage|website|landing|portfolio|clock|timer|calculator|game/i.test(userMsg);
    const isServerSide = /node|express|flask|django|api|server|backend|python|fastapi/i.test(userMsg);
    const isDebug = /fix|debug|error|broken|not working|crash/i.test(userMsg);
    const isNewProject = /make|create|build|generate|bana|bnao/i.test(userMsg);

    let fullResponse = '';
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload, model, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullResponse += delta;
              addChatMessage(projectId, { role: 'assistant', content: fullResponse, streaming: true, ts: streamingId });
            }
          } catch { }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        addStatus('⏹ Stopped.', 'warning');
      } else {
        fullResponse = `❌ Error: ${err.message}`;
        addStatus(`❌ ${err.message}`, 'error');
      }
    } finally {
      addChatMessage(projectId, { role: 'assistant', content: fullResponse, streaming: false, ts: streamingId });
      setLoading(false);
      abortRef.current = null;
    }

    if (fullResponse) {
      const fileOps = extractFileOps(fullResponse);
      if (fileOps.length > 0 && activeProject) {
        handleApplyFiles(fileOps);
        // Auto-deploy static sites
        if (isStaticSite && isNewProject && activeProject?.type !== 'local') {
          const htmlFile = fileOps.find(f => f.path.endsWith('.html'));
          if (htmlFile) {
            addStatus('📤 Committing to GitHub...', 'info');
            try {
              const { data } = await axios.post(
                `/api/github/repos/${activeProject.owner}/${activeProject.repo}/push`,
                { files: fileOps.map(f => ({ path: f.path, content: f.content })), message: `OMNI: ${userMsg.slice(0, 60)}`, branch: activeProject.defaultBranch || 'main' }
              );
              addStatus(`✅ Committed: ${data.sha?.slice(0, 7)}`, 'success');
              setTimeout(async () => {
                addStatus('🚀 Enabling GitHub Pages...', 'info');
                try {
                  const pagesRes = await axios.post(
                    `/api/github/repos/${activeProject.owner}/${activeProject.repo}/pages`,
                    { branch: activeProject.defaultBranch || 'main' }
                  );
                  if (pagesRes.data.url) {
                    setPagesUrl(pagesRes.data.url);
                    addStatus(`🌐 Live!`, 'success');
                    addChatMessage(projectId, { role: 'url', content: pagesRes.data.url, ts: Date.now() });
                  }
                } catch { }
              }, 2000);
            } catch (err) { addStatus(`❌ Commit failed: ${err.message}`, 'error'); }
          }
        }
        // Auto-test server code
        if (isServerSide) {
          const jsFile = fileOps.find(f => f.path.endsWith('.js') || f.path.endsWith('.py'));
          if (jsFile) {
            const lang = jsFile.path.endsWith('.py') ? 'python' : 'javascript';
            addStatus(`⚙️ Testing ${jsFile.path}...`, 'info');
            try {
              const { data } = await axios.post('/api/piston/execute', { language: lang, code: jsFile.content });
              if (data.exitCode === 0) {
                addStatus(`✅ Tests passed!`, 'success');
              } else {
                addStatus(`⚠️ Error detected — auto-fixing...`, 'warning');
                writeTerminal(data.stderr || data.stdout, 'error');
                try {
                  const fixRes = await axios.post('/api/ai/chat', {
                    messages: [...buildSystemMessages(), { role: 'user', content: `Fix errors in ${jsFile.path}:\n\nErrors:\n${data.stderr}\n\nCode:\n\`\`\`${lang}\n${jsFile.content}\n\`\`\`` }],
                    model, stream: false,
                  });
                  const fixedCode = fixRes.data.choices?.[0]?.message?.content || '';
                  if (fixedCode) {
                    const fixBlocks = extractCodeBlocks(fixedCode);
                    if (fixBlocks.length > 0) { addFile(jsFile.path, fixBlocks[0].code); addStatus('✅ Auto-fixed!', 'success'); }
                  }
                } catch { }
              }
            } catch { }
          }
        }
      }
      await processActions(fullResponse);
    }
  };

  const handleStop = () => { if (abortRef.current) abortRef.current.abort(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const QUICK_PROMPTS = [
    { label: '🌐 Website banao', prompt: 'Create a beautiful Pakistani analog clock website using HTML, CSS, JavaScript. Show Pakistan Standard Time with glowing neon design.' },
    { label: '🔧 Bugs fix karo', prompt: 'Read all current files and fix every bug. Test with Piston API and show results.' },
    { label: '🚀 Deploy karo', prompt: 'Commit all files to GitHub and deploy to GitHub Pages. Share the live URL when done.' },
    { label: '📱 Mobile version', prompt: 'Make all current files fully responsive and mobile-friendly. Test and apply.' },
  ];

  return (
    <div className="h-full flex flex-col bg-omni-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-omni-border bg-omni-surface shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-omni-purple/30 to-omni-accent/20
                          border border-omni-purple/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-omni-purple" />
          </div>
          <div>
            <p className="text-xs font-semibold text-omni-text leading-none">OMNI Agent</p>
            <p className="text-[10px] text-omni-muted mt-0.5">AI coding assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ModelSelector value={model} onChange={setModel} />
          <button
            onClick={() => clearChatHistory(projectId)}
            className="p-1.5 rounded-lg text-omni-muted hover:text-omni-red hover:bg-omni-red/10 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scroll px-3 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-6 px-2">
            <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-omni-purple/20 to-omni-accent/10
                            border border-omni-purple/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-omni-purple" />
            </div>
            <p className="text-sm font-semibold text-omni-text mb-1">OMNI Agent Ready</p>
            <p className="text-xs text-omni-muted text-center mb-5 max-w-[220px]">
              Code likhta hoon, bugs fix karta hoon, deploy kar ke URL deta hoon.
            </p>
            <div className="w-full grid grid-cols-1 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                  className="text-xs text-left px-3 py-2.5 rounded-xl border border-omni-border
                             text-omni-muted hover:text-omni-text hover:border-omni-accent/40
                             hover:bg-omni-accent/5 transition-all"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={`${msg.ts}-${i}`} msg={msg} onApplyFiles={handleApplyFiles} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-omni-border p-3 bg-omni-surface shrink-0">
        <div className="flex items-end gap-2 bg-omni-bg border border-omni-border rounded-2xl px-3 py-2
                        focus-within:border-omni-accent/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to write, fix, or deploy code..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-omni-text placeholder-omni-muted
                       resize-none overflow-hidden leading-relaxed min-h-[24px] max-h-32
                       focus:outline-none"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={handleStop}
              className="p-1.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors shrink-0"
              title="Stop"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 rounded-xl bg-omni-accent text-omni-bg hover:bg-omni-accentDark
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Send (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-omni-dim mt-1.5 text-center">
          Enter to send • Shift+Enter new line
        </p>
      </div>
    </div>
  );
};

export default AIChat;
