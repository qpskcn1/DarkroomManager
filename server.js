import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { exiftool } from 'exiftool-vendored';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from root

// API: List photos in a directory
app.get('/api/photos', async (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.tif', '.tiff', '.png'].includes(ext);
    });

    const photos = imageFiles.map(file => ({
      name: file,
      path: path.join(dirPath, file),
    }));

    res.json({ photos });
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to read directory', details: error.message });
  }
});

// API: Get saved presets
app.get('/api/presets', async (req, res) => {
  const presetsDir = path.join(__dirname, 'presets');
  try {
    const files = await fs.readdir(presetsDir);
    const jsonFiles = files.filter(file => path.extname(file) === '.json');
    
    const presets = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(presetsDir, file), 'utf-8');
      presets.push(JSON.parse(content));
    }
    
    res.json({ presets });
  } catch (error) {
    console.error('Error reading presets:', error);
    res.status(500).json({ error: 'Failed to read presets', details: error.message });
  }
});

// API: Apply metadata to photos
app.post('/api/apply-metadata', async (req, res) => {
  const { photos, metadata } = req.body;
  
  if (!photos || !Array.isArray(photos) || !metadata) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const results = [];

  for (const photo of photos) {
    try {
      // metadata is an object with keys like Make, Model, LensModel, DateTimeOriginal, etc.
      await exiftool.write(photo.path, metadata);
      results.push({ path: photo.path, success: true });
    } catch (error) {
      console.error(`Error writing metadata to ${photo.path}:`, error);
      results.push({ path: photo.path, success: false, error: error.message });
    }
  }

  res.json({ results });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await exiftool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await exiftool.end();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
