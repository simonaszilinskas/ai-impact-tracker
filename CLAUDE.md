# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Impact Tracker is a Chrome/Firefox browser extension (Manifest V3) that estimates the environmental impact of ChatGPT conversations. It tracks messages, estimates token counts, calculates energy consumption using the EcoLogits methodology, and displays relatable equivalents (YouTube streaming time, light bulb runtime, phone charges, elevator floors).

## Commands

```bash
# Run all tests
npm test

# Run individual test files
node test-refactoring.js    # Tests energy-calculator.js shared module
node verify-fix.js          # Tests energy calculation correctness
node test-global-scale.js   # Tests global scale comparison feature
```

There is no build step — the extension loads raw JS files directly. To test in browser, load as an unpacked extension via `chrome://extensions` with Developer Mode enabled.

## Architecture

### Module System (Dual Context)

The key architectural pattern is that `energy-calculator.js` runs in **two different contexts**:

1. **Content script context** — loaded via `manifest.json` before `content.js`, functions attached to `window` global scope
2. **Popup context** — loaded via `<script>` tag in `popup.html`, also uses `window` globals
3. **Node.js test context** — uses CommonJS `module.exports`

Each file checks its environment (`typeof window`, `typeof module`) to export appropriately. The same pattern applies to `global-scale.js`.

### Core Files

- **energy-calculator.js** — Shared energy/emissions calculation module implementing EcoLogits methodology. Two estimation methods: `community` (academic research) and `altman` (Sam Altman's estimate). All constants (GPT-5 model params, EcoLogits coefficients) live here.
- **content.js** — Content script injected into ChatGPT pages. Intercepts fetch requests (SSE streams), observes DOM mutations, extracts user/assistant messages, calculates energy per exchange, persists to `chrome.storage.local`.
- **popup.js** — Popup UI logic. Reads logs from storage, displays today/lifetime stats, handles estimation method switching (recalculates all stored logs when method changes), shows environmental equivalents.
- **global-scale.js** — Scales user's daily average to world population and compares against reference dataset of countries/cities/continents annual energy consumption.
- **background.js** — Minimal service worker handling install/update lifecycle and storage initialization.
- **popup.html** — Popup UI markup.

### Data Flow

1. `content.js` intercepts ChatGPT API responses and observes DOM for message pairs
2. Token count estimated as `Math.ceil(text.length / 4)`
3. `calculateEnergyAndEmissions()` from `energy-calculator.js` computes Wh and CO2
4. Logs stored in `chrome.storage.local` under key `chatgptLogs`
5. `popup.js` reads logs from storage, computes equivalents, and renders stats
6. When estimation method changes in popup, all logs are recalculated and content script is notified via `chrome.runtime.sendMessage`

### Chrome Extension Permissions

- `storage` — for persisting conversation logs locally
- `host_permissions` — `https://chatgpt.com/*` and `https://chat.openai.com/*`

## Key Constants

Energy calculation uses EcoLogits methodology constants in `energy-calculator.js`. The model is configured for GPT-5 (300B total params, 60B active params MoE). Two estimation methods produce ~77x difference in energy values.
