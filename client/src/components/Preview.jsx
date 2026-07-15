import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, ExternalLink, Eye, EyeOff, Maximize2 } from 'lucide-react';

const Preview = ({ files, activeFile }) => {
  const iframeRef = useRef(null);
  const [previewSrc, setPreviewSrc] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshTimer = useRef(null);

  // Build HTML document from project files
  const buildPreview = useCallback(() => {
    // Find index.html
    const indexPath = Object.keys(files).find(p =>
      /^(index\.html|src\/index\.html)$/i.test(p)
    );

    if (indexPath && files[indexPath]?.content) {
      let html = files[indexPath].content;

      // Inline CSS files
      const cssPath = Object.keys(files).find(p => p.endsWith('.css'));
      if (cssPath && files[cssPath]?.content) {
        html = html.replace(/<link[^>]+stylesheet[^>]*>/gi, '');
        html = html.replace('</head>', `<style>${files[cssPath].content}</style></head>`);
      }

      // Inline JS files
      const jsPath = Object.keys(files).find(p => p.endsWith('.js') && !p.includes('config'));
      if (jsPath && files[jsPath]?.content) {
        html = html.replace(/<script[^>]+src=["'][^"']+["'][^>]*><\/script>/gi, '');
        html = html.replace('</body>', `<script>${files[jsPath].content}</script></body>`);
      }

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
      setLastRefresh(new Date());
      return;
    }

    // If current active file is HTML, preview it directly
    if (activeFile?.endsWith('.html') && files[activeFile]?.content) {
      const blob = new Blob([files[activeFile].content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
      setLastRefresh(new Date());
      return;
    }

    // Show placeholder
    setPreviewSrc('');
  }, [files, activeFile]);

  // Auto-refresh on file changes (debounced)
  useEffect(() => {
    if (!autoRefresh) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(buildPreview, 600);
    return () => clearTimeout(refreshTimer.current);
  }, [files, autoRefresh, buildPreview]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const openInNewTab = () => {
    if (previewSrc) window.open(previewSrc, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-omni-bg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-omni-surface border-b border-omni-border shrink-0">
        <Eye className="w-3.5 h-3.5 text-omni-muted shrink-0" />
        <span className="text-xs text-omni-muted flex-1">
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Live Preview'}
        </span>

        <button
          onClick={() => setAutoRefresh(p => !p)}
          title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          className={`p-1 rounded transition-colors text-xs
            ${autoRefresh ? 'text-omni-green' : 'text-omni-muted hover:text-omni-text'}`}
        >
          {autoRefresh ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button onClick={buildPreview}
          className="p-1 rounded text-omni-muted hover:text-omni-accent transition-colors" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {previewSrc && (
          <button onClick={openInNewTab}
            className="p-1 rounded text-omni-muted hover:text-omni-accent transition-colors" title="Open in new tab">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Iframe */}
      <div className="flex-1 overflow-hidden">
        {previewSrc ? (
          <iframe
            ref={iframeRef}
            src={previewSrc}
            title="Live Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Maximize2 className="w-10 h-10 text-omni-dim mb-3" />
            <p className="text-sm text-omni-muted">No HTML preview available</p>
            <p className="text-xs text-omni-dim mt-1">
              Create an <code className="text-omni-accent">index.html</code> file or open an HTML file to preview it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview;
