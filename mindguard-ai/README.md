# MindGuard AI

AI-powered mental health crisis detection. Uses Google Gemini — not keyword lists.

## Setup (you do this once, not the user)

1. Get free key → https://aistudio.google.com/app/apikey
2. Open config.js → paste your key into GEMINI_API_KEY
3. Load unpacked into Chrome/Brave/Edge at chrome://extensions

That's it. Users install the extension and it works silently with no prompts.

## Files
- config.js      ← YOUR API KEY GOES HERE
- manifest.json
- content.js     ← monitors inputs, shows overlay
- background.js  ← Gemini AI + keyword fallback
- overlay.css    ← overlay styles
- popup.html     ← toolbar popup

## Gemini free tier: 15 req/min, 1M tokens/day, $0, no credit card
