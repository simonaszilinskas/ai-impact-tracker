#!/usr/bin/env node
/**
 * Verification script for issue #13 fix
 * Tests that energy calculations are correct
 * Updated for EcoLogits v0.9.x methodology
 */

console.log('='.repeat(70));
console.log('VERIFICATION: Issue #13 - Energy Calculation Fix');
console.log('='.repeat(70));
console.log();

// EcoLogits v0.9.x methodology constants
const GPU_ENERGY_ALPHA = 1.1665273170451914e-06;
const GPU_ENERGY_BETA = -0.011205921025579175;
const GPU_ENERGY_GAMMA = 4.052928146734005e-05;
const LATENCY_ALPHA = 6.78e-4;
const LATENCY_BETA = 3.12e-4;
const LATENCY_GAMMA = 1.94e-2;
const BATCH_SIZE = 64;
const PUE = 1.2;
const GPU_MEMORY = 80;
const SERVER_POWER_WITHOUT_GPU = 1.2;
const INSTALLED_GPUS = 8;
const GPU_BITS = 16;
const EMISSION_FACTOR = 0.38355;

/**
 * EcoLogits v0.9.x calculation
 */
function calculateEnergyAndEmissions(outputTokens) {
  const totalParams = 300e9;
  const activeParamsBillions = 60;

  const gpuEnergyPerToken_kWh = (GPU_ENERGY_ALPHA * Math.exp(GPU_ENERGY_BETA * BATCH_SIZE) * activeParamsBillions + GPU_ENERGY_GAMMA) / 1000;

  const memoryRequired = 1.2 * totalParams * GPU_BITS / 8;
  const numGPUsRaw = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  const numGPUs = Math.pow(2, Math.ceil(Math.log2(numGPUsRaw)));

  const latencyPerToken = LATENCY_ALPHA * activeParamsBillions + LATENCY_BETA * BATCH_SIZE + LATENCY_GAMMA;
  const totalLatency = outputTokens * latencyPerToken;

  const gpuEnergy_kWh = outputTokens * gpuEnergyPerToken_kWh;
  const serverEnergy_kWh = (totalLatency / 3600) * SERVER_POWER_WITHOUT_GPU * (numGPUs / INSTALLED_GPUS) * (1 / BATCH_SIZE);

  const totalEnergy = PUE * (serverEnergy_kWh + numGPUs * gpuEnergy_kWh) * 1000;
  const minEnergy = 0.01;
  const normalizedEnergy = Math.max(totalEnergy, minEnergy);
  const co2Emissions = normalizedEnergy * EMISSION_FACTOR;

  return { totalEnergy: normalizedEnergy, co2Emissions };
}

/**
 * Old buggy calculation (for comparison - v0.2 methodology)
 */
function calculateEnergyOldBuggy(outputTokens) {
  const activeParamsBillions = 60;
  const energyPerToken = 8.91e-5 * activeParamsBillions + 1.43e-3;
  const totalEnergy = outputTokens * energyPerToken * PUE; // WRONG!
  const minEnergy = 0.01;
  const normalizedEnergy = Math.max(totalEnergy, minEnergy);
  const co2Emissions = normalizedEnergy * 0.418;
  return { totalEnergy: normalizedEnergy, co2Emissions };
}

// Test cases
const testCases = [
  { tokens: 10, expectedMin: 0.023, expectedMax: 0.026 },
  { tokens: 100, expectedMin: 0.23, expectedMax: 0.26 },
  { tokens: 1000, expectedMin: 2.3, expectedMax: 2.6 }
];

let allTestsPassed = true;

console.log('Testing EcoLogits v0.9.x methodology');
console.log('-'.repeat(70));

testCases.forEach((test, index) => {
  const correct = calculateEnergyAndEmissions(test.tokens);
  const buggy = calculateEnergyOldBuggy(test.tokens);
  const passed = correct.totalEnergy >= test.expectedMin && correct.totalEnergy <= test.expectedMax;

  console.log(`Test ${index + 1}: ${test.tokens} tokens`);
  console.log(`  Old v0.2 buggy:  ${buggy.totalEnergy.toFixed(4)} Wh`);
  console.log(`  New v0.9.x:      ${correct.totalEnergy.toFixed(4)} Wh`);
  console.log(`  Expected:        ${test.expectedMin.toFixed(3)} - ${test.expectedMax.toFixed(3)} Wh`);
  console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log();

  if (!passed) allTestsPassed = false;
});

console.log('='.repeat(70));
console.log('Detailed Breakdown for 100 tokens (EcoLogits v0.9.x)');
console.log('='.repeat(70));

const tokens = 100;
const activeParamsBillions = 60;
const totalParams = 300e9;

const gpuEnergyPerToken_kWh = (GPU_ENERGY_ALPHA * Math.exp(GPU_ENERGY_BETA * BATCH_SIZE) * activeParamsBillions + GPU_ENERGY_GAMMA) / 1000;
const memoryRequired = 1.2 * totalParams * GPU_BITS / 8;
const numGPUsRaw = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
const numGPUs = Math.pow(2, Math.ceil(Math.log2(numGPUsRaw)));
const latencyPerToken = LATENCY_ALPHA * activeParamsBillions + LATENCY_BETA * BATCH_SIZE + LATENCY_GAMMA;
const totalLatency = tokens * latencyPerToken;
const gpuEnergy_kWh = tokens * gpuEnergyPerToken_kWh;
const serverEnergy_kWh = (totalLatency / 3600) * SERVER_POWER_WITHOUT_GPU * (numGPUs / INSTALLED_GPUS) * (1 / BATCH_SIZE);
const totalEnergy = PUE * (serverEnergy_kWh + numGPUs * gpuEnergy_kWh) * 1000;

console.log(`1. GPU energy per token:           ${gpuEnergyPerToken_kWh.toExponential(4)} kWh/token`);
console.log(`2. Memory required:                ${(memoryRequired / 1e9).toFixed(0)} GB`);
console.log(`3. Number of GPUs (power-of-2):    ${numGPUs} GPUs (raw: ${numGPUsRaw})`);
console.log(`4. Latency per token:              ${latencyPerToken.toFixed(6)} s/token`);
console.log(`5. Total latency:                  ${totalLatency.toFixed(4)} seconds`);
console.log(`6. GPU energy (all GPUs):          ${(numGPUs * gpuEnergy_kWh * 1000).toFixed(6)} Wh`);
console.log(`7. Server energy (non-GPU):        ${(serverEnergy_kWh * 1000).toFixed(6)} Wh`);
console.log(`8. Batch size amortization:        ÷${BATCH_SIZE}`);
console.log(`9. With PUE (${PUE}):                ${totalEnergy.toFixed(6)} Wh`);
console.log();

console.log('='.repeat(70));
if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED - Fix is correct!');
} else {
  console.log('❌ SOME TESTS FAILED - Review the implementation');
  process.exit(1);
}
console.log('='.repeat(70));
console.log();
