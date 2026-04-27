import { Router } from 'express';
import { exiftool } from 'exiftool-vendored';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Process a batch of rolls: write EXIF + copy to Export
router.post('/process', async (req, res) => {
  const { rolls } = req.body;

  if (!rolls || !Array.isArray(rolls)) {
    return res.status(400).json({ error: 'Invalid request: rolls array required' });
  }

  const allResults = [];

  for (const roll of rolls) {
    const { photos, metadata, outputDir } = roll;

    // Ensure Export directory exists
    const exportPath = outputDir || path.join(roll.rollPath, 'Export');
    await fs.mkdir(exportPath, { recursive: true });

    const rollResults = [];

    for (const photo of photos) {
      try {
        // Build EXIF metadata object
        const exifData = {};

        if (metadata.make) exifData.Make = metadata.make;
        if (metadata.model) exifData.Model = metadata.model;
        if (metadata.lens) exifData.LensModel = metadata.lens;
        if (metadata.lensMake) exifData.LensMake = metadata.lensMake;
        if (metadata.focalLength) {
          const fl = parseFloat(metadata.focalLength);
          if (!isNaN(fl)) exifData.FocalLength = `${fl} mm`;
        }
        if (metadata.iso) {
          const isoVal = parseInt(metadata.iso);
          if (!isNaN(isoVal)) exifData.ISO = isoVal;
        }
        if (metadata.aperture) {
          const ap = metadata.aperture.toString().replace('f/', '').replace('f', '');
          const apVal = parseFloat(ap);
          if (!isNaN(apVal)) exifData.FNumber = apVal;
        }

        // Film info stored in multiple fields for compatibility
        if (metadata.filmStock) {
          // If AI descriptions are available, combine them
          const parts = [`Film: ${metadata.filmStock}`];
          if (photo.descriptionZh) parts.push(photo.descriptionZh);
          exifData.UserComment = parts.join(' | ');
        } else if (photo.descriptionZh) {
          exifData.UserComment = photo.descriptionZh;
        }

        // ImageDescription: English description or film stock
        if (photo.descriptionEn) {
          exifData.ImageDescription = metadata.filmStock
            ? `${metadata.filmStock} — ${photo.descriptionEn}`
            : photo.descriptionEn;
        } else if (metadata.filmStock) {
          exifData.ImageDescription = metadata.filmStock;
        }

        // Keywords/Subject for searchability
        if (photo.keywords) {
          const keywordsArray = photo.keywords.split(',').map(k => k.trim()).filter(Boolean);
          if (metadata.filmStock) keywordsArray.push(metadata.filmStock);
          if (metadata.make) keywordsArray.push(metadata.make);
          if (metadata.model) keywordsArray.push(metadata.model);
          keywordsArray.push('film');
          exifData.Subject = keywordsArray;
          exifData.Keywords = keywordsArray.join(', ');
        }

        // Scanner info
        if (metadata.scanner) {
          exifData.ScannerMake = metadata.scanner;
        }

        // Date - per photo (from date groups)
        if (photo.date) {
          const dateStr = photo.date.replace(/-/g, ':') + ' 12:00:00';
          exifData.DateTimeOriginal = dateStr;
          exifData.CreateDate = dateStr;
          exifData.ModifyDate = dateStr;
        }

        // Write EXIF to original file
        await exiftool.write(photo.path, exifData, ['-overwrite_original']);

        // Copy to Export directory with -positive suffix
        const ext = path.extname(photo.name);
        const baseName = path.basename(photo.name, ext);
        const exportName = `${baseName}-positive${ext}`;
        const exportFilePath = path.join(exportPath, exportName);

        await fs.copyFile(photo.path, exportFilePath);

        // Also write EXIF to exported file
        await exiftool.write(exportFilePath, exifData, ['-overwrite_original']);

        rollResults.push({
          name: photo.name,
          path: photo.path,
          exportPath: exportFilePath,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing ${photo.name}:`, error.message);
        rollResults.push({
          name: photo.name,
          path: photo.path,
          success: false,
          error: error.message,
        });
      }
    }

    allResults.push({
      rollId: roll.rollId,
      rollName: roll.rollName,
      results: rollResults,
      successCount: rollResults.filter(r => r.success).length,
      totalCount: rollResults.length,
    });
  }

  res.json({ results: allResults });
});

// Read EXIF from a single photo (for verification)
router.get('/read-exif', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });

  try {
    const tags = await exiftool.read(filePath);
    res.json({
      Make: tags.Make,
      Model: tags.Model,
      LensModel: tags.LensModel,
      LensMake: tags.LensMake,
      FocalLength: tags.FocalLength,
      ISO: tags.ISO,
      FNumber: tags.FNumber,
      DateTimeOriginal: tags.DateTimeOriginal,
      UserComment: tags.UserComment,
      ImageDescription: tags.ImageDescription,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read EXIF' });
  }
});

export default router;
