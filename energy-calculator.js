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
 * Implements the EcoLogits methodology from:
 * https://ecologits.ai/0.2/methodology/llm_inference/
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
 * EcoLogits methodology constants for LLM energy estimation
 * Source: https://ecologits.ai/0.2/methodology/llm_inference/
 */
const ECOLOGITS_CONSTANTS = {
  // Energy model coefficients
  ENERGY_ALPHA: 8.91e-5,    // Energy coefficient (Wh/token/B-params)
  ENERGY_BETA: 1.43e-3,     // Base energy per token (Wh/token)

  // Latency model coefficients
  LATENCY_ALPHA: 8.02e-4,   // Latency coefficient (s/token/B-params)
  LATENCY_BETA: 2.23e-2,    // Base latency per token (s/token)

  // Infrastructure parameters
  PUE: 1.2,                 // Power Usage Effectiveness for data centers
  GPU_MEMORY: 80,           // GPU memory in GB (NVIDIA A100)
  SERVER_POWER_WITHOUT_GPU: 1, // Server power excluding GPUs (kW)
  INSTALLED_GPUS: 8,        // Typical GPUs per server
  GPU_BITS: 4,              // Quantization level (4-bit)

  // Emissions
  WORLD_EMISSION_FACTOR: 0.418 // Global average CO2 emission factor (kgCO2eq/kWh)
};

/**
 * GPT-4o model parameters
 * Based on public information and reasonable estimates
 */
const GPT4O_PARAMS = {
  TOTAL_PARAMS: 440e9,        // 440 billion total parameters
  ACTIVE_PARAMS: 55e9,        // 55 billion active parameters
  ACTIVE_PARAMS_BILLIONS: 55, // Active params in billions (for formula)
  ACTIVATION_RATIO: 0.125     // 12.5% activation ratio (Mixture of Experts)
};

/**
 * Sam Altman's estimation parameters
 * Source: https://blog.samaltman.com/the-gentle-singularity
 */
const ALTMAN_PARAMS = {
  ENERGY_PER_QUERY: 0.34,     // Wh per query (as stated by Sam Altman)
  AVG_TOKENS_PER_QUERY: 781   // Average output tokens per query (from compar:IA dataset)
};

/**
 * Calculates energy usage and CO2 emissions for LLM inference
 *
 * Supports two estimation methods:
 * 1. 'community' - EcoLogits methodology (academic research)
 * 2. 'altman' - Sam Altman's estimate (industry statement)
 *
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @param {string} [method='community'] - Estimation method: 'community' or 'altman'
 * @returns {Object} Energy and emissions data
 * @returns {number} returns.totalEnergy - Total energy consumption (Wh)
 * @returns {number} returns.co2Emissions - CO2 emissions (grams)
 * @returns {number} [returns.numGPUs] - Number of GPUs required (community method only)
 * @returns {Object} [returns.modelDetails] - Additional model details
 *
 * @example
 * // Calculate energy for 100 tokens using community method
 * const result = calculateEnergyAndEmissions(100, 'community');
 * console.log(result.totalEnergy); // ~4.15 Wh
 *
 * @example
 * // Calculate energy using Altman's estimate
 * const result = calculateEnergyAndEmissions(100, 'altman');
 * console.log(result.totalEnergy); // ~0.04 Wh
 */
function calculateEnergyAndEmissions(outputTokens, method = 'community') {
  const {
    ENERGY_ALPHA,
    ENERGY_BETA,
    LATENCY_ALPHA,
    LATENCY_BETA,
    PUE,
    GPU_MEMORY,
    SERVER_POWER_WITHOUT_GPU,
    INSTALLED_GPUS,
    GPU_BITS,
    WORLD_EMISSION_FACTOR
  } = ECOLOGITS_CONSTANTS;

  if (method === 'altman') {
    // Sam Altman's estimation: 0.34 Wh per query with 781 average output tokens
    const altmanEnergyPerToken = ALTMAN_PARAMS.ENERGY_PER_QUERY / ALTMAN_PARAMS.AVG_TOKENS_PER_QUERY;
    const totalEnergy = outputTokens * altmanEnergyPerToken;

    // Ensure minimum energy value for visibility in UI
    const minEnergy = 0.01;
    const normalizedEnergy = Math.max(totalEnergy, minEnergy);

    // Calculate CO2 emissions (grams)
    const co2Emissions = normalizedEnergy * WORLD_EMISSION_FACTOR;

    return {
      numGPUs: 1, // Simplified for Altman estimate
      totalEnergy: normalizedEnergy,
      co2Emissions,
      modelDetails: {
        method: 'altman',
        energyPerToken: altmanEnergyPerToken
      }
    };
  } else {
    // Community estimates using EcoLogits methodology
    // ChatGPT is a Mixture of Experts (MoE) model with 440B total parameters
    const { TOTAL_PARAMS, ACTIVE_PARAMS, ACTIVE_PARAMS_BILLIONS, ACTIVATION_RATIO } = GPT4O_PARAMS;

    // Step 1: Calculate energy per token (per GPU)
    // Uses ACTIVE parameters because energy is proportional to compute in MoE models
    // Formula: E = α × P_active + β
    const energyPerToken = ENERGY_ALPHA * ACTIVE_PARAMS_BILLIONS + ENERGY_BETA;

    // Step 2: Calculate GPU memory requirements and number of GPUs needed
    // Uses TOTAL parameters because memory stores the entire model
    // Formula: M_model = 1.2 × P_total × Q / 8 (Q=quantization bits)
    const memoryRequired = 1.2 * TOTAL_PARAMS * GPU_BITS / 8; // in bytes
    const numGPUs = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9)); // = 4 GPUs for GPT-4o

    // Step 3: Calculate inference latency
    // Uses ACTIVE parameters because latency depends on compute
    // Formula: ΔT = #tokens × (A × P_active + B)
    const latencyPerToken = LATENCY_ALPHA * ACTIVE_PARAMS_BILLIONS + LATENCY_BETA;
    const totalLatency = outputTokens * latencyPerToken; // in seconds

    // Step 4: Calculate GPU energy consumption
    // Multiply by numGPUs because all GPUs are active during inference
    const gpuEnergy = outputTokens * energyPerToken * numGPUs;

    // Step 5: Calculate server energy excluding GPUs
    // Server components (CPU, memory, networking) also consume power
    // Formula: E_server = ΔT × P_server × (numGPUs / installedGPUs) / 3600 × 1000
    // Division by 3600 converts seconds to hours, multiplication by 1000 converts kW to W
    const serverEnergyWithoutGPU = totalLatency * SERVER_POWER_WITHOUT_GPU * numGPUs / INSTALLED_GPUS / 3600 * 1000;

    // Step 6: Total server energy (GPU + non-GPU components)
    const serverEnergy = serverEnergyWithoutGPU + gpuEnergy;

    // Step 7: Apply Power Usage Effectiveness (PUE)
    // PUE accounts for data center overhead (cooling, power distribution, etc.)
    const totalEnergy = PUE * serverEnergy;

    // Ensure minimum energy value for visibility in UI
    const minEnergy = 0.01;
    const normalizedEnergy = Math.max(totalEnergy, minEnergy);

    // Step 8: Calculate CO2 emissions
    // Using global average emission factor
    const co2Emissions = normalizedEnergy * WORLD_EMISSION_FACTOR;

    return {
      numGPUs,
      totalEnergy: normalizedEnergy,
      co2Emissions,
      modelDetails: {
        totalParams: TOTAL_PARAMS / 1e9,
        activeParams: ACTIVE_PARAMS / 1e9,
        activationRatio: ACTIVATION_RATIO,
        method: 'community'
      }
    };
  }
}

/**
 * Helper function to get energy per token for a given method
 * Useful for displaying rate information in UI
 *
 * @param {string} [method='community'] - Estimation method
 * @returns {number} Energy per token in Wh/token
 */
function getEnergyPerToken(method = 'community') {
  if (method === 'altman') {
    return ALTMAN_PARAMS.ENERGY_PER_QUERY / ALTMAN_PARAMS.AVG_TOKENS_PER_QUERY;
  } else {
    const { ENERGY_ALPHA, ENERGY_BETA } = ECOLOGITS_CONSTANTS;
    const { ACTIVE_PARAMS_BILLIONS } = GPT4O_PARAMS;
    return ENERGY_ALPHA * ACTIVE_PARAMS_BILLIONS + ENERGY_BETA;
  }
}

/**
 * Helper function to get the number of GPUs required for GPT-4o
 *
 * @returns {number} Number of GPUs required
 */
function getNumGPUs() {
  const { GPU_MEMORY, GPU_BITS } = ECOLOGITS_CONSTANTS;
  const { TOTAL_PARAMS } = GPT4O_PARAMS;
  const memoryRequired = 1.2 * TOTAL_PARAMS * GPU_BITS / 8;
  return Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
}

// Make functions available globally for content scripts
// and as CommonJS exports for Node.js testing
if (typeof window !== 'undefined') {
  // Browser context - make available globally
  window.ECOLOGITS_CONSTANTS = ECOLOGITS_CONSTANTS;
  window.GPT4O_PARAMS = GPT4O_PARAMS;
  window.ALTMAN_PARAMS = ALTMAN_PARAMS;
  window.calculateEnergyAndEmissions = calculateEnergyAndEmissions;
  window.getEnergyPerToken = getEnergyPerToken;
  window.getNumGPUs = getNumGPUs;
}

// CommonJS exports for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ECOLOGITS_CONSTANTS,
    GPT4O_PARAMS,
    ALTMAN_PARAMS,
    calculateEnergyAndEmissions,
    getEnergyPerToken,
    getNumGPUs
  };
}
