import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createReadStream } from 'fs';

const router = Router();

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.tif', '.tiff', '.png'];

// Cache dir for thumbnails
const THUMB_CACHE_DIR = path.join(process.cwd(), '.thumb-cache');

async function ensureCacheDir() {
  try {
    await fs.mkdir(THUMB_CACHE_DIR, { recursive: true });
  } catch (e) { /* exists */ }
}

// Scan a directory for rolls (sub-directories with images)
router.get('/scan', async (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Check if this directory contains images directly (single roll)
    const directImages = entries.filter(e => 
      e.isFile() && IMAGE_EXTENSIONS.includes(path.extname(e.name).toLowerCase())
    );

    // Check for subdirectories (multi-roll)
    const subdirs = entries.filter(e => e.isDirectory() && e.name !== 'Export' && e.name !== '.thumb-cache' && !e.name.startsWith('.'));

    // If directory has images directly, treat as single roll
    if (directImages.length > 0 && subdirs.length === 0) {
      const photos = directImages
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map(f => ({
          name: f.name,
          path: path.join(dirPath, f.name),
        }));

      return res.json({
        mode: 'single',
        rolls: [{
          id: path.basename(dirPath),
          name: path.basename(dirPath),
          path: dirPath,
          photos
        }]
      });
    }

    // Multi-roll: scan each subdirectory
    const rolls = [];
    for (const dir of subdirs) {
      const rollPath = path.join(dirPath, dir.name);
      const rollEntries = await fs.readdir(rollPath, { withFileTypes: true });
      const rollImages = rollEntries
        .filter(e => e.isFile() && IMAGE_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      if (rollImages.length > 0) {
        rolls.push({
          id: dir.name,
          name: dir.name,
          path: rollPath,
          photos: rollImages.map(f => ({
            name: f.name,
            path: path.join(rollPath, f.name),
          }))
        });
      }
    }

    // Also include direct images as a roll if mixed
    if (directImages.length > 0) {
      const photos = directImages
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map(f => ({
          name: f.name,
          path: path.join(dirPath, f.name),
        }));
      rolls.unshift({
        id: '__root__',
        name: path.basename(dirPath),
        path: dirPath,
        photos
      });
    }

    res.json({ mode: rolls.length <= 1 ? 'single' : 'multi', rolls });
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: 'Failed to scan directory', details: error.message });
  }
});

// Generate and serve thumbnail
router.get('/thumbnail', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });

  await ensureCacheDir();

  // Create cache key from path + mtime
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) return res.status(404).json({ error: 'File not found' });

  const cacheKey = Buffer.from(filePath + stat.mtimeMs).toString('base64url');
  const cachePath = path.join(THUMB_CACHE_DIR, `${cacheKey}.webp`);

  try {
    // Check cache
    await fs.access(cachePath);
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    createReadStream(cachePath).pipe(res);
  } catch {
    // Generate thumbnail
    try {
      const buffer = await sharp(filePath)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Save to cache
      await fs.writeFile(cachePath, buffer);

      res.set('Content-Type', 'image/webp');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err) {
      console.error('Thumbnail generation failed:', err.message);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  }
});

// Serve full image (for preview)
router.get('/photo', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });

  try {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tif': 'image/tiff', '.tiff': 'image/tiff',
    };

    // For TIFF files, convert to JPEG for browser display
    if (ext === '.tif' || ext === '.tiff') {
      const buffer = await sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      res.set('Content-Type', 'image/jpeg');
      res.send(buffer);
    } else {
      res.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to serve photo' });
  }
});

export default router;
