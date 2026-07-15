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
const { createProxyMiddleware } = require('http-proxy-middleware');

const isDev = process.env.NODE_ENV !== 'production';

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

// Serve frontend
const clientBuildPath = path.join(__dirname, '../client/dist');

if (!isDev && fs.existsSync(clientBuildPath)) {
  // Production: serve built Vite output
  app.use(express.static(clientBuildPath, { maxAge: '1d' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else if (isDev) {
  // Development: proxy all non-API requests to Vite dev server
  const VITE_PORT = process.env.VITE_PORT || 5174;
  const viteProxy = createProxyMiddleware({
    target: `http://localhost:${VITE_PORT}`,
    changeOrigin: true,
    ws: true, // proxy WebSockets for HMR
    on: {
      error: (err, req, res) => {
        // Vite not ready yet — send a loading page
        if (res && !res.headersSent) {
          res.setHeader('Content-Type', 'text/html');
          res.status(503).send(`<!DOCTYPE html><html><head>
            <meta http-equiv="refresh" content="2">
            <title>OMNI IDE — Starting...</title>
            <style>
              body{background:#0a0e1a;color:#e2e8f0;font-family:sans-serif;
                   display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
              .box{text-align:center;}
              .dot{display:inline-block;width:10px;height:10px;border-radius:50%;
                   background:#00d4ff;margin:0 4px;animation:bounce 0.8s infinite alternate;}
              .dot:nth-child(2){animation-delay:.2s;}
              .dot:nth-child(3){animation-delay:.4s;}
              @keyframes bounce{to{opacity:.2;transform:translateY(-8px);}}
            </style>
          </head><body><div class="box">
            <h2 style="color:#00d4ff;margin-bottom:8px">⚡ OMNI IDE</h2>
            <p style="color:#64748b;margin-bottom:16px">Starting development server...</p>
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div></body></html>`);
        }
      },
    },
  });
  app.use('/', viteProxy);
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
