const GitHubStrategy = require('passport-github2').Strategy;

module.exports = (passport) => {
  const callbackURL = process.env.GITHUB_CALLBACK_URL ||
    `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/github/callback`;

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL,
      scope: ['user:email', 'repo', 'public_repo', 'read:org'],
    }, (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value,
        email: profile.emails?.[0]?.value,
        accessToken,
        profile,
      };
      return done(null, user);
    }));
  }

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
};
