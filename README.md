# 🎞️ DarkroomManager

**DarkroomManager** is an AI-powered film metadata automation tool that streamlines the process of assigning camera presets, film stocks, and formats, while using Gemini's visual analysis for intelligent grouping and bilingual EXIF tagging.

> 一款专为胶片摄影师设计的元数据自动化工具，利用 AI 视觉能力彻底解放繁琐的 EXIF 录入工作。

## 🌟 Core Features

- **🚀 AI-Driven Grouping**: Intelligent scene analysis via Gemini to automatically group photos by shooting sessions.
- **📸 Smart Camera Presets**: Pre-configured metadata for 17+ classic cameras (Leica, Contax, Mamiya, etc.) including film format support.
- **🎨 Visual Workflow**: Immersive split-view editor with large previews, filmstrips, and interactive grouping controls.
- **🌐 Bilingual EXIF**: Automatically writes English and Chinese metadata (ImageDescription & UserComment) to ensure compatibility across all platforms.
- **⚡ Optimized for Speed**: Lightweight thumbnail processing and high-speed AI analysis pipeline.
- **🛡️ Character Encoding Fix**: Robust support for Chinese characters in EXIF headers (no more garbled text).

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite + Vanilla CSS (Premium Aesthetics)
- **Backend**: Node.js + Express
- **AI**: Google Gemini (3.1 Flash Lite) / OpenAI GPT-4o
- **Processing**: Sharp (Image) + ExifTool (Metadata)

## 🚀 Getting Started

1. **Configure Environment**: Create a `.env` file with your `GEMINI_API_KEY` and optional `HTTP_PROXY`.
2. **Start Server**: `npm run dev`
3. **Enjoy**: Import your film scans and let AI handle the rest.

---
*Created with ❤️ for Film Photographers.*
