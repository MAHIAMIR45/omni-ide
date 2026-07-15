import React, { useState } from 'react';
import axios from 'axios';
import { X, FolderPlus, Lock, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TEMPLATES = [
  { id: 'blank', label: 'Blank', desc: 'Empty project', files: [] },
  {
    id: 'html', label: 'HTML/CSS/JS', desc: 'Static website starter', files: [
      { path: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>' },
      { path: 'style.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: sans-serif; padding: 2rem; }' },
      { path: 'script.js', content: "console.log('Hello from OMNI IDE!');" },
    ],
  },
  {
    id: 'node', label: 'Node.js', desc: 'Express server starter', files: [
      { path: 'index.js', content: "const express = require('express');\nconst app = express();\nconst PORT = 3000;\n\napp.get('/', (req, res) => res.send('Hello from Express!'));\n\napp.listen(PORT, () => console.log(`Server running on port ${PORT}`));" },
      { path: 'package.json', content: '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}' },
      { path: 'README.md', content: '# My Node.js Project\n\nCreated with OMNI IDE.' },
    ],
  },
  {
    id: 'python', label: 'Python', desc: 'Flask app starter', files: [
      { path: 'app.py', content: "from flask import Flask\n\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return 'Hello from Flask!'\n\nif __name__ == '__main__':\n    app.run(debug=True)" },
      { path: 'requirements.txt', content: 'flask\ngunicorn' },
      { path: 'README.md', content: '# My Python Project\n\nCreated with OMNI IDE.' },
    ],
  },
];

const CreateProjectModal = ({ onClose }) => {
  const { user, openProject } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [template, setTemplate] = useState('html');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOnGitHub, setCreateOnGitHub] = useState(true);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Project name is required');
    const cleanName = name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    setLoading(true);
    setError('');

    const tpl = TEMPLATES.find(t => t.id === template);
    const initialFiles = {};
    (tpl?.files || []).forEach(f => { initialFiles[f.path] = { content: f.content, modified: true }; });

    try {
      if (createOnGitHub) {
        const { data: repo } = await axios.post('/api/github/repos', {
          name: cleanName, description, isPrivate, autoInit: false,
        });
        openProject({
          type: 'new',
          owner: user.username,
          repo: cleanName,
          name: cleanName,
          fullName: `${user.username}/${cleanName}`,
          defaultBranch: 'main',
          description,
          isPrivate,
          initialFiles,
          newRepo: true,
        });
      } else {
        openProject({
          type: 'local',
          owner: user?.username || 'local',
          repo: cleanName,
          name: cleanName,
          fullName: cleanName,
          defaultBranch: 'main',
          description,
          isPrivate: false,
          initialFiles,
          newRepo: false,
        });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="omni-panel w-full max-w-lg mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-omni-accent" />
            <h2 className="text-lg font-bold text-omni-text">Create New Project</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-omni-muted hover:text-omni-red hover:bg-omni-red/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-omni-muted mb-1.5">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-awesome-project"
              className="omni-input w-full"
              autoFocus
            />
            {name && (
              <p className="text-xs text-omni-dim mt-1">
                Slug: {name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-omni-muted mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A brief description..."
              className="omni-input w-full"
            />
          </div>

          {/* Template */}
          <div>
            <label className="block text-xs font-medium text-omni-muted mb-2">Template</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${template === t.id ? 'border-omni-accent bg-omni-accent/10 text-omni-text'
                    : 'border-omni-border text-omni-muted hover:border-omni-accent/40'}`}>
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-omni-border accent-omni-accent" />
              <span className="text-sm text-omni-muted flex items-center gap-1.5">
                {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                {isPrivate ? 'Private' : 'Public'} repository
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createOnGitHub} onChange={e => setCreateOnGitHub(e.target.checked)}
                className="w-4 h-4 rounded border-omni-border accent-omni-accent" />
              <span className="text-sm text-omni-muted">Create on GitHub</span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-omni-red bg-omni-red/10 border border-omni-red/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="omni-btn-ghost flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={loading || !name.trim()}
              className="omni-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
