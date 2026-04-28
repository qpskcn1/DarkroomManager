import express from 'express';
import { ExifTool } from 'exiftool-vendored';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();
const exiftool = new ExifTool();

router.post('/process', async (req, res) => {
  const { rolls, targetDir } = req.body;
  const results = [];

  try {
    for (const roll of rolls) {
      const rollResults = [];
      const metadata = roll.metadata || {};
      
      // Ensure export directory exists
      const exportPath = path.join(targetDir, 'Export', roll.name);
      await fs.mkdir(exportPath, { recursive: true });

      for (const photo of roll.photos) {
        try {
          const exifData = {
            Make: metadata.make || '',
            Model: metadata.model || '',
            LensMake: metadata.lensMake || '',
            LensModel: metadata.lens || '',
            FocalLength: parseFloat(metadata.focalLength) || 0,
            Artist: 'Antigravity Darkroom',
            ISO: parseInt(metadata.iso) || 400,
          };

          // Build bilingual descriptions
          const formatStr = metadata.format ? `[${metadata.format}] ` : '';
          const filmStr = metadata.filmStock ? `${metadata.filmStock} ` : '';
          const zhDesc = photo.descriptionZh ? ` | ${photo.descriptionZh}` : '';
          const enDesc = photo.descriptionEn ? `${filmStr}— ${photo.descriptionEn}` : filmStr;

          // Unicode prefix is essential for macOS to display Chinese correctly in UserComment
          exifData.UserComment = `Unicode:${formatStr}${filmStr}${zhDesc}`;
          exifData.XPComment = `${formatStr}${filmStr}${zhDesc}`;
          exifData.ImageDescription = enDesc;

          if (photo.keywords && photo.keywords.length > 0) {
            exifData.Subject = photo.keywords;
            exifData.Keywords = photo.keywords;
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

          // Write EXIF to original file (optional, but good for consistency)
          await exiftool.write(photo.path, exifData, ['-overwrite_original', '-charset', 'filename=utf8']);

          // Copy to Export directory
          const ext = path.extname(photo.name);
          const baseName = path.basename(photo.name, ext);
          const exportName = `${baseName}-positive${ext}`;
          const exportFilePath = path.join(exportPath, exportName);

          await fs.copyFile(photo.path, exportFilePath);

          // Write EXIF to exported file
          await exiftool.write(exportFilePath, exifData, ['-overwrite_original', '-charset', 'filename=utf8']);

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
            success: false,
            error: error.message,
          });
        }
      }
      results.push({ roll: roll.name, photos: rollResults });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
