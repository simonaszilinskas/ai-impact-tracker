/**
 * AI Impact Tracker - Provider Abstraction Layer
 * ===============================================
 *
 * This module defines the provider interface for different AI platforms.
 * Each provider specifies DOM selectors, token estimation logic, and
 * model-specific parameters for energy calculations.
 *
 * Adding a new provider:
 * 1. Create a provider object with the required fields
 * 2. Add it to the PROVIDERS array
 * 3. Update manifest.json with host permissions
 *
 * @module providers
 */

/**
 * Provider interface definition:
 *
 * @typedef {Object} Provider
 * @property {string} id - Unique identifier (e.g., 'chatgpt', 'claude')
 * @property {string} name - Display name (e.g., 'ChatGPT', 'Claude')
 * @property {string[]} urlPatterns - URL patterns to match (e.g., ['chatgpt.com', 'chat.openai.com'])
 * @property {Object} selectors - DOM selectors for finding messages
 * @property {string[]} selectors.userMessage - Selectors for user messages (tried in order)
 * @property {string[]} selectors.assistantMessage - Selectors for assistant messages (tried in order)
 * @property {string[]} [selectors.conversationContainer] - Optional selectors for conversation container
 * @property {Function} estimateTokens - Function to estimate token count from text
 * @property {Object} modelParams - Model-specific parameters for energy calculation
 * @property {number} modelParams.totalParams - Total model parameters (in billions)
 * @property {number} modelParams.activeParams - Active parameters (in billions)
 * @property {number} modelParams.activeParamsBillions - Active params for formula
 * @property {number} modelParams.activationRatio - Activation ratio (activeParams/totalParams)
 * @property {number} [modelParams.activeParamsMin] - Min active params (for MoE models)
 * @property {number} [modelParams.activeParamsMax] - Max active params (for MoE models)
 * @property {Object} [apiPatterns] - Optional API endpoint patterns for intercepting requests
 * @property {string} [apiPatterns.conversationMatch] - Regex pattern or string to match conversation API
 * @property {Function} [apiPatterns.extractConversationId] - Function to extract conversation ID from URL
 */

/**
 * ChatGPT Provider Configuration
 */
const CHATGPT_PROVIDER = {
  id: 'chatgpt',
  name: 'ChatGPT',
  urlPatterns: ['chatgpt.com', 'chat.openai.com'],

  selectors: {
    userMessage: [
      '[data-message-author-role="user"]',
      '[data-role="user"]',
      '.user-message',
      '[data-testid="user-message"]'
    ],
    assistantMessage: [
      '[data-message-author-role="assistant"]',
      '[data-role="assistant"]',
      '.assistant-message',
      '[data-testid="assistant-message"]'
    ],
    conversationContainer: [
      'main',
      '[role="main"]',
      '.conversation-content'
    ]
  },

  /**
   * Estimates token count for ChatGPT
   * Uses 4 characters ≈ 1 token heuristic for English text
   *
   * @param {string} text - Input text
   * @returns {number} Estimated token count
   */
  estimateTokens: (text) => {
    return Math.ceil(text.length / 4);
  },

  /**
   * GPT-5 model parameters
   * Based on 300B total, 60B active (MoE architecture)
   */
  modelParams: {
    totalParams: 300e9,        // 300 billion total parameters
    activeParams: 60e9,        // 60 billion active parameters (average)
    activeParamsBillions: 60,  // Active params in billions (for formula)
    activationRatio: 0.2,      // 20% activation ratio (60B/300B)
    activeParamsMin: 30e9,     // Min active parameters (30 billion)
    activeParamsMax: 90e9      // Max active parameters (90 billion)
  },

  apiPatterns: {
    conversationMatch: 'conversation',

    /**
     * Extracts conversation ID from ChatGPT URL
     * Format: /c/{conversation_id}
     *
     * @param {string} url - Full URL
     * @returns {string|null} Conversation ID or null
     */
    extractConversationId: (url) => {
      const match = url.match(/\/c\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    }
  }
};

/**
 * Claude Provider Configuration
 */
const CLAUDE_PROVIDER = {
  id: 'claude',
  name: 'Claude',
  urlPatterns: ['claude.ai'],

  selectors: {
    userMessage: [
      '[data-testid="user-message"]',
      '.font-user-message',
      '[data-is-author-role="user"]'
    ],
    assistantMessage: [
      '.standard-markdown',  // Full message container
      '[data-is-author-role="assistant"]'
      // .font-claude-response-body not used - matches individual paragraphs, not full message
    ],
    conversationContainer: [
      'main',
      '[role="main"]',
      '.conversation'
    ]
  },

  /**
   * Estimates token count for Claude
   * Uses 4 characters ≈ 1 token heuristic (same as GPT)
   *
   * @param {string} text - Input text
   * @returns {number} Estimated token count
   */
  estimateTokens: (text) => {
    return Math.ceil(text.length / 4);
  },

  /**
   * Claude model parameters
   *
   * Based on EcoLogits v0.9.x estimates for Claude 3 Opus:
   * - Total: ~2T params, MoE architecture
   * - Active: 200B-600B range (using 400B midpoint)
   * - Used as proxy for all Claude models (3.5 Sonnet, etc.)
   *
   * Note: EcoLogits estimates for Claude have low precision due to lack of
   * public architecture data from Anthropic. Source synced 2025-03 from
   * https://ecologits.ai/latest/methodology/proprietary_models/
   */
  modelParams: {
    totalParams: 2000e9,       // 2 trillion (EcoLogits estimate for Claude 3 Opus)
    activeParams: 400e9,       // 400B active (midpoint of 200B-600B range)
    activeParamsBillions: 400, // Active params in billions (for formula)
    activationRatio: 0.2       // 20% activation (400B/2000B MoE)
  },

  apiPatterns: {
    conversationMatch: 'chat_conversations',

    /**
     * Extracts conversation ID from Claude URL
     * Format: /chat/{conversation_id}
     *
     * @param {string} url - Full URL
     * @returns {string|null} Conversation ID or null
     */
    extractConversationId: (url) => {
      const match = url.match(/\/chat\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    }
  }
};

/**
 * All registered providers
 */
const PROVIDERS = [
  CHATGPT_PROVIDER,
  CLAUDE_PROVIDER
];

/**
 * Detects the active provider based on current URL
 *
 * @param {string} [url=window.location.href] - URL to check
 * @returns {Provider|null} Matching provider or null
 */
function detectProvider(url = window.location.href) {
  for (const provider of PROVIDERS) {
    for (const pattern of provider.urlPatterns) {
      if (url.includes(pattern)) {
        return provider;
      }
    }
  }
  return null;
}

/**
 * Gets provider by ID
 *
 * @param {string} id - Provider ID
 * @returns {Provider|null} Matching provider or null
 */
function getProviderById(id) {
  return PROVIDERS.find(p => p.id === id) || null;
}

/**
 * Gets all registered providers
 *
 * @returns {Provider[]} Array of all providers
 */
function getAllProviders() {
  return [...PROVIDERS];
}

// Make functions and providers available globally for content scripts
// and as CommonJS exports for Node.js testing
if (typeof window !== 'undefined') {
  // Browser context - make available globally
  window.PROVIDERS = PROVIDERS;
  window.CHATGPT_PROVIDER = CHATGPT_PROVIDER;
  window.CLAUDE_PROVIDER = CLAUDE_PROVIDER;
  window.detectProvider = detectProvider;
  window.getProviderById = getProviderById;
  window.getAllProviders = getAllProviders;
}

// CommonJS exports for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PROVIDERS,
    CHATGPT_PROVIDER,
    CLAUDE_PROVIDER,
    detectProvider,
    getProviderById,
    getAllProviders
  };
}
