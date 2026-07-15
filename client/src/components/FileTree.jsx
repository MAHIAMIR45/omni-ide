import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Folder, FolderOpen, FileCode, FileText, File,
  ImageIcon, Package, ChevronRight, ChevronDown,
  Plus, Trash2, Upload, RefreshCw, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const FILE_ICONS = {
  js: { icon: FileCode, color: 'text-yellow-400' },
  jsx: { icon: FileCode, color: 'text-blue-400' },
  ts: { icon: FileCode, color: 'text-blue-500' },
  tsx: { icon: FileCode, color: 'text-blue-400' },
  py: { icon: FileCode, color: 'text-green-400' },
  html: { icon: FileCode, color: 'text-orange-400' },
  css: { icon: FileCode, color: 'text-purple-400' },
  json: { icon: FileText, color: 'text-yellow-300' },
  md: { icon: FileText, color: 'text-omni-muted' },
  png: { icon: ImageIcon, color: 'text-pink-400' },
  jpg: { icon: ImageIcon, color: 'text-pink-400' },
  svg: { icon: ImageIcon, color: 'text-green-300' },
  zip: { icon: Package, color: 'text-omni-yellow' },
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || { icon: File, color: 'text-omni-muted' };
};

// Build nested tree from flat paths
const buildTree = (paths) => {
  const root = {};
  paths.sort().forEach(p => {
    const parts = p.split('/');
    let node = root;
    parts.forEach((part, i) => {
      if (!node[part]) node[part] = i === parts.length - 1 ? null : {};
      if (node[part] !== null) node = node[part];
    });
  });
  return root;
};

const TreeNode = ({ name, node, path, depth, onFileClick, activeFile, onDelete }) => {
  const isDir = node !== null && typeof node === 'object';
  const [open, setOpen] = useState(depth < 1);
  const { icon: Icon, color } = getFileIcon(name);

  if (isDir) {
    return (
      <div>
        <div
          className="file-tree-item flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded text-sm text-omni-muted hover:text-omni-text transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setOpen(p => !p)}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          {open ? <FolderOpen className="w-3.5 h-3.5 text-omni-yellow shrink-0" /> : <Folder className="w-3.5 h-3.5 text-omni-yellow shrink-0" />}
          <span className="truncate text-xs">{name}</span>
        </div>
        {open && Object.entries(node).map(([childName, childNode]) => (
          <TreeNode key={childName} name={childName} node={childNode}
            path={`${path}/${childName}`} depth={depth + 1}
            onFileClick={onFileClick} activeFile={activeFile} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  const fullPath = path;
  const isActive = activeFile === fullPath;

  return (
    <div
      className={`file-tree-item flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded text-xs group
                  ${isActive ? 'active text-omni-text' : 'text-omni-muted hover:text-omni-text'}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onFileClick(fullPath)}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <span className="truncate flex-1">{name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(fullPath); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-omni-red transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

const FileTree = ({ onFileSelect, writeTerminal }) => {
  const { fileTree, setFileTree, activeFile, addFile, deleteFile, setActiveFile, files, activeProject } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const fileInputRef = useRef();

  const tree = buildTree(fileTree.length > 0 ? fileTree : Object.keys(files));

  const handleNewFile = () => {
    if (!newFileName.trim()) return;
    const filePath = newFileName.trim();
    addFile(filePath, '');
    if (!fileTree.includes(filePath)) setFileTree(prev => [...prev, filePath]);
    setNewFileName('');
    setShowNewFile(false);
  };

  const handleDeleteFile = (filePath) => {
    deleteFile(filePath);
    setFileTree(prev => prev.filter(p => p !== filePath));
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;
    await uploadFiles(droppedFiles);
  }, []);

  const handleFileInput = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    await uploadFiles(selectedFiles);
    e.target.value = '';
  };

  const uploadFiles = async (fileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      fileList.forEach(f => formData.append('files', f));
      const { data } = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      for (const uploaded of data.files) {
        const ext = uploaded.originalName.split('.').pop()?.toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
          // Image: add as reference
          addFile(uploaded.originalName, `/* Image uploaded: ${uploaded.url} */`);
        } else if (ext === 'zip') {
          // ZIP: show extracted files
          writeTerminal(`[UPLOAD] ZIP extracted: ${uploaded.extractedFiles?.length || 0} files`, 'info');
          uploaded.extractedFiles?.forEach(ef => {
            addFile(ef.name, '/* ZIP extracted file */');
          });
        } else {
          // Text file: fetch content
          try {
            const { data: fileData } = await axios.get(`/api/upload/${uploaded.id}`);
            addFile(uploaded.originalName, fileData.content);
          } catch {
            addFile(uploaded.originalName, '');
          }
        }
        if (!fileTree.includes(uploaded.originalName)) {
          setFileTree(prev => [...prev, uploaded.originalName]);
        }
        writeTerminal(`[UPLOAD] ✅ ${uploaded.originalName} (expires ${new Date(uploaded.expiresAt).toLocaleTimeString()})`, 'success');
      }
    } catch (err) {
      writeTerminal(`[UPLOAD] ❌ ${err.response?.data?.error || err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const allPaths = [...new Set([...fileTree, ...Object.keys(files)])];
  const treeData = buildTree(allPaths);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-omni-border shrink-0">
        <span className="text-xs font-semibold text-omni-muted uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowNewFile(p => !p)}
            className="p-1 rounded text-omni-muted hover:text-omni-accent transition-colors" title="New file">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded text-omni-muted hover:text-omni-accent transition-colors" title="Upload file">
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="px-2 py-2 border-b border-omni-border">
          <input
            type="text"
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNewFile();
              if (e.key === 'Escape') { setShowNewFile(false); setNewFileName(''); }
            }}
            placeholder="filename.js"
            className="omni-input w-full text-xs py-1"
            autoFocus
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto custom-scroll py-1">
        {Object.keys(treeData).length === 0 ? (
          <p className="text-xs text-omni-dim px-3 py-4 text-center">No files yet</p>
        ) : (
          Object.entries(treeData).map(([name, node]) => (
            <TreeNode
              key={name}
              name={name}
              node={node}
              path={name}
              depth={0}
              onFileClick={onFileSelect}
              activeFile={activeFile}
              onDelete={handleDeleteFile}
            />
          ))
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`mx-2 mb-2 mt-1 shrink-0 border-2 border-dashed rounded-lg p-3 text-center
                    cursor-pointer transition-all duration-200
                    ${isDragOver ? 'drop-active border-omni-accent' : 'border-omni-dim hover:border-omni-muted'}`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-omni-accent">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Uploading...</span>
          </div>
        ) : (
          <div className="text-omni-dim">
            <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
            <p className="text-xs leading-snug">Drop files here<br />
              <span className="text-omni-dim opacity-70">JS, PY, TXT, ZIP, Images</span></p>
            <p className="text-xs text-omni-accent/60 mt-1">⏱ Auto-deleted in 20–25 min</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden"
        accept=".js,.ts,.py,.txt,.html,.css,.json,.md,.zip,.png,.jpg,.jpeg,.gif,.svg,.webp"
        onChange={handleFileInput} />
    </div>
  );
};

export default FileTree;
