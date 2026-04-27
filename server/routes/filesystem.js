import { Router } from 'express';
import { filmStocks } from '../data/filmStocks.js';

const router = Router();

// GET film stocks database
router.get('/film-stocks', (req, res) => {
  res.json({ filmStocks });
});

export default router;
