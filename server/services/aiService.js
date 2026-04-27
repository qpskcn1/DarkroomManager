import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs/promises';
import sharp from 'sharp';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Load env vars
import dotenv from 'dotenv';
dotenv.config();

const PROXY = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '';
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';

/**
 * Generate a small base64 thumbnail for AI analysis
 * Keeps tokens/cost low while preserving enough detail for scene understanding
 */
async function photoToBase64(filePath, size = 320) {
  const buffer = await sharp(filePath)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 45 })
    .toBuffer();
  return buffer.toString('base64');
}

/**
 * Build the analysis prompt for a roll of photos
 */
function buildAnalyzeRollPrompt(rollInfo) {
  const { cameraInfo, filmStock, photoCount, possibleDateRange } = rollInfo;

  return `You are an expert photo analyst helping organize scanned film photographs.

I have a roll of ${photoCount} film photos that need to be grouped by shooting date/session and described.

Camera: ${cameraInfo || 'Unknown'}
Film: ${filmStock || 'Unknown'}
${possibleDateRange ? `Possible date range: ${possibleDateRange}` : ''}

For each group of photos that appear to be from the same shooting session, provide:
1. The photo index range (1-based)
2. A brief reasoning for why they belong together
3. Season/time-of-day estimation if possible

For each individual photo, provide:
1. A short English description (1 sentence, for EXIF ImageDescription)
2. A short Chinese description (1 sentence, for EXIF UserComment)  
3. Keywords/tags in English (comma separated, for EXIF Keywords)

IMPORTANT: Respond in valid JSON with this exact structure:
{
  "groups": [
    {
      "startIndex": 1,
      "endIndex": 14,
      "reasoning": "Indoor restaurant scene, consistent warm lighting",
      "seasonGuess": "Could be any season (indoor)",
      "timeOfDay": "Evening (warm artificial lighting)"
    }
  ],
  "photos": [
    {
      "index": 1,
      "descriptionEn": "Two people dining at a warmly lit restaurant table",
      "descriptionZh": "两个人在温暖灯光的餐厅用餐",
      "keywords": "restaurant, dining, warm light, indoor, portrait"
    }
  ]
}`;
}

// =========================================
// Gemini Provider
// =========================================
async function analyzeWithGemini(photoBase64Array, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  // Configure with proxy if needed
  const fetchOptions = {};
  if (PROXY) {
    fetchOptions.httpAgent = new HttpsProxyAgent(PROXY);
    fetchOptions.httpsAgent = new HttpsProxyAgent(PROXY);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3.1-flash-lite-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  });

  // Build parts: text prompt + all images
  const parts = [{ text: prompt }];
  
  for (let i = 0; i < photoBase64Array.length; i++) {
    parts.push({ text: `\n\nPhoto #${i + 1}:` });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: photoBase64Array[i],
      }
    });
  }

  // If proxy is set, we need to use a custom fetch
  let result;
  if (PROXY) {
    const agent = new HttpsProxyAgent(PROXY);
    const customFetch = (url, options) => {
      return fetch(url, { ...options, agent });
    };
    // Re-init with proxy support
    const genAIProxy = new GoogleGenerativeAI(apiKey);
    const modelProxy = genAIProxy.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      }
    });
    result = await modelProxy.generateContent({ contents: [{ parts }] });
  } else {
    result = await model.generateContent({ contents: [{ parts }] });
  }

  const text = result.response.text();
  return JSON.parse(text);
}

// =========================================
// OpenAI Provider
// =========================================
async function analyzeWithOpenAI(photoBase64Array, prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');

  const clientOpts = { apiKey };
  if (PROXY) {
    clientOpts.httpAgent = new HttpsProxyAgent(PROXY);
  }

  const openai = new OpenAI(clientOpts);

  // Build messages with images
  const imageContent = photoBase64Array.map((base64, i) => ([
    { type: 'text', text: `Photo #${i + 1}:` },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } }
  ])).flat();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageContent,
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
}

// =========================================
// Public API
// =========================================

/**
 * Analyze a roll of photos using AI
 * @param {Array<string>} photoPaths - Array of absolute file paths
 * @param {Object} rollInfo - Camera, film, date range info
 * @returns {Object} Analysis result with groups and per-photo descriptions
 */
export async function analyzeRoll(photoPaths, rollInfo) {
  // Generate thumbnails for all photos
  console.log(`🤖 Generating thumbnails for ${photoPaths.length} photos...`);
  
  // Process in parallel but with concurrency limit
  const BATCH_SIZE = 10;
  const base64Array = [];
  
  for (let i = 0; i < photoPaths.length; i += BATCH_SIZE) {
    const batch = photoPaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(p => photoToBase64(p).catch(err => {
        console.error(`Failed to process ${p}:`, err.message);
        return null;
      }))
    );
    base64Array.push(...results);
  }

  // Filter out failed photos
  const validPhotos = base64Array.filter(b => b !== null);
  if (validPhotos.length === 0) {
    throw new Error('No photos could be processed for AI analysis');
  }

  // For very large rolls, we may need to split into batches
  // Most vision models support 20+ images per request
  // Gemini supports up to 3600 images, so no worries there
  const MAX_PHOTOS_PER_REQUEST = 40;
  
  const prompt = buildAnalyzeRollPrompt({
    ...rollInfo,
    photoCount: validPhotos.length,
  });

  console.log(`🤖 Sending ${validPhotos.length} photos to ${AI_PROVIDER} for analysis...`);

  const photosToSend = validPhotos.slice(0, MAX_PHOTOS_PER_REQUEST);

  const provider = process.env.AI_PROVIDER || AI_PROVIDER;
  
  let result;
  if (provider === 'openai') {
    result = await analyzeWithOpenAI(photosToSend, prompt);
  } else {
    result = await analyzeWithGemini(photosToSend, prompt);
  }

  console.log(`🤖 Analysis complete: ${result.groups?.length || 0} groups, ${result.photos?.length || 0} photo descriptions`);
  
  return result;
}

/**
 * Check if AI is configured and available
 */
export function getAiStatus() {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasProxy = !!PROXY;

  return {
    available: hasGemini || hasOpenAI,
    provider,
    hasGemini,
    hasOpenAI,
    hasProxy,
    proxyUrl: hasProxy ? PROXY : null,
  };
}
