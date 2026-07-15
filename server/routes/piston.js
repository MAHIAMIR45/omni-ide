const express = require('express');
const axios = require('axios');
const router = express.Router();

const PISTON_API = 'https://emkc.org/api/v2/piston';

// Execute code via Piston API
router.post('/execute', async (req, res) => {
  try {
    const { language, version = '*', code, stdin = '', args = [], files } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required' });
    }

    const payload = {
      language,
      version,
      files: files || [{ name: `main.${getExtension(language)}`, content: code }],
      stdin,
      args,
      compile_timeout: 10000,
      run_timeout: 5000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    };

    const { data } = await axios.post(`${PISTON_API}/execute`, payload, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    res.json({
      success: true,
      run: data.run,
      compile: data.compile,
      language: data.language,
      version: data.version,
      stdout: data.run?.stdout || '',
      stderr: data.run?.stderr || data.compile?.stderr || '',
      exitCode: data.run?.code ?? 0,
    });
  } catch (err) {
    console.error('Piston error:', err.message);
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

// Get available runtimes from Piston
router.get('/runtimes', async (req, res) => {
  try {
    const { data } = await axios.get(`${PISTON_API}/runtimes`, { timeout: 10000 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getExtension(language) {
  const map = {
    javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
    c: 'c', cpp: 'cpp', rust: 'rs', go: 'go', ruby: 'rb',
    php: 'php', swift: 'swift', kotlin: 'kt', bash: 'sh',
    csharp: 'cs', scala: 'scala', perl: 'pl', lua: 'lua',
    r: 'r', dart: 'dart', haskell: 'hs',
  };
  return map[language.toLowerCase()] || 'txt';
}

module.exports = router;
