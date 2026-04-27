import { Router } from 'express';
import { analyzeRoll, getAiStatus } from '../services/aiService.js';

const router = Router();

// Check AI availability
router.get('/ai/status', (req, res) => {
  const status = getAiStatus();
  res.json(status);
});

// Analyze a roll of photos
router.post('/ai/analyze-roll', async (req, res) => {
  const { photos, rollInfo } = req.body;

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'Photos array is required' });
  }

  const status = getAiStatus();
  if (!status.available) {
    return res.status(503).json({ 
      error: 'AI is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env file.',
      setup: true,
    });
  }

  try {
    const photoPaths = photos.map(p => p.path);
    const result = await analyzeRoll(photoPaths, rollInfo || {});
    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error('AI analysis failed:', error);
    
    // Provide helpful error messages
    let userMessage = error.message;
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      userMessage = 'Cannot reach AI API. If you are in China, configure HTTP_PROXY in .env file.';
    } else if (error.message.includes('API_KEY') || error.message.includes('401')) {
      userMessage = 'Invalid API key. Check your .env file.';
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      userMessage = 'API quota exceeded. Try again later or switch to a different provider.';
    }

    res.status(500).json({ 
      error: userMessage,
      details: error.message,
    });
  }
});

// Update AI settings (API key, provider, proxy)
router.post('/ai/settings', async (req, res) => {
  const { provider, geminiKey, openaiKey, proxy } = req.body;

  // Write to .env file
  const envLines = [];
  if (geminiKey) envLines.push(`GEMINI_API_KEY=${geminiKey}`);
  if (openaiKey) envLines.push(`OPENAI_API_KEY=${openaiKey}`);
  if (provider) envLines.push(`AI_PROVIDER=${provider}`);
  if (proxy !== undefined) envLines.push(`HTTP_PROXY=${proxy}`);

  try {
    const { readFile, writeFile } = await import('fs/promises');
    const envPath = new URL('../../.env', import.meta.url).pathname;
    
    let existingContent = '';
    try {
      existingContent = await readFile(envPath, 'utf-8');
    } catch { /* file doesn't exist yet */ }

    // Update or add each line
    for (const line of envLines) {
      const key = line.split('=')[0];
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (existingContent.match(regex)) {
        existingContent = existingContent.replace(regex, line);
      } else {
        existingContent += (existingContent.endsWith('\n') ? '' : '\n') + line + '\n';
      }
    }

    await writeFile(envPath, existingContent);

    // Update process.env in memory
    if (geminiKey) process.env.GEMINI_API_KEY = geminiKey;
    if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
    if (provider) process.env.AI_PROVIDER = provider;
    if (proxy !== undefined) process.env.HTTP_PROXY = proxy;

    res.json({ success: true, status: getAiStatus() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings', details: error.message });
  }
});

export default router;
