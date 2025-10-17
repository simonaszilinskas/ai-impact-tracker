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
  ALTMAN_PARAMS,
  calculateEnergyAndEmissions,
  getEnergyPerToken,
  getNumGPUs
} from './energy-calculator.js';

console.log('✅ Successfully imported energy-calculator.js as ES6 module');
console.log();

// Test 1: Check constants are defined
console.log('Test 1: Checking constants...');
console.log(`  ENERGY_ALPHA: ${ECOLOGITS_CONSTANTS.ENERGY_ALPHA}`);
console.log(`  ENERGY_BETA: ${ECOLOGITS_CONSTANTS.ENERGY_BETA}`);
console.log(`  GPT-5 Total Params: ${GPT5_PARAMS.TOTAL_PARAMS / 1e9}B`);
console.log(`  GPT-5 Active Params: ${GPT5_PARAMS.ACTIVE_PARAMS / 1e9}B`);
console.log(`  Altman Energy/Query: ${ALTMAN_PARAMS.ENERGY_PER_QUERY} Wh`);

if (ECOLOGITS_CONSTANTS.ENERGY_ALPHA === 8.91e-5 &&
    ECOLOGITS_CONSTANTS.ENERGY_BETA === 1.43e-3 &&
    GPT5_PARAMS.TOTAL_PARAMS === 300e9) {
  console.log('  ✅ PASS - All constants correct');
} else {
  console.log('  ❌ FAIL - Constants mismatch');
  process.exit(1);
}
console.log();

// Test 2: Test calculateEnergyAndEmissions function (Community method)
console.log('Test 2: Testing calculateEnergyAndEmissions (Community)...');
const result100Community = calculateEnergyAndEmissions(100, 'community');
console.log(`  100 tokens: ${result100Community.totalEnergy.toFixed(4)} Wh`);
console.log(`  CO2 emissions: ${result100Community.co2Emissions.toFixed(4)} g`);
console.log(`  NumGPUs: ${result100Community.numGPUs}`);

if (result100Community.totalEnergy >= 3.31 && result100Community.totalEnergy <= 3.33) {
  console.log('  ✅ PASS - Calculation matches expected (3.32 Wh)');
} else {
  console.log(`  ❌ FAIL - Expected ~3.32 Wh, got ${result100Community.totalEnergy.toFixed(4)} Wh`);
  process.exit(1);
}
console.log();

// Test 3: Test calculateEnergyAndEmissions function (Altman method)
console.log('Test 3: Testing calculateEnergyAndEmissions (Altman)...');
const result100Altman = calculateEnergyAndEmissions(100, 'altman');
console.log(`  100 tokens: ${result100Altman.totalEnergy.toFixed(4)} Wh`);
console.log(`  CO2 emissions: ${result100Altman.co2Emissions.toFixed(4)} g`);

if (result100Altman.totalEnergy >= 0.04 && result100Altman.totalEnergy <= 0.05) {
  console.log('  ✅ PASS - Calculation matches expected (~0.043 Wh)');
} else {
  console.log(`  ❌ FAIL - Expected ~0.043 Wh, got ${result100Altman.totalEnergy.toFixed(4)} Wh`);
  process.exit(1);
}
console.log();

// Test 4: Test helper functions
console.log('Test 4: Testing helper functions...');
const energyPerToken = getEnergyPerToken('community');
const numGPUs = getNumGPUs();
console.log(`  getEnergyPerToken('community'): ${energyPerToken.toFixed(6)} Wh/token`);
console.log(`  getNumGPUs(): ${numGPUs} GPUs`);

if (energyPerToken > 0 && numGPUs === 3) {
  console.log('  ✅ PASS - Helper functions work correctly');
} else {
  console.log('  ❌ FAIL - Helper functions returned unexpected values');
  process.exit(1);
}
console.log();

// Test 5: Compare multiple token counts
console.log('Test 5: Testing various token counts...');
const testCases = [
  { tokens: 10, expectedMin: 0.33, expectedMax: 0.34 },
  { tokens: 100, expectedMin: 3.31, expectedMax: 3.33 },
  { tokens: 1000, expectedMin: 33.19, expectedMax: 33.21 },
  { tokens: 5000, expectedMin: 165.9, expectedMax: 166.1 }
];

let allPassed = true;
testCases.forEach(test => {
  const result = calculateEnergyAndEmissions(test.tokens, 'community');
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
console.log('  ✅ calculateEnergyAndEmissions works for both methods');
console.log('  ✅ Helper functions work correctly');
console.log('  ✅ Calculations match expected values');
console.log();
console.log('Next steps:');
console.log('  1. Load the extension in Chrome (chrome://extensions)');
console.log('  2. Test content.js: Visit ChatGPT and check console for errors');
console.log('  3. Test popup.js: Open extension popup and verify it displays correctly');
console.log('  4. Test method switching: Switch between Community and Altman methods');
console.log('  5. Verify energy values are correct (~3.3 Wh per 100 tokens for Community)');
console.log();
