const express = require('express');
const axios = require('axios');
const router = express.Router();

const AI_BASE_URL = 'https://bb9ce817-4178-4a83-8cff-f1e6a2e4507c-00-26fvbji4nkddx.sisko.replit.dev/v1/chat/completions';
const AI_BEARER_TOKEN = 'sk-7c8cd01e4b7231e2-152c1a-2fa42670';
const PING_INTERVAL_MS = 30000;

let statusCache = {
  online: false,
  lastChecked: null,
  lastStatusCode: null,
  latency: null,
  checking: false,
};

async function checkAIStatus() {
  if (statusCache.checking) return;
  statusCache.checking = true;
  const start = Date.now();
  try {
    // Lightweight ping with minimal payload
    const response = await axios.post(AI_BASE_URL, {
      model: 'mcode/mimo-auto',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    }, {
      headers: { 'Authorization': `Bearer ${AI_BEARER_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 10000,
      validateStatus: (s) => s < 500, // 200, 401, 403 etc. = server is UP
    });

    statusCache.online = response.status < 500;
    statusCache.lastStatusCode = response.status;
    statusCache.latency = Date.now() - start;
  } catch (err) {
    statusCache.online = false;
    statusCache.lastStatusCode = err.response?.status || 0;
    statusCache.latency = Date.now() - start;
  } finally {
    statusCache.lastChecked = new Date().toISOString();
    statusCache.checking = false;
  }
}

// Start background pinging
checkAIStatus();
setInterval(checkAIStatus, PING_INTERVAL_MS);

// Status endpoint
router.get('/', (req, res) => {
  res.json({
    ai: {
      online: statusCache.online,
      lastChecked: statusCache.lastChecked,
      latency: statusCache.latency,
      statusCode: statusCache.lastStatusCode,
    },
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Force re-check
router.post('/check', async (req, res) => {
  statusCache.checking = false;
  await checkAIStatus();
  res.json({ online: statusCache.online, latency: statusCache.latency });
});

module.exports = router;
