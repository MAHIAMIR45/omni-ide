import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, Lock, Globe, Plus, Star, Clock, Search, RefreshCw, FolderOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CreateProjectModal from './CreateProjectModal';

const RepoDashboard = () => {
  const { user, openProject } = useApp();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'public' | 'private'

  useEffect(() => { fetchRepos(); }, []);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/github/repos');
      setRepos(data);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportRepo = async (repo) => {
    openProject({
      type: 'import',
      owner: repo.owner.login,
      repo: repo.name,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      description: repo.description,
      isPrivate: repo.private,
      language: repo.language,
    });
  };

  const filteredRepos = repos.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'public' ? !r.private : r.private);
    return matchSearch && matchFilter;
  });

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  };

  return (
    <div className="h-full bg-omni-bg p-6 overflow-auto custom-scroll">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={user?.avatar} alt={user?.username}
              className="w-10 h-10 rounded-full border-2 border-omni-accent/30" />
            <div>
              <h1 className="text-xl font-bold text-omni-text">
                {user?.displayName || user?.username}'s Repos
              </h1>
              <p className="text-sm text-omni-muted">{repos.length} repositories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRepos} disabled={loading}
              className="omni-btn-ghost flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="omni-btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Blank Project
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-omni-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              className="omni-input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            {['all', 'public', 'private'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                  ${filter === f ? 'bg-omni-accent/20 text-omni-accent border border-omni-accent/30'
                  : 'text-omni-muted hover:text-omni-text border border-omni-border'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Repo Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="omni-panel p-5 h-36 shimmer" />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 text-omni-dim mx-auto mb-3" />
            <p className="text-omni-muted">No repositories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleImportRepo(repo)}
                className="omni-panel p-5 text-left hover:border-omni-accent/40
                           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                           hover:shadow-omni-accent/5 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {repo.private ? (
                      <Lock className="w-3.5 h-3.5 text-omni-yellow shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-omni-muted shrink-0" />
                    )}
                    <span className="font-semibold text-sm text-omni-text group-hover:text-omni-accent
                                     transition-colors truncate max-w-40">
                      {repo.name}
                    </span>
                  </div>
                  {repo.language && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-omni-bg text-omni-muted border border-omni-border shrink-0">
                      {repo.language}
                    </span>
                  )}
                </div>

                <p className="text-xs text-omni-muted mb-3 line-clamp-2 leading-relaxed">
                  {repo.description || 'No description'}
                </p>

                <div className="flex items-center justify-between text-xs text-omni-dim">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {repo.default_branch}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(repo.updated_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default RepoDashboard;
