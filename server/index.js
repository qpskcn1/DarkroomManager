import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exiftool } from 'exiftool-vendored';
import photosRouter from './routes/photos.js';
import presetsRouter from './routes/presets.js';
import metadataRouter from './routes/metadata.js';
import filesystemRouter from './routes/filesystem.js';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api', photosRouter);
app.use('/api', presetsRouter);
app.use('/api', metadataRouter);
app.use('/api', filesystemRouter);
app.use('/api', aiRouter);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down, closing exiftool...');
  await exiftool.end();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(port, () => {
  console.log(`🎞️  DarkroomManager API running at http://localhost:${port}`);
});
