import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // AI status
  const [aiStatus, setAiStatus] = useState({ online: false, latency: null, lastChecked: null });

  // Workspace state
  const [view, setView] = useState('landing'); // 'landing' | 'dashboard' | 'workspace'
  const [activeProject, setActiveProject] = useState(null);
  const [files, setFiles] = useState({}); // { path: { content, sha, language, modified } }
  const [activeFile, setActiveFile] = useState(null);
  const [fileTree, setFileTree] = useState([]);

  // Chat memory persisted per project
  const [chatHistory, setChatHistory] = useState({});

  // Check auth on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Poll AI status every 30s
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await axios.get('/api/status');
        setAiStatus(data.ai);
      } catch {
        setAiStatus(prev => ({ ...prev, online: false }));
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/user');
      setUser(data.authenticated ? data.user : null);
      if (data.authenticated) setView('dashboard');
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
    setView('landing');
    setActiveProject(null);
    setFiles({});
    setActiveFile(null);
  };

  const openProject = useCallback((project) => {
    setActiveProject(project);
    setView('workspace');
    setFiles({});
    setActiveFile(null);
  }, []);

  const updateFile = useCallback((filePath, content) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: { ...prev[filePath], content, modified: true },
    }));
  }, []);

  const saveFile = useCallback((filePath, sha) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: { ...prev[filePath], sha, modified: false },
    }));
  }, []);

  const addFile = useCallback((filePath, content = '', language = 'plaintext') => {
    setFiles(prev => ({
      ...prev,
      [filePath]: { content, sha: null, language, modified: true },
    }));
    setActiveFile(filePath);
  }, []);

  const deleteFile = useCallback((filePath) => {
    setFiles(prev => {
      const next = { ...prev };
      delete next[filePath];
      return next;
    });
    setActiveFile(prev => (prev === filePath ? null : prev));
  }, []);

  // Chat history per project
  const getProjectChat = useCallback((projectId) => {
    return chatHistory[projectId] || [];
  }, [chatHistory]);

  const addChatMessage = useCallback((projectId, message) => {
    setChatHistory(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), message],
    }));
  }, []);

  const clearChatHistory = useCallback((projectId) => {
    setChatHistory(prev => ({ ...prev, [projectId]: [] }));
  }, []);

  return (
    <AppContext.Provider value={{
      user, authLoading, fetchUser, logout,
      aiStatus,
      view, setView,
      activeProject, openProject,
      files, setFiles, updateFile, saveFile, addFile, deleteFile,
      activeFile, setActiveFile,
      fileTree, setFileTree,
      getProjectChat, addChatMessage, clearChatHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
