const express = require('express');
const { Octokit } = require('@octokit/rest');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

const getOctokit = (req) => new Octokit({ auth: req.user.accessToken });

// Get user's repositories
router.get('/repos', requireAuth, async (req, res) => {
  try {
    const octokit = getOctokit(req);
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get repository file tree
router.get('/repos/:owner/:repo/tree', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit(req);
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    const { data } = await octokit.git.getTree({
      owner, repo,
      tree_sha: branch,
      recursive: '1',
    });
    res.json({ tree: data.tree, branch, repo: repoData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file content
router.get('/repos/:owner/:repo/contents/*', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.params[0];
    const octokit = getOctokit(req);
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
    if (Array.isArray(data)) return res.json({ type: 'dir', items: data });
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    res.json({ content, sha: data.sha, path: data.path, name: data.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update file
router.put('/repos/:owner/:repo/contents/*', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.params[0];
    const { content, message, sha } = req.body;
    const octokit = getOctokit(req);
    const encodedContent = Buffer.from(content).toString('base64');
    const payload = { owner, repo, path: filePath, message: message || `Update ${filePath}`, content: encodedContent };
    if (sha) payload.sha = sha;
    const { data } = await octokit.repos.createOrUpdateFileContents(payload);
    res.json({ success: true, commit: data.commit, content: data.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create repository
router.post('/repos', requireAuth, async (req, res) => {
  try {
    const { name, description = '', isPrivate = false, autoInit = true } = req.body;
    const octokit = getOctokit(req);
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name, description,
      private: isPrivate,
      auto_init: autoInit,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enable GitHub Pages
router.post('/repos/:owner/:repo/pages', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branch = 'main', path: pagesPath = '/' } = req.body;
    const octokit = getOctokit(req);
    const { data } = await octokit.repos.createPagesSite({
      owner, repo,
      source: { branch, path: pagesPath },
    });
    res.json({ success: true, pages: data, url: `https://${owner}.github.io/${repo}/` });
  } catch (err) {
    // Pages might already be enabled
    if (err.status === 409) {
      res.json({ success: true, url: `https://${req.user.username}.github.io/${repo}/` });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Get Pages status
router.get('/repos/:owner/:repo/pages', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getOctokit(req);
    const { data } = await octokit.repos.getPages({ owner, repo });
    res.json(data);
  } catch (err) {
    res.status(404).json({ enabled: false });
  }
});

// Push multiple files (batch commit)
router.post('/repos/:owner/:repo/push', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { files, message = 'OMNI IDE: Update files', branch = 'main' } = req.body;
    const octokit = getOctokit(req);

    // Get current branch ref
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const latestCommitSha = refData.object.sha;

    // Get current tree
    const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const treeItems = await Promise.all(files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner, repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));

    // Create new tree
    const { data: newTree } = await octokit.git.createTree({ owner, repo, base_tree: baseTreeSha, tree: treeItems });

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner, repo, message,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // Update ref
    await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha });

    res.json({ success: true, commit: newCommit, sha: newCommit.sha });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
