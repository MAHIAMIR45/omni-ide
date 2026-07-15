require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
const path = require('path');
const fs = require('fs-extra');
const cron = require('node-cron');

// Import routes
const authRoutes = require('./routes/auth');
const githubRoutes = require('./routes/github');
const aiRoutes = require('./routes/ai');
const pistonRoutes = require('./routes/piston');
const uploadRoutes = require('./routes/upload');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure temp/uploads directory exists
fs.ensureDirSync(path.join(__dirname, '../temp/uploads'));

// Trust proxy for Replit
app.set('trust proxy', 1);

// Security & compression
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'omni-ide-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure passport
require('./config/passport')(passport);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/piston', pistonRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/status', statusRoutes);

// Serve static uploads (temporarily accessible)
app.use('/uploads', express.static(path.join(__dirname, '../temp/uploads')));

// Serve built React frontend in production
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Auto-delete expired uploads every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const uploadDir = path.join(__dirname, '../temp/uploads');
  try {
    const files = await fs.readdir(uploadDir);
    const now = Date.now();
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = path.join(uploadDir, file);
      const stat = await fs.stat(filePath);
      const ageMs = now - stat.mtimeMs;
      // Delete files older than 20 minutes (1,200,000 ms)
      if (ageMs > 20 * 60 * 1000) {
        await fs.remove(filePath);
        console.log(`[CLEANUP] Deleted expired upload: ${file}`);
      }
    }
  } catch (err) {
    console.error('[CLEANUP] Error during cleanup:', err.message);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 OMNI IDE Server running on port ${PORT}`);
  console.log(`📡 GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`🤖 AI Endpoint: https://bb9ce817-4178-4a83-8cff-f1e6a2e4507c-00-26fvbji4nkddx.sisko.replit.dev`);
});
