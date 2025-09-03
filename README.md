# Gemini Material Transfer

An AI-powered web application that intelligently transfers materials and textures from one image to another using Google's Gemini API. Select a material from any source image and apply it to a specific area in your target image with natural, context-aware results.

## Demo

Try the demo on [Google AI Studio](https://ai.studio/apps/drive/1uCKcguQjBtrlv6jKMvbUadK6f0EvnAZR)

https://github.com/user-attachments/assets/c420377a-6f1c-4622-8940-731c5c0a348a

## Features

- Click-based material selection from source image
- Brush-based area selection on target image
- AI-powered material transfer using Google's Gemini
- Interactive before/after comparison slider
- Real-time progress tracking with dynamic messages
- Debug modals for material and scene analysis
- Instant start with example images
- Support for various image formats

## Prerequisites

- Node.js
- Gemini API key

## Installation

```bash
npm install
```

## Setup

Set your Gemini API key in `.env.local`:

```
GEMINI_API_KEY=your_api_key_here
```

## Run

```bash
npm run dev
```

## License

MIT
