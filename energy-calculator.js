/**
 * AI Impact Tracker - Shared Energy Calculator Module
 * ====================================================
 *
 * This module provides shared energy calculation functionality for both
 * content.js (content script) and popup.js (popup UI).
 *
 * This eliminates code duplication and ensures consistent calculations
 * across all contexts.
 *
 * Implements the EcoLogits v0.9.x methodology from:
 * https://ecologits.ai/latest/methodology/llm_inference/
 *
 * Note: This file is loaded in both content script and popup contexts.
 * - For content scripts: Loaded via manifest.json before content.js
 * - For popup: Loaded as ES6 module via popup.html
 *
 * @module energy-calculator
 */

// Check if we should use exports (for module context in popup)
// or just define in global scope (for content script context)
const isModuleContext = typeof module !== 'undefined' && module.exports;

/**
 * EcoLogits v0.9.x methodology constants for LLM energy estimation
 * Source: https://ecologits.ai/latest/methodology/llm_inference/
 *
 * GPU energy model fitted from ML.ENERGY Leaderboard (H100, vLLM, batch ≤512)
 * f_E(P_active, B) = α·exp(β·B)·P_active + γ
 *
 * Latency model: f_L(P_active, B) = α·P_active + β·B + γ
 */
const ECOLOGITS_CONSTANTS = {
  // GPU Energy model coefficients
  GPU_ENERGY_ALPHA: 1.1665273170451914e-06,
  GPU_ENERGY_BETA: -0.011205921025579175,
  GPU_ENERGY_GAMMA: 4.052928146734005e-05,

  // Latency model coefficients (s/token)
  LATENCY_ALPHA: 6.78e-4,   // Per billion active params
  LATENCY_BETA: 3.12e-4,    // Per batch element
  LATENCY_GAMMA: 1.94e-2,   // Base latency

  // Request batching (default concurrent requests per GPU)
  BATCH_SIZE: 64,

  // Infrastructure (NVIDIA H100 80GB / p5.48xlarge reference server)
  PUE: 1.20,                    // Power Usage Effectiveness (OpenAI datacenter)
  GPU_MEMORY: 80,               // H100 GPU memory (GB)
  SERVER_POWER_WITHOUT_GPU: 1.2, // Server power excluding GPUs (kW)
  INSTALLED_GPUS: 8,            // GPUs per server
  GPU_BITS: 16,                 // Weight quantization (16-bit)

  // OpenAI provider: USA electricity mix (kgCO2eq/kWh)
  EMISSION_FACTOR: 0.38355
};

/**
 * GPT-5 model parameters
 * Based on the latest model configuration
 */
const GPT5_PARAMS = {
  TOTAL_PARAMS: 300e9,        // 300 billion total parameters
  ACTIVE_PARAMS: 60e9,        // 60 billion active parameters (average of 30-90B range)
  ACTIVE_PARAMS_BILLIONS: 60, // Active params in billions (for formula)
  ACTIVATION_RATIO: 0.2,      // 20% activation ratio (average: 60B/300B)
  ACTIVE_PARAMS_MIN: 30e9,    // Minimum active parameters (30 billion)
  ACTIVE_PARAMS_MAX: 90e9     // Maximum active parameters (90 billion)
};

/**
 * Calculates energy usage and CO2 emissions for LLM inference
 * using the EcoLogits v0.9.x methodology.
 *
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @returns {Object} Energy and emissions data
 * @returns {number} returns.totalEnergy - Total energy consumption (Wh)
 * @returns {number} returns.co2Emissions - CO2 emissions (grams)
 * @returns {number} returns.numGPUs - Number of GPUs required
 * @returns {Object} returns.modelDetails - Additional model details
 *
 * @example
 * const result = calculateEnergyAndEmissions(100);
 * console.log(result.totalEnergy); // ~0.24 Wh
 */
function calculateEnergyAndEmissions(outputTokens) {
  const {
    GPU_ENERGY_ALPHA,
    GPU_ENERGY_BETA,
    GPU_ENERGY_GAMMA,
    LATENCY_ALPHA,
    LATENCY_BETA,
    LATENCY_GAMMA,
    BATCH_SIZE,
    PUE,
    GPU_MEMORY,
    SERVER_POWER_WITHOUT_GPU,
    INSTALLED_GPUS,
    GPU_BITS,
    EMISSION_FACTOR
  } = ECOLOGITS_CONSTANTS;

  const { TOTAL_PARAMS, ACTIVE_PARAMS, ACTIVE_PARAMS_BILLIONS, ACTIVATION_RATIO } = GPT5_PARAMS;

  // Step 1: GPU energy per token (kWh)
  // Exponential model: f_E(P_active, B) = α·exp(β·B)·P_active + γ, then /1000 for kWh
  const gpuEnergyPerToken_kWh = (GPU_ENERGY_ALPHA * Math.exp(GPU_ENERGY_BETA * BATCH_SIZE) * ACTIVE_PARAMS_BILLIONS + GPU_ENERGY_GAMMA) / 1000;

  // Step 2: GPU memory requirements and number of GPUs (power-of-2 rounding)
  // Memory stores the entire model: M = 1.2 × P_total × Q / 8
  const memoryRequired = 1.2 * TOTAL_PARAMS * GPU_BITS / 8; // in bytes
  const numGPUsRaw = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  const numGPUs = Math.pow(2, Math.ceil(Math.log2(numGPUsRaw))); // power-of-2 rounding

  // Step 3: Inference latency per token (seconds)
  // Linear model: f_L(P_active, B) = α·P_active + β·B + γ
  const latencyPerToken = LATENCY_ALPHA * ACTIVE_PARAMS_BILLIONS + LATENCY_BETA * BATCH_SIZE + LATENCY_GAMMA;
  const totalLatency = outputTokens * latencyPerToken;

  // Step 4: GPU energy for the request (kWh)
  const gpuEnergy_kWh = outputTokens * gpuEnergyPerToken_kWh;

  // Step 5: Server non-GPU energy (kWh), amortized over batch
  // E_server = (ΔT/3600) × P_server × (numGPUs/installed) × (1/B)
  const serverEnergy_kWh = (totalLatency / 3600) * SERVER_POWER_WITHOUT_GPU * (numGPUs / INSTALLED_GPUS) * (1 / BATCH_SIZE);

  // Step 6: Total request energy with PUE (convert to Wh)
  // E_request = PUE × (E_server + numGPUs × E_gpu)
  const totalEnergy = PUE * (serverEnergy_kWh + numGPUs * gpuEnergy_kWh) * 1000;

  // Ensure minimum energy value for visibility in UI
  const minEnergy = 0.01;
  const normalizedEnergy = Math.max(totalEnergy, minEnergy);

  // Step 7: Calculate CO2 emissions (grams)
  // Wh × kgCO2eq/kWh = gCO2eq (units cancel: Wh × kg/kWh = g)
  const co2Emissions = normalizedEnergy * EMISSION_FACTOR;

  return {
    numGPUs,
    totalEnergy: normalizedEnergy,
    co2Emissions,
    modelDetails: {
      totalParams: TOTAL_PARAMS / 1e9,
      activeParams: ACTIVE_PARAMS / 1e9,
      activationRatio: ACTIVATION_RATIO
    }
  };
}

/**
 * Helper function to get energy per token
 * Useful for displaying rate information in UI
 *
 * @returns {number} Energy per token in kWh/token (per GPU)
 */
function getEnergyPerToken() {
  const { GPU_ENERGY_ALPHA, GPU_ENERGY_BETA, GPU_ENERGY_GAMMA, BATCH_SIZE } = ECOLOGITS_CONSTANTS;
  const { ACTIVE_PARAMS_BILLIONS } = GPT5_PARAMS;
  return (GPU_ENERGY_ALPHA * Math.exp(GPU_ENERGY_BETA * BATCH_SIZE) * ACTIVE_PARAMS_BILLIONS + GPU_ENERGY_GAMMA) / 1000;
}

/**
 * Helper function to get the number of GPUs required for GPT-5
 *
 * @returns {number} Number of GPUs required
 */
function getNumGPUs() {
  const { GPU_MEMORY, GPU_BITS } = ECOLOGITS_CONSTANTS;
  const { TOTAL_PARAMS } = GPT5_PARAMS;
  const memoryRequired = 1.2 * TOTAL_PARAMS * GPU_BITS / 8;
  const numGPUsRaw = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  return Math.pow(2, Math.ceil(Math.log2(numGPUsRaw))); // power-of-2 rounding
}

// Make functions available globally for content scripts
// and as CommonJS exports for Node.js testing
if (typeof window !== 'undefined') {
  // Browser context - make available globally
  window.ECOLOGITS_CONSTANTS = ECOLOGITS_CONSTANTS;
  window.GPT5_PARAMS = GPT5_PARAMS;
  window.calculateEnergyAndEmissions = calculateEnergyAndEmissions;
  window.getEnergyPerToken = getEnergyPerToken;
  window.getNumGPUs = getNumGPUs;
}

// CommonJS exports for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ECOLOGITS_CONSTANTS,
    GPT5_PARAMS,
    calculateEnergyAndEmissions,
    getEnergyPerToken,
    getNumGPUs
  };
}
