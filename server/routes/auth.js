const express = require('express');
const passport = require('passport');
const router = express.Router();

// Initiate GitHub OAuth
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(503).json({ error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' });
  }
  passport.authenticate('github', {
    scope: ['user:email', 'repo', 'public_repo', 'delete_repo'],
  })(req, res, next);
});

// GitHub OAuth callback
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    res.redirect('/?auth=success');
  }
);

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    const { accessToken, ...safeUser } = req.user;
    res.json({ authenticated: true, user: safeUser });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy();
    res.json({ success: true });
  });
});

module.exports = router;
