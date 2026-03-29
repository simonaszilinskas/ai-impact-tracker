# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Impact Tracker is a Chrome/Firefox browser extension (Manifest V3) that estimates the environmental impact of AI chat conversations (ChatGPT and Claude). It tracks messages, estimates token counts, calculates energy consumption using the EcoLogits methodology with provider-specific model parameters, and displays relatable equivalents (YouTube streaming time, light bulb runtime, phone charges, elevator floors).

## Commands

```bash
# Run all tests
npm test

# Run individual test files
node test-refactoring.js    # Tests energy-calculator.js shared module
node verify-fix.js          # Tests energy calculation correctness
node test-global-scale.js   # Tests global scale comparison feature
node test-providers.js      # Tests provider abstraction layer
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

- **providers.js** — Provider abstraction layer defining AI platform configurations (ChatGPT, Claude). Each provider specifies DOM selectors, token estimation logic, model parameters, and API patterns. Makes it easy to add new AI platforms.
- **energy-calculator.js** — Shared energy/emissions calculation module implementing EcoLogits v0.9.x methodology. Takes provider-specific model params to calculate energy consumption.
- **content.js** — Content script injected into supported AI chat pages. Detects active provider, observes DOM mutations, extracts user/assistant messages, calculates energy per exchange using provider's model params, persists to `chrome.storage.local`.
- **popup.js** — Popup UI logic. Reads logs from storage, displays today/lifetime stats, recalculates stored logs using provider-specific params, shows environmental equivalents.
- **global-scale.js** — Scales user's daily average to 900M AI chat WAU and compares against reference dataset of countries/cities/continents annual electricity consumption.
- **background.js** — Minimal service worker handling install/update lifecycle and storage initialization.
- **popup.html** — Popup UI markup.

### Data Flow

1. `content.js` detects active provider (ChatGPT or Claude) via `providers.js`
2. Observes DOM for message pairs using provider-specific selectors
3. Token count estimated as `Math.ceil(text.length / 4)` using provider's `estimateTokens()` function
4. `calculateEnergyAndEmissions()` from `energy-calculator.js` computes Wh and CO2 using provider's model params
5. Logs stored in `chrome.storage.local` under key `aiChatLogs` (includes provider ID)
6. `popup.js` reads logs from storage, recalculates with current formula using provider-specific params, computes equivalents, and renders stats

### Chrome Extension Permissions

- `storage` — for persisting conversation logs locally
- `host_permissions` —
  - ChatGPT: `https://chatgpt.com/*` and `https://chat.openai.com/*`
  - Claude: `https://claude.ai/*`

## Key Constants

Energy calculation uses EcoLogits v0.9.x methodology constants in `energy-calculator.js`. Model parameters are provider-specific:
- **ChatGPT (GPT-5)**: 300B total params, 60B active params (MoE architecture)
- **Claude (3 Opus proxy)**: 2T total params, 400B active params (MoE architecture, ~14.8× more energy than ChatGPT)

All calculations assume H100 GPUs, batch size 64, and USA electricity mix emission factor.
