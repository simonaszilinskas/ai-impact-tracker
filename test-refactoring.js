#!/usr/bin/env node
/**
 * Test script for issue #14 refactoring
 * Verifies that the shared energy-calculator module works correctly
 */

console.log('='.repeat(70));
console.log('VERIFICATION: Issue #14 - Code Deduplication');
console.log('='.repeat(70));
console.log();

// Import the shared module
import {
  ECOLOGITS_CONSTANTS,
  GPT5_PARAMS,
  calculateEnergyAndEmissions,
  getEnergyPerToken,
  getNumGPUs
} from './energy-calculator.js';

console.log('✅ Successfully imported energy-calculator.js as ES6 module');
console.log();

// Test 1: Check constants are defined (EcoLogits v0.9.x)
console.log('Test 1: Checking constants...');
console.log(`  GPU_ENERGY_ALPHA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA}`);
console.log(`  GPU_ENERGY_BETA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_BETA}`);
console.log(`  GPU_ENERGY_GAMMA: ${ECOLOGITS_CONSTANTS.GPU_ENERGY_GAMMA}`);
console.log(`  BATCH_SIZE: ${ECOLOGITS_CONSTANTS.BATCH_SIZE}`);
console.log(`  GPT-5 Total Params: ${GPT5_PARAMS.TOTAL_PARAMS / 1e9}B`);
console.log(`  GPT-5 Active Params: ${GPT5_PARAMS.ACTIVE_PARAMS / 1e9}B`);

if (ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA === 1.1665273170451914e-06 &&
    ECOLOGITS_CONSTANTS.GPU_BITS === 16 &&
    ECOLOGITS_CONSTANTS.BATCH_SIZE === 64 &&
    GPT5_PARAMS.TOTAL_PARAMS === 300e9) {
  console.log('  ✅ PASS - All constants correct');
} else {
  console.log('  ❌ FAIL - Constants mismatch');
  process.exit(1);
}
console.log();

// Test 2: Test calculateEnergyAndEmissions function
console.log('Test 2: Testing calculateEnergyAndEmissions...');
const result100 = calculateEnergyAndEmissions(100);
console.log(`  100 tokens: ${result100.totalEnergy.toFixed(4)} Wh`);
console.log(`  CO2 emissions: ${result100.co2Emissions.toFixed(4)} g`);
console.log(`  NumGPUs: ${result100.numGPUs}`);

if (result100.totalEnergy >= 0.23 && result100.totalEnergy <= 0.26) {
  console.log('  ✅ PASS - Calculation matches expected (~0.243 Wh)');
} else {
  console.log(`  ❌ FAIL - Expected ~0.243 Wh, got ${result100.totalEnergy.toFixed(4)} Wh`);
  process.exit(1);
}
console.log();

// Test 3: Test helper functions
console.log('Test 3: Testing helper functions...');
const energyPerToken = getEnergyPerToken();
const numGPUs = getNumGPUs();
console.log(`  getEnergyPerToken(): ${energyPerToken.toExponential(4)} kWh/token`);
console.log(`  getNumGPUs(): ${numGPUs} GPUs`);

if (energyPerToken > 0 && numGPUs === 16) {
  console.log('  ✅ PASS - Helper functions work correctly');
} else {
  console.log('  ❌ FAIL - Helper functions returned unexpected values');
  process.exit(1);
}
console.log();

// Test 4: Compare multiple token counts
console.log('Test 4: Testing various token counts...');
const testCases = [
  { tokens: 10, expectedMin: 0.023, expectedMax: 0.026 },
  { tokens: 100, expectedMin: 0.23, expectedMax: 0.26 },
  { tokens: 1000, expectedMin: 2.3, expectedMax: 2.6 },
  { tokens: 5000, expectedMin: 11.5, expectedMax: 13.0 }
];

let allPassed = true;
testCases.forEach(test => {
  const result = calculateEnergyAndEmissions(test.tokens);
  const passed = result.totalEnergy >= test.expectedMin && result.totalEnergy <= test.expectedMax;
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${test.tokens} tokens: ${result.totalEnergy.toFixed(2)} Wh (expected ${test.expectedMin}-${test.expectedMax} Wh)`);
  if (!passed) allPassed = false;
});

if (allPassed) {
  console.log('  ✅ PASS - All token counts within expected ranges');
} else {
  console.log('  ❌ FAIL - Some calculations out of range');
  process.exit(1);
}
console.log();

// Summary
console.log('='.repeat(70));
console.log('✅ ALL TESTS PASSED - Refactoring successful!');
console.log('='.repeat(70));
console.log();
console.log('Summary:');
console.log('  ✅ Shared module loads correctly as ES6 module');
console.log('  ✅ Constants are properly defined');
console.log('  ✅ calculateEnergyAndEmissions works correctly');
console.log('  ✅ Helper functions work correctly');
console.log('  ✅ Calculations match expected values');
console.log();
console.log('Next steps:');
console.log('  1. Load the extension in Chrome (chrome://extensions)');
console.log('  2. Test content.js: Visit ChatGPT and check console for errors');
console.log('  3. Test popup.js: Open extension popup and verify it displays correctly');
console.log('  4. Verify energy values are correct (~0.24 Wh per 100 tokens)');
console.log();
