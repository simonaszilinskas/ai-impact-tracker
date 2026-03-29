#!/usr/bin/env node
/**
 * Test script for issue #14 refactoring
 * Verifies that the shared energy-calculator module works correctly
 */

console.log('='.repeat(70));
console.log('VERIFICATION: Issue #14 - Code Deduplication');
console.log('='.repeat(70));
console.log();

// Import the shared energy calculation module
import {
  ECOLOGITS_CONSTANTS,
  calculateEnergyAndEmissions,
  getEnergyPerToken,
  getNumGPUs
} from './energy-calculator.js';

// Import provider configurations
import { CHATGPT_PROVIDER, CLAUDE_PROVIDER } from './providers.js';

console.log('Successfully imported energy-calculator.js and providers.js as ES6 modules');
console.log();

// Provider test configurations
const PROVIDER_TESTS = [
  {
    provider: CHATGPT_PROVIDER,
    name: 'ChatGPT',
    expected100tokens: { min: 0.23, max: 0.26 },
    expectedGPUs: 16,
    tokenRanges: [
      { tokens: 10, min: 0.023, max: 0.026 },
      { tokens: 100, min: 0.23, max: 0.26 },
      { tokens: 1000, min: 2.3, max: 2.6 },
      { tokens: 5000, min: 11.5, max: 13.0 }
    ]
  },
  {
    provider: CLAUDE_PROVIDER,
    name: 'Claude',
    expected100tokens: { min: 3.5, max: 3.7 },
    expectedGPUs: 64,
    tokenRanges: [
      { tokens: 10, min: 0.34, max: 0.39 },
      { tokens: 100, min: 3.5, max: 3.7 },
      { tokens: 1000, min: 35, max: 37 },
      { tokens: 5000, min: 175, max: 185 }
    ]
  }
];

// Test 1: Check constants and provider params are defined
console.log('Test 1: Checking constants and provider params...');
console.log(`  GPU_ENERGY_ALPHA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA}`);
console.log(`  GPU_ENERGY_BETA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_BETA}`);
console.log(`  GPU_ENERGY_GAMMA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_GAMMA}`);
console.log(`  BATCH_SIZE: ${ECOLOGITS_CONSTANTS.BATCH_SIZE}`);
console.log(`  ChatGPT Total Params: ${CHATGPT_PROVIDER.modelParams.totalParams / 1e9}B`);
console.log(`  ChatGPT Active Params: ${CHATGPT_PROVIDER.modelParams.activeParams / 1e9}B`);
console.log(`  Claude Total Params: ${CLAUDE_PROVIDER.modelParams.totalParams / 1e9}B`);
console.log(`  Claude Active Params: ${CLAUDE_PROVIDER.modelParams.activeParams / 1e9}B`);

if (ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA === 1.1665273170451914e-06 &&
    ECOLOGITS_CONSTANTS.GPU_BITS === 16 &&
    ECOLOGITS_CONSTANTS.BATCH_SIZE === 64 &&
    CHATGPT_PROVIDER.modelParams.totalParams === 300e9 &&
    CLAUDE_PROVIDER.modelParams.totalParams === 2000e9) {
  console.log('  PASS - All constants and provider params correct');
} else {
  console.error('  FAIL - Constants or provider params mismatch');
  process.exit(1);
}
console.log();

// Test 2: Test calculateEnergyAndEmissions function with all providers
console.log('Test 2: Testing calculateEnergyAndEmissions...');

PROVIDER_TESTS.forEach(({ provider, name, expected100tokens }) => {
  console.log(`  ${name}:`);
  const result = calculateEnergyAndEmissions(100, provider.modelParams);
  console.log(`    100 tokens: ${result.totalEnergy.toFixed(4)} Wh`);
  console.log(`    CO2 emissions: ${result.co2Emissions.toFixed(4)} g`);
  console.log(`    NumGPUs: ${result.numGPUs}`);

  if (result.totalEnergy >= expected100tokens.min && result.totalEnergy <= expected100tokens.max) {
    console.log(`    PASS - Calculation within expected range`);
  } else {
    console.error(`    FAIL - Expected ${expected100tokens.min}-${expected100tokens.max} Wh, got ${result.totalEnergy.toFixed(4)} Wh`);
    process.exit(1);
  }
});
console.log();

// Test 3: Test helper functions with all providers
console.log('Test 3: Testing helper functions...');

PROVIDER_TESTS.forEach(({ provider, name, expectedGPUs }) => {
  console.log(`  ${name}:`);
  const energyPerToken = getEnergyPerToken(provider.modelParams);
  const numGPUs = getNumGPUs(provider.modelParams);
  console.log(`    getEnergyPerToken(): ${energyPerToken.toExponential(4)} kWh/token`);
  console.log(`    getNumGPUs(): ${numGPUs} GPUs`);

  if (energyPerToken > 0 && numGPUs === expectedGPUs) {
    console.log(`    PASS - Helper functions work correctly`);
  } else {
    console.error(`    FAIL - Expected ${expectedGPUs} GPUs, got ${numGPUs}`);
    process.exit(1);
  }
});
console.log();

// Test 4: Compare multiple token counts across all providers
console.log('Test 4: Testing various token counts...');

let allPassed = true;
PROVIDER_TESTS.forEach(({ provider, name, tokenRanges }) => {
  console.log(`  ${name}:`);

  tokenRanges.forEach(test => {
    const result = calculateEnergyAndEmissions(test.tokens, provider.modelParams);
    const passed = result.totalEnergy >= test.min && result.totalEnergy <= test.max;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`    ${status}: ${test.tokens} tokens: ${result.totalEnergy.toFixed(2)} Wh (expected ${test.min}-${test.max} Wh)`);
    if (!passed) allPassed = false;
  });
});

if (allPassed) {
  console.log('  PASS - All token counts within expected ranges for all providers');
} else {
  console.error('  FAIL - Some calculations out of range');
  process.exit(1);
}
console.log();

// Summary
console.log('='.repeat(70));
console.log('ALL TESTS PASSED - Refactoring successful!');
console.log('='.repeat(70));
console.log();
console.log('Summary:');
console.log('  - Shared module loads correctly as ES6 module');
console.log('  - Constants and provider params properly defined');
console.log('  - calculateEnergyAndEmissions works correctly for all providers');
console.log('  - Helper functions work correctly for all providers');
console.log('  - Calculations match expected values for ChatGPT and Claude');
console.log();
console.log('Next steps:');
console.log('  1. Load the extension in Chrome (chrome://extensions)');
console.log('  2. Test content.js: Visit ChatGPT and check console for errors');
console.log('  3. Test popup.js: Open extension popup and verify it displays correctly');
console.log('  4. Verify energy values are correct (~0.24 Wh per 100 tokens)');
console.log();
