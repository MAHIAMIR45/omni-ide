const express = require('express');
const axios = require('axios');
const router = express.Router();

const AI_BASE_URL = 'https://bb9ce817-4178-4a83-8cff-f1e6a2e4507c-00-26fvbji4nkddx.sisko.replit.dev/v1/chat/completions';
const AI_BEARER_TOKEN = 'sk-7c8cd01e4b7231e2-152c1a-2fa42670';
const DEFAULT_MODEL = 'mcode/mimo-auto';

// Chat completion proxy (handles streaming)
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL, stream = true, temperature = 0.7, max_tokens = 4096 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const payload = { model, messages, stream, temperature, max_tokens };

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const response = await axios.post(AI_BASE_URL, payload, {
        headers: {
          'Authorization': `Bearer ${AI_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 120000,
      });

      response.data.on('data', (chunk) => res.write(chunk));
      response.data.on('end', () => res.end());
      response.data.on('error', (err) => {
        console.error('Stream error:', err);
        res.write(`data: [DONE]\n\n`);
        res.end();
      });
    } else {
      // Non-streaming response
      const response = await axios.post(AI_BASE_URL, payload, {
        headers: {
          'Authorization': `Bearer ${AI_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      });
      res.json(response.data);
    }
  } catch (err) {
    console.error('AI proxy error:', err.message);
    if (err.response) {
      res.status(err.response.status).json({ error: err.response.data || err.message });
    } else {
      res.status(503).json({ error: 'AI service unavailable', details: err.message });
    }
  }
});

// Get available models list
router.get('/models', (req, res) => {
  res.json({
    default: DEFAULT_MODEL,
    categories: [
      {
        label: 'mcode',
        models: [{ value: 'mcode/mimo-auto', label: 'mimo-auto (Default)' }],
      },
      {
        label: 'oc (Omni Custom)',
        models: [
          { value: 'oc/big-pickle', label: 'big-pickle' },
          { value: 'oc/deepseek-v4-flash-free', label: 'deepseek-v4-flash-free' },
          { value: 'oc/mimo-v2.5-free', label: 'mimo-v2.5-free' },
          { value: 'oc/hy3-free', label: 'hy3-free' },
          { value: 'oc/nemotron-3-ultra-free', label: 'nemotron-3-ultra-free' },
          { value: 'oc/north-mini-code-free', label: 'north-mini-code-free' },
        ],
      },
      {
        label: 'Qwen Web',
        models: [
          { value: 'qwen-web/qwen3.7-max', label: 'qwen3.7-max' },
          { value: 'qwen-web/qwen3.7-plus', label: 'qwen3.7-plus' },
          { value: 'qwen-web/qwen3.6-plus', label: 'qwen3.6-plus' },
        ],
      },
      {
        label: 'Ollama Cloud',
        models: [
          { value: 'ollamacloud/minimax-m3', label: 'minimax-m3' },
          { value: 'ollamacloud/gemma4:31b', label: 'gemma4:31b' },
          { value: 'ollamacloud/nemotron-3-super', label: 'nemotron-3-super' },
          { value: 'ollamacloud/gpt-oss:20b', label: 'gpt-oss:20b' },
          { value: 'ollamacloud/minimax-m2.1', label: 'minimax-m2.1' },
          { value: 'ollamacloud/nemotron-3-nano:30b', label: 'nemotron-3-nano:30b' },
          { value: 'ollamacloud/qwen3-coder-next', label: 'qwen3-coder-next' },
          { value: 'ollamacloud/devstral-small-2:24b', label: 'devstral-small-2:24b' },
          { value: 'ollamacloud/gemma3:27b', label: 'gemma3:27b' },
          { value: 'ollamacloud/gemma3:4b', label: 'gemma3:4b' },
          { value: 'ollamacloud/gemma3:12b', label: 'gemma3:12b' },
          { value: 'ollamacloud/ministral-3:8b', label: 'ministral-3:8b' },
          { value: 'ollamacloud/minimax-m2.5', label: 'minimax-m2.5' },
          { value: 'ollamacloud/ministral-3:14b', label: 'ministral-3:14b' },
        ],
      },
      {
        label: 'Mistral',
        models: [
          { value: 'mistral/mistral-large-latest', label: 'mistral-large-latest' },
          { value: 'mistral/mistral-medium-3-5', label: 'mistral-medium-3-5' },
          { value: 'mistral/mistral-small-latest', label: 'mistral-small-latest' },
          { value: 'mistral/devstral-latest', label: 'devstral-latest' },
          { value: 'mistral/codestral-latest', label: 'codestral-latest' },
        ],
      },
    ],
  });
});

module.exports = router;
