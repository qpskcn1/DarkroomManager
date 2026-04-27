# 🎞️ DarkroomManager

A workflow tool for film photographers to batch-edit EXIF metadata on lab scans. Built for photographers who shoot multiple rolls, get them developed at labs, and need to tag hundreds of scans with camera, lens, film stock, and date information — fast.

> Because lab scans don't carry any EXIF data, and doing it manually in Lightroom/NLP one photo at a time is painful.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node-20+-339933?logo=node.js&logoColor=white)

## The Problem

Film photographers who shoot with multiple cameras and film stocks face a tedious workflow:

1. Get scans back from lab (TIFF/JPEG, zero EXIF data)
2. Open in Lightroom, manually enter camera make/model/lens for each photo
3. Manually enter film stock, ISO
4. Try to remember which photos were shot on which date
5. Repeat for every single roll × every single frame

**DarkroomManager** turns this into a 4-step wizard that processes entire rolls at once.

## Features

### 📂 Smart Import
- Point to a `YYYYMM` folder on your NAS → auto-detects each subfolder as a separate roll
- Thumbnail previews generated on-the-fly via `sharp`
- Supports JPEG, TIFF, PNG, WebP

### 📷 Camera & Film Presets
- **17 built-in camera presets** — Leica MP, Contax G2/T3, Mamiya 7ii, Rolleiflex 2.8F, Pentax 17, Canon EOS 5, Nikon FM2, Minolta TC-1, and more
- **40+ film stocks** — Portra, Ektar, Gold, UltraMax, HP5, Tri-X, Cinestill, Kodak Vision3, etc.
- **Batch mode** — apply the same preset to multiple rolls at once
- Backward-compatible with Negative Lab Pro preset format

### 📅 Date Grouping
- **Same Day mode** — one date for the entire roll
- **Group mode** — split a roll into date segments on a visual photo strip
  - Click between thumbnails to create date boundaries
  - Each group gets its own date
  - Color-coded groups with split/merge controls

### 🤖 AI Analysis (Optional)
- **Smart date grouping** — AI analyzes photo content to suggest which frames belong to the same shooting session
- **Bilingual scene descriptions** — auto-generated English + Chinese descriptions written to EXIF
- **Keyword tagging** — searchable tags (e.g., `street, tokyo, neon, rain`) for Apple Photos / Lightroom
- **Season & time estimation** — helps narrow down when photos were taken
- Supports **Google Gemini Flash** and **OpenAI GPT-4o-mini**
- Proxy support for regions with restricted access

### ✨ Batch EXIF & Export
- Writes to EXIF: `Make`, `Model`, `LensModel`, `LensMake`, `FocalLength`, `ISO`, `DateTimeOriginal`, `ImageDescription`, `UserComment`, `Subject`, `Keywords`
- Auto-copies processed files to `Export/` subdirectory
- Per-photo success/failure reporting

## Directory Structure

DarkroomManager expects your NAS to be organized like this:

```
Darkroom/
└── YYYY/
    └── YYYYMM/
        ├── 34559/                    ← Roll (lab order number)
        │   ├── 000345590001.jpg      ← Lab scans (no EXIF)
        │   ├── 000345590002.jpg
        │   ├── ...
        │   └── Export/               ← Created by DarkroomManager
        │       ├── 000345590001-positive.jpg  ← With full EXIF
        │       └── ...
        ├── 34560/                    ← Another roll
        └── ...
```

## Getting Started

### Prerequisites

- **Node.js 20+** (required for ES modules + sharp)
- **ExifTool** (bundled via `exiftool-vendored`, no manual install needed)

### Install

```bash
git clone git@github.com:qpskcn1/DarkroomManager.git
cd DarkroomManager
npm install
```

### Run

```bash
npm run dev
```

This starts both servers:
- **Frontend** → http://localhost:5173
- **API** → http://localhost:3000

### AI Setup (Optional)

1. Click the 🤖 button in the top-right corner
2. Enter your API key (Gemini or OpenAI)
3. If needed, configure an HTTP proxy
4. In the Date step, click **"✨ AI Analyze"** on any roll

Or manually create a `.env` file:

```env
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
# HTTP_PROXY=http://127.0.0.1:7890
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 |
| Backend | Express.js |
| EXIF | exiftool-vendored |
| Thumbnails | sharp (WebP, cached) |
| AI | @google/generative-ai, openai |
| Design | Custom CSS (darkroom-inspired palette) |

## Project Structure

```
├── server/
│   ├── index.js                 # Express entry point
│   ├── routes/
│   │   ├── photos.js            # Scan, thumbnails, image serving
│   │   ├── presets.js           # Camera preset CRUD
│   │   ├── metadata.js          # EXIF writing + export
│   │   ├── filesystem.js        # Film stock database
│   │   └── ai.js               # AI analysis endpoints
│   ├── services/
│   │   └── aiService.js         # Gemini / OpenAI integration
│   └── data/
│       └── filmStocks.js        # 40+ film stock database
├── src/
│   ├── App.jsx                  # Main app + wizard state
│   ├── index.css                # Design system
│   └── components/
│       ├── Wizard.jsx           # Step navigation
│       ├── ImportStep.jsx       # ① Directory scanning
│       ├── RollSetupStep.jsx    # ② Camera + film selection
│       ├── DateStep.jsx         # ③ Date tagging + AI
│       ├── ReviewStep.jsx       # ④ Review + batch process
│       └── AiSettings.jsx       # AI configuration modal
├── presets/                     # 17 camera preset JSON files
├── vite.config.js               # Vite + API proxy
└── .env.example                 # Environment template
```

## Camera Presets

Presets are JSON files in `/presets/`, compatible with Negative Lab Pro's EXIF format:

| Camera | Lens | Scan Method |
|--------|------|------------|
| Leica MP | Summilux 35/1.4 Pre-Asph | Lab (Noritsu) |
| Leica MP | Summicron 35/2 ASPH | — |
| Leica iiia | 50mm f/3.5 | Lab (Noritsu) |
| Contax G2 | Planar 35/2 | Lab (Noritsu) |
| Contax G2 | Biogon 28/2.8 | Lab (Noritsu) |
| Contax G2 | Biogon 45/2 | Lab (Noritsu) |
| Contax T3 | Sonnar 35/2.8 | Lab (Noritsu) |
| Mamiya 7ii | 80mm f/4 N L | Camera Scan (Z7 II) |
| Mamiya RZ67 Pro II | Sekor Z 110/2.8 | Lab (Noritsu) |
| Rolleiflex 2.8F | Xenotar 80/2.8 | Lab / Camera Scan |
| Pentax 17 | 25mm (half-frame) | Lab (Noritsu) |
| Canon EOS 5 | EF 50/1.8 | Lab (Noritsu) |
| Canon Kiss 7 | EF 40/2.8 | Lab (Noritsu) |
| Nikon FM2 | Nikkor 50/1.4 | Lab (Noritsu) |
| Minolta TC-1 | G-Rokkor 28/3.5 | Lab (Noritsu) |

## License

MIT
