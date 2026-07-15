import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Send, Bot, User, Loader2, Trash2, Copy, Check,
  Zap, GitCommit, Globe, Terminal as TermIcon,
  FileCode, RefreshCw, AlertTriangle, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ModelSelector, { DEFAULT_MODEL } from './ModelSelector';

// Simple markdown renderer
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
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line;
      return `<p>${line}</p>`;
    });
};

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Extract code blocks from AI response
const extractCodeBlocks = (text) => {
  const blocks = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || 'text', code: match[2].trim() });
  }
  return blocks;
};

// Extract file operations from AI response (e.g. <!-- FILE: path/to/file.js -->)
const extractFileOps = (text) => {
  const ops = [];
  const regex = /```(\w+)?\n\/\/ FILE: ([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    ops.push({ language: match[1], path: match[2].trim(), content: match[3].trim() });
  }
  // Also detect ### filename.ext pattern
  const fileRegex = /###\s+([^\n]+\.\w+)\n```(\w+)?\n([\s\S]*?)```/g;
  while ((match = fileRegex.exec(text)) !== null) {
    ops.push({ language: match[2], path: match[1].trim(), content: match[3].trim() });
  }
  return ops;
};

const SYSTEM_PROMPT = `You are OMNI IDE's AI coding agent — a senior full-stack developer and DevOps expert.

Your capabilities:
1. Write complete, production-ready code files
2. Debug and fix code errors autonomously
3. Deploy static sites to GitHub Pages
4. Test code via Piston API (Node.js, Python, and 30+ languages)
5. Commit and push code to GitHub repos
6. Suggest deployment options (Render, Railway, Vercel, etc.)

When writing code files, ALWAYS format them as:
\`\`\`javascript
// FILE: index.js
[code here]
\`\`\`

Or for multiple files:
### index.html
\`\`\`html
[code here]
\`\`\`
### style.css
\`\`\`css
[code here]
\`\`\`

Actions you can signal (the IDE will execute them automatically):
- [ACTION:RUN_CODE:language] — to test code via Piston
- [ACTION:DEPLOY_PAGES] — to enable GitHub Pages
- [ACTION:COMMIT_FILES] — to commit current files to GitHub
- [ACTION:SHOW_PREVIEW] — to show the live preview

Be concise but thorough. Always explain what you're doing with status updates like:
📝 Writing index.html...
⚙️ Testing with Piston API...
🚀 Deploying to GitHub Pages...
✅ Done!`;

const StatusBadge = ({ text, type = 'info' }) => {
  const colors = {
    info: 'text-omni-accent bg-omni-accent/10 border-omni-accent/20',
    success: 'text-omni-green bg-omni-green/10 border-omni-green/20',
    error: 'text-omni-red bg-omni-red/10 border-omni-red/20',
    warning: 'text-omni-yellow bg-omni-yellow/10 border-omni-yellow/20',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono ${colors[type]}`}>
      <span>{text}</span>
    </div>
  );
};

const MessageBubble = ({ msg, onApplyFiles, onCopyCode }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';
  const isStatus = msg.role === 'status';
  const fileOps = !isUser && msg.content ? extractFileOps(msg.content) : [];

  if (isStatus) {
    return (
      <div className="flex justify-center my-1">
        <StatusBadge text={msg.content} type={msg.statusType || 'info'} />
      </div>
    );
  }

  const copyAll = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
        ${isUser ? 'bg-omni-accent/20 text-omni-accent' : 'bg-omni-purple/20 text-omni-purple'}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {isUser ? (
          <div className="bg-omni-accent/15 border border-omni-accent/20 rounded-2xl rounded-tr-sm
                          px-3 py-2 text-sm text-omni-text">
            {msg.content}
          </div>
        ) : (
          <div className="bg-omni-surface border border-omni-border rounded-2xl rounded-tl-sm
                          px-3 py-2.5 text-sm text-omni-text relative">
            {msg.streaming ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-omni-accent" />
                <span className="text-omni-muted text-xs">Thinking...</span>
              </div>
            ) : (
              <>
                <div
                  className="chat-content prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }}
                />
                {/* Apply files button */}
                {fileOps.length > 0 && (
                  <button
                    onClick={() => onApplyFiles(fileOps)}
                    className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                               bg-omni-accent/10 text-omni-accent border border-omni-accent/20
                               hover:bg-omni-accent/20 transition-colors w-full justify-center"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Apply {fileOps.length} file{fileOps.length > 1 ? 's' : ''} to editor
                  </button>
                )}
                {/* Copy button */}
                <button
                  onClick={copyAll}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded
                             text-omni-muted hover:text-omni-accent transition-all"
                  title="Copy"
                >
                  {copied ? <Check className="w-3 h-3 text-omni-green" /> : <Copy className="w-3 h-3" />}
                </button>
              </>
            )}
          </div>
        )}
        <span className="text-xs text-omni-dim px-1">
          {new Date(msg.ts).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

const AIChat = ({ writeTerminal, setPagesUrl, setBottomTab }) => {
  const { user, activeProject, files, addFile, setActiveFile, fileTree, setFileTree, getProjectChat, addChatMessage, clearChatHistory } = useApp();
  const [input, setInput] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [agentActions, setAgentActions] = useState([]);
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

  // Build context-aware system message with file info
  const buildSystemMessages = () => {
    const openFilePaths = Object.keys(files).join(', ') || 'none';
    const projectContext = activeProject
      ? `\nCurrent project: ${activeProject.fullName} (${activeProject.type})`
      : '';
    const fileContext = openFilePaths !== 'none'
      ? `\nOpen files: ${openFilePaths}` : '';
    return [{ role: 'system', content: SYSTEM_PROMPT + projectContext + fileContext }];
  };

  // Process AI actions embedded in response
  const processActions = async (responseText) => {
    // Detect deploy to GitHub Pages
    if (responseText.includes('[ACTION:DEPLOY_PAGES]') && activeProject?.owner && activeProject?.repo) {
      addStatus('🚀 Deploying to GitHub Pages...', 'info');
      try {
        const { data } = await axios.post(
          `/api/github/repos/${activeProject.owner}/${activeProject.repo}/pages`,
          { branch: activeProject.defaultBranch || 'main' }
        );
        if (data.url) {
          setPagesUrl(data.url);
          addStatus(`✅ Live at: ${data.url}`, 'success');
        }
      } catch (err) {
        addStatus(`❌ Pages deploy failed: ${err.response?.data?.error || err.message}`, 'error');
      }
    }

    // Detect run code
    const runMatch = responseText.match(/\[ACTION:RUN_CODE:(\w+)\]/);
    if (runMatch) {
      const lang = runMatch[1];
      // Find the code block for this language
      const blocks = extractCodeBlocks(responseText);
      const block = blocks.find(b => b.language.toLowerCase() === lang.toLowerCase()) || blocks[0];
      if (block) {
        addStatus(`⚙️ Testing ${lang} code via Piston API...`, 'info');
        setBottomTab('terminal');
        try {
          const { data } = await axios.post('/api/piston/execute', {
            language: lang.toLowerCase(),
            code: block.code,
          });
          if (data.exitCode === 0) {
            addStatus(`✅ Code ran successfully (exit: 0)`, 'success');
            if (data.stdout) writeTerminal(`Output: ${data.stdout.trim()}`, 'success');
          } else {
            addStatus(`❌ Code errored (exit: ${data.exitCode})`, 'error');
            if (data.stderr) writeTerminal(`Error: ${data.stderr.trim()}`, 'error');
          }
        } catch (err) {
          addStatus(`❌ Piston error: ${err.message}`, 'error');
        }
      }
    }

    // Show preview
    if (responseText.includes('[ACTION:SHOW_PREVIEW]')) {
      setBottomTab('preview');
    }
  };

  // Apply file operations to the editor
  const handleApplyFiles = useCallback((fileOps) => {
    fileOps.forEach(op => {
      addFile(op.path, op.content);
      if (!fileTree.includes(op.path)) setFileTree(prev => [...prev, op.path]);
      writeTerminal(`📝 Applied: ${op.path}`, 'success');
    });
    if (fileOps.length > 0) setActiveFile(fileOps[0].path);
    addStatus(`✅ Applied ${fileOps.length} file(s) to editor`, 'success');
  }, [addFile, fileTree, setFileTree, setActiveFile, writeTerminal, addStatus]);

  // Main send handler
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    // Add user message
    addChatMessage(projectId, { role: 'user', content: userMsg, ts: Date.now() });

    // Build context messages from history (last 20)
    const historyMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    // Add active file context if relevant
    let enrichedUser = userMsg;
    if (activeProject) {
      const activeFileContent = Object.entries(files)
        .filter(([, v]) => v.content && v.modified)
        .slice(0, 3)
        .map(([p, v]) => `\`\`\`\n// FILE: ${p}\n${v.content.slice(0, 2000)}\n\`\`\``)
        .join('\n');
      if (activeFileContent) {
        enrichedUser = `${userMsg}\n\nCurrent files:\n${activeFileContent}`;
      }
    }

    const payload = [
      ...buildSystemMessages(),
      ...historyMessages,
      { role: 'user', content: enrichedUser },
    ];

    setLoading(true);
    const streamingId = Date.now();
    addChatMessage(projectId, { role: 'assistant', content: '', streaming: true, ts: streamingId });

    // Detect intents
    const isStaticSite = /html|css|js|webpage|website|landing|portfolio|clock|timer|calculator|game/i.test(userMsg);
    const isServerSide = /node|express|flask|django|api|server|backend|python|fastapi/i.test(userMsg);
    const isDebug = /fix|debug|error|broken|not working|crash/i.test(userMsg);
    const isNewProject = /make|create|build|generate/i.test(userMsg);

    if (isStaticSite && isNewProject && activeProject) {
      addStatus('📝 Generating static site files...', 'info');
    } else if (isServerSide && isNewProject) {
      addStatus('⚙️ Planning server-side application...', 'info');
    } else if (isDebug) {
      addStatus('🔍 Analyzing code for bugs...', 'info');
    }

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
              // Update streaming message
              addChatMessage(projectId, {
                role: 'assistant', content: fullResponse, streaming: true, ts: streamingId,
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        addStatus('⏹ Response stopped.', 'warning');
      } else {
        fullResponse = `❌ Error: ${err.message}`;
        addStatus(`❌ AI error: ${err.message}`, 'error');
      }
    } finally {
      // Finalize message
      addChatMessage(projectId, {
        role: 'assistant', content: fullResponse, streaming: false, ts: streamingId,
      });
      setLoading(false);
      abortRef.current = null;
    }

    // Auto-apply files if AI generated them
    if (fullResponse) {
      const fileOps = extractFileOps(fullResponse);
      if (fileOps.length > 0 && activeProject) {
        handleApplyFiles(fileOps);

        // Auto-deploy if static site
        if (isStaticSite && isNewProject && activeProject?.type !== 'local') {
          const htmlFile = fileOps.find(f => f.path.endsWith('.html'));
          if (htmlFile) {
            addStatus('📤 Committing files to GitHub...', 'info');
            try {
              const { data } = await axios.post(
                `/api/github/repos/${activeProject.owner}/${activeProject.repo}/push`,
                {
                  files: fileOps.map(f => ({ path: f.path, content: f.content })),
                  message: `OMNI IDE: ${userMsg.slice(0, 60)}`,
                  branch: activeProject.defaultBranch || 'main',
                }
              );
              addStatus(`✅ Committed: ${data.sha?.slice(0, 7)}`, 'success');

              // Enable GitHub Pages
              setTimeout(async () => {
                addStatus('🚀 Enabling GitHub Pages...', 'info');
                try {
                  const pagesRes = await axios.post(
                    `/api/github/repos/${activeProject.owner}/${activeProject.repo}/pages`,
                    { branch: activeProject.defaultBranch || 'main' }
                  );
                  if (pagesRes.data.url) {
                    setPagesUrl(pagesRes.data.url);
                    addStatus(`🌐 Live at: ${pagesRes.data.url}`, 'success');
                    addChatMessage(projectId, {
                      role: 'assistant',
                      content: `🎉 **Your site is live!**\n\n🔗 [${pagesRes.data.url}](${pagesRes.data.url})\n\n> Note: GitHub Pages may take 1–2 minutes to fully activate.`,
                      streaming: false,
                      ts: Date.now(),
                    });
                  }
                } catch {}
              }, 2000);
            } catch (err) {
              addStatus(`❌ Commit failed: ${err.response?.data?.error || err.message}`, 'error');
            }
          }
        }

        // Auto-test server-side code
        if (isServerSide) {
          const jsFile = fileOps.find(f => f.path.endsWith('.js') || f.path.endsWith('.py'));
          if (jsFile) {
            const lang = jsFile.path.endsWith('.py') ? 'python' : 'javascript';
            addStatus(`⚙️ Testing ${jsFile.path} via Piston API...`, 'info');
            try {
              const { data } = await axios.post('/api/piston/execute', {
                language: lang,
                code: jsFile.content,
              });
              if (data.exitCode === 0) {
                addStatus(`✅ Code test passed (exit 0)`, 'success');
                if (isDebug) addStatus('🔧 Bugs fixed! Committing clean code...', 'success');
              } else {
                addStatus(`⚠️ Code has errors (exit ${data.exitCode}) — auto-fixing...`, 'warning');
                writeTerminal(data.stderr || data.stdout, 'error');
                // Ask AI to fix
                const fixPayload = [
                  ...buildSystemMessages(),
                  { role: 'user', content: `Fix these errors in ${jsFile.path}:\n\nErrors:\n${data.stderr}\n\nOriginal code:\n\`\`\`${lang}\n${jsFile.content}\n\`\`\`` },
                ];
                // Simplified fix request (non-streaming)
                try {
                  const fixRes = await axios.post('/api/ai/chat', {
                    messages: fixPayload, model, stream: false,
                  });
                  const fixedCode = fixRes.data.choices?.[0]?.message?.content || '';
                  if (fixedCode) {
                    const fixBlocks = extractCodeBlocks(fixedCode);
                    if (fixBlocks.length > 0) {
                      addFile(jsFile.path, fixBlocks[0].code);
                      addStatus('✅ Code auto-fixed by AI!', 'success');
                    }
                  }
                } catch {}
              }
            } catch {}
          }
        }
      }

      // Process special action tags
      await processActions(fullResponse);
    }
  };

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QUICK_PROMPTS = [
    { label: '🌐 Make a website', prompt: 'Create a beautiful Pakistani clock website using HTML, CSS, and JavaScript. Make it show current Pakistan Standard Time with an analog and digital display.' },
    { label: '🔧 Fix errors', prompt: 'Read the current files and fix any errors or bugs you find. Test each file with Piston API.' },
    { label: '📦 Add README', prompt: 'Create a professional README.md for this project with installation, usage, and features sections.' },
    { label: '🚀 Deploy Pages', prompt: 'Commit all current files to GitHub and enable GitHub Pages to deploy this project live.' },
  ];

  return (
    <div className="h-full flex flex-col bg-omni-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-omni-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-omni-purple/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-omni-purple" />
          </div>
          <span className="text-xs font-semibold text-omni-text">OMNI AI Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector value={model} onChange={setModel} />
          <button
            onClick={() => clearChatHistory(projectId)}
            className="p-1.5 rounded text-omni-muted hover:text-omni-red transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scroll px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-omni-purple/10 border border-omni-purple/20
                            flex items-center justify-center">
              <Zap className="w-6 h-6 text-omni-purple" />
            </div>
            <p className="text-sm font-medium text-omni-text mb-1">OMNI AI Agent Ready</p>
            <p className="text-xs text-omni-muted mb-4">
              I can write code, fix bugs, deploy to GitHub Pages, and test with Piston API.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                  className="text-xs text-left px-3 py-2 rounded-lg border border-omni-border
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
            <MessageBubble
              key={`${msg.ts}-${i}`}
              msg={msg}
              onApplyFiles={handleApplyFiles}
              onCopyCode={(code) => navigator.clipboard.writeText(code)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-omni-border p-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to write code, fix bugs, or deploy..."
              rows={1}
              className="omni-input w-full resize-none overflow-hidden leading-relaxed text-xs
                         min-h-[36px] max-h-32 pr-10"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              disabled={loading}
            />
          </div>
          {loading ? (
            <button
              onClick={handleStop}
              className="p-2 rounded-lg bg-omni-red/15 text-omni-red border border-omni-red/30
                         hover:bg-omni-red/25 transition-colors shrink-0"
              title="Stop"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-omni-accent text-omni-bg hover:bg-omni-accentDark
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Send (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-omni-dim mt-1.5 text-center">
          Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AIChat;
