import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESETS_DIR = path.join(__dirname, '..', '..', 'presets');

const router = Router();

// Read a preset file and normalize its format
function normalizePreset(raw, filename) {
  // Support both old format (from NLP) and new format
  if (raw.camera) {
    // New format
    return raw;
  }

  // Old format: convert
  const data = raw.data || {};
  return {
    id: raw.name?.toLowerCase().replace(/\s+/g, '-') || filename.replace('.json', ''),
    name: raw.name || filename.replace('.json', ''),
    camera: {
      make: data.make || raw.make || '',
      model: data.model || raw.model || '',
      lens: data.lens || raw.lens || '',
      lensMake: data.lensMake || '',
      focalLength: data.focalLength || '',
    },
    scan: {
      scanner: data.scanner || '',
      method: data.scanMethod || '',
      formatSize: data.filmFormatSize || 1,
    },
    defaults: {
      filmStock: data.filmStock || raw.film || '',
      iso: data.nlpFilmISO || data.iso || null,
      aperture: data.aperture || '',
    },
    // Preserve original NLP data for reference
    _nlpData: data,
  };
}

// GET all presets
router.get('/presets', async (req, res) => {
  try {
    await fs.mkdir(PRESETS_DIR, { recursive: true });
    const files = await fs.readdir(PRESETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const presets = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(PRESETS_DIR, file), 'utf-8');
      const raw = JSON.parse(content);
      presets.push(normalizePreset(raw, file));
    }

    res.json({ presets });
  } catch (error) {
    console.error('Error reading presets:', error);
    res.status(500).json({ error: 'Failed to read presets' });
  }
});

// POST create preset
router.post('/presets', async (req, res) => {
  const preset = req.body;
  if (!preset.name) {
    return res.status(400).json({ error: 'Preset name is required' });
  }

  const filename = `${preset.name}.json`;
  const filePath = path.join(PRESETS_DIR, filename);

  try {
    await fs.writeFile(filePath, JSON.stringify(preset, null, 2));
    res.json({ success: true, preset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

// PUT update preset
router.put('/presets/:name', async (req, res) => {
  const { name } = req.params;
  const preset = req.body;

  // Find existing file (could have spaces in name)
  const files = await fs.readdir(PRESETS_DIR);
  const existing = files.find(f => f.replace('.json', '') === name);

  if (!existing) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  try {
    await fs.writeFile(path.join(PRESETS_DIR, existing), JSON.stringify(preset, null, 2));
    res.json({ success: true, preset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

// DELETE preset
router.delete('/presets/:name', async (req, res) => {
  const { name } = req.params;
  const files = await fs.readdir(PRESETS_DIR);
  const existing = files.find(f => f.replace('.json', '') === name);

  if (!existing) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  try {
    await fs.unlink(path.join(PRESETS_DIR, existing));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

export default router;
