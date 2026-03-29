#!/usr/bin/env node
/**
 * Test script for provider abstraction layer
 * Verifies that multiple providers work correctly with the energy calculator
 */

console.log('='.repeat(70));
console.log('VERIFICATION: Provider Abstraction Layer');
console.log('='.repeat(70));
console.log();

// Import the provider module
import {
  PROVIDERS,
  CHATGPT_PROVIDER,
  CLAUDE_PROVIDER,
  detectProvider,
  getProviderById,
  getAllProviders
} from './providers.js';

// Import energy calculator
import {
  calculateEnergyAndEmissions,
  getEnergyPerToken,
  getNumGPUs
} from './energy-calculator.js';

console.log('Successfully imported providers.js and energy-calculator.js');
console.log();

// Provider-specific test configuration
// When adding a new provider, add its test data here
const PROVIDER_TEST_CONFIG = {
  chatgpt: {
    testUrls: [
      'https://chatgpt.com/c/abc123',
      'https://chat.openai.com/c/xyz789'
    ],
    conversationIdTest: {
      url: 'https://chatgpt.com/c/abc123xyz',
      expectedId: 'abc123xyz'
    },
    expectedModelParams: {
      totalParams: 300e9,
      activeParams: 60e9
    },
    expectedGPUs: 16,
    expected100tokens: { min: 0.23, max: 0.26 }
  },
  claude: {
    testUrls: [
      'https://claude.ai/chat/def456'
    ],
    conversationIdTest: {
      url: 'https://claude.ai/chat/def456ghi',
      expectedId: 'def456ghi'
    },
    expectedModelParams: {
      totalParams: 2000e9,
      activeParams: 400e9
    },
    expectedGPUs: 64,
    expected100tokens: { min: 3.5, max: 3.7 }
  }
};

// Test 1: Provider Registration
console.log('Test 1: Provider Registration');
console.log('-'.repeat(70));
const allProviders = getAllProviders();
console.log(`  Total providers registered: ${allProviders.length}`);
console.log(`  Providers: ${allProviders.map(p => p.name).join(', ')}`);

// Verify all expected providers are registered
const expectedProviderIds = Object.keys(PROVIDER_TEST_CONFIG);
const registeredIds = allProviders.map(p => p.id);
const allExpectedPresent = expectedProviderIds.every(id => registeredIds.includes(id));

if (allProviders.length === expectedProviderIds.length && allExpectedPresent) {
  console.log('  PASS - All expected providers registered correctly');
} else {
  console.error('  FAIL - Provider registration mismatch');
  console.error(`    Expected: ${expectedProviderIds.join(', ')}`);
  console.error(`    Registered: ${registeredIds.join(', ')}`);
  process.exit(1);
}
console.log();

// Test 2: Provider Detection
console.log('Test 2: Provider Detection');
console.log('-'.repeat(70));

// Generate test URLs from provider config
const testUrls = [];
Object.entries(PROVIDER_TEST_CONFIG).forEach(([providerId, config]) => {
  config.testUrls.forEach(url => {
    testUrls.push({ url, expected: providerId });
  });
});

// Add negative test cases (URLs that should not match any provider)
testUrls.push(
  { url: 'https://google.com', expected: null },
  { url: 'https://example.com', expected: null }
);

let allDetectionPassed = true;
testUrls.forEach(({ url, expected }) => {
  const provider = detectProvider(url);
  const providerId = provider ? provider.id : null;
  const passed = providerId === expected;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  ${status}: ${url}`);
  console.log(`        Detected: ${providerId || 'none'}, Expected: ${expected || 'none'}`);
  if (!passed) allDetectionPassed = false;
});

if (allDetectionPassed) {
  console.log('  PASS - Provider detection working correctly');
} else {
  console.error('  FAIL - Provider detection errors');
  process.exit(1);
}
console.log();

// Test 3: Provider Lookup by ID
console.log('Test 3: Provider Lookup by ID');
console.log('-'.repeat(70));

let failureCount = 0;

// Test lookup for all registered providers
allProviders.forEach(provider => {
  const lookedUpProvider = getProviderById(provider.id);
  const passed = lookedUpProvider && lookedUpProvider.id === provider.id && lookedUpProvider.name === provider.name;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  ${status}: getProviderById('${provider.id}') → ${lookedUpProvider ? lookedUpProvider.name : 'null'}`);
  if (!passed) failureCount++;
});

// Test unknown ID returns null
const unknownProvider = getProviderById('unknown');
if (unknownProvider === null) {
  console.log(`  PASS: getProviderById('unknown') → null`);
} else {
  console.log(`  FAIL: getProviderById('unknown') should return null`);
  failureCount++;
}

if (failureCount === 0) {
  console.log('  PASS - Provider lookup working correctly');
} else {
  console.error('  FAIL - Provider lookup errors');
  process.exit(1);
}
console.log();

// Test 4: Provider Model Parameters
console.log('Test 4: Provider Model Parameters');
console.log('-'.repeat(70));

failureCount = 0;

allProviders.forEach(provider => {
  const config = PROVIDER_TEST_CONFIG[provider.id];
  console.log(`  ${provider.name} Model Parameters:`);
  console.log(`    Total params: ${provider.modelParams.totalParams / 1e9}B`);
  console.log(`    Active params: ${provider.modelParams.activeParams / 1e9}B`);
  console.log(`    Activation ratio: ${provider.modelParams.activationRatio * 100}%`);

  // Validate against expected values
  if (config && config.expectedModelParams) {
    const totalMatch = provider.modelParams.totalParams === config.expectedModelParams.totalParams;
    const activeMatch = provider.modelParams.activeParams === config.expectedModelParams.activeParams;
    if (!totalMatch || !activeMatch) {
      console.error(`    FAIL - Parameter mismatch for ${provider.name}`);
      failureCount++;
    }
  }
});

if (failureCount === 0) {
  console.log('  PASS - Model parameters defined correctly');
} else {
  console.error('  FAIL - Model parameter mismatch');
  process.exit(1);
}
console.log();

// Test 5: Token Estimation
console.log('Test 5: Token Estimation Functions');
console.log('-'.repeat(70));

const testText = 'This is a test message with exactly twenty-five tokens in it for testing purposes only.';
const expectedTokens = Math.ceil(testText.length / 4);

console.log(`  Test text: "${testText}"`);
console.log(`  Text length: ${testText.length} chars`);
console.log(`  Expected: ~${expectedTokens} tokens (chars/4)`);
console.log();

failureCount = 0;

allProviders.forEach(provider => {
  const tokens = provider.estimateTokens(testText);
  const passed = tokens === expectedTokens;
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`  ${status}: ${provider.name} estimate: ${tokens} tokens`);
  if (!passed) failureCount++;
});

if (failureCount === 0) {
  console.log('  PASS - Token estimation working correctly');
} else {
  console.error('  FAIL - Token estimation mismatch');
  process.exit(1);
}
console.log();

// Test 6: Energy Calculations with Different Providers
console.log('Test 6: Energy Calculations with Provider Model Params');
console.log('-'.repeat(70));

const tokens = 100;
failureCount = 0;
const energyResults = {};

allProviders.forEach(provider => {
  const config = PROVIDER_TEST_CONFIG[provider.id];
  const energy = calculateEnergyAndEmissions(tokens, provider.modelParams);
  energyResults[provider.id] = energy;

  console.log(`  ${provider.name} - 100 tokens:`);
  console.log(`    Energy: ${energy.totalEnergy.toFixed(4)} Wh`);
  console.log(`    CO2: ${energy.co2Emissions.toFixed(4)} g`);
  console.log(`    GPUs required: ${energy.numGPUs}`);

  // Validate against expected values from config
  if (config) {
    const energyInRange = energy.totalEnergy >= config.expected100tokens.min &&
                          energy.totalEnergy <= config.expected100tokens.max;
    const gpusMatch = energy.numGPUs === config.expectedGPUs;

    if (!energyInRange || !gpusMatch) {
      console.error(`    FAIL - Values out of expected range`);
      failureCount++;
    }
  }

  // Basic sanity check
  if (energy.totalEnergy <= 0 || energy.totalEnergy > 100 || energy.numGPUs <= 0) {
    console.error(`    FAIL - Unreasonable values`);
    failureCount++;
  }
});

if (failureCount === 0) {
  console.log('  PASS - Energy calculations produce reasonable values');
} else {
  console.error('  FAIL - Energy calculations out of expected range');
  process.exit(1);
}
console.log();

// Test 7: DOM Selectors
console.log('Test 7: DOM Selectors Configuration');
console.log('-'.repeat(70));

failureCount = 0;

allProviders.forEach(provider => {
  console.log(`  ${provider.name} Selectors:`);
  console.log(`    User messages: ${provider.selectors.userMessage.length} selectors`);
  console.log(`    Assistant messages: ${provider.selectors.assistantMessage.length} selectors`);
  console.log(`    Primary user selector: ${provider.selectors.userMessage[0]}`);

  if (provider.selectors.userMessage.length === 0 ||
      provider.selectors.assistantMessage.length === 0) {
    console.error(`    FAIL - Missing selectors for ${provider.name}`);
    failureCount++;
  }
});

if (failureCount === 0) {
  console.log('  PASS - All providers have DOM selectors defined');
} else {
  console.error('  FAIL - Missing DOM selectors for some providers');
  process.exit(1);
}
console.log();

// Test 8: API Patterns
console.log('Test 8: API Patterns Configuration');
console.log('-'.repeat(70));

failureCount = 0;

allProviders.forEach(provider => {
  const config = PROVIDER_TEST_CONFIG[provider.id];

  if (provider.apiPatterns && provider.apiPatterns.extractConversationId && config && config.conversationIdTest) {
    const { url, expectedId } = config.conversationIdTest;
    const extractedId = provider.apiPatterns.extractConversationId(url);

    console.log(`  ${provider.name} conversation ID extraction:`);
    console.log(`    URL: ${url}`);
    console.log(`    Extracted: ${extractedId}`);

    if (extractedId === expectedId) {
      console.log('    PASS - Correct');
    } else {
      console.error(`    FAIL - Expected ${expectedId}, got ${extractedId}`);
      failureCount++;
    }
  }
});

if (failureCount === 0) {
  console.log('  PASS - API patterns working correctly');
} else {
  console.error('  FAIL - API pattern errors');
  process.exit(1);
}
console.log();

// Test 9: Helper Functions with Different Providers
console.log('Test 9: Helper Functions with Provider Params');
console.log('-'.repeat(70));

failureCount = 0;

allProviders.forEach(provider => {
  const config = PROVIDER_TEST_CONFIG[provider.id];
  const energyPerToken = getEnergyPerToken(provider.modelParams);
  const numGPUs = getNumGPUs(provider.modelParams);

  console.log(`  ${provider.name}:`);
  console.log(`    Energy per token: ${energyPerToken.toExponential(4)} kWh/token`);
  console.log(`    GPUs required: ${numGPUs}`);

  // Validate values are reasonable
  if (energyPerToken <= 0 || numGPUs <= 0) {
    console.error(`    FAIL - Invalid values`);
    failureCount++;
  }

  // Validate against expected GPU count if available
  if (config && config.expectedGPUs && numGPUs !== config.expectedGPUs) {
    console.error(`    FAIL - Expected ${config.expectedGPUs} GPUs, got ${numGPUs}`);
    failureCount++;
  }
});

if (failureCount === 0) {
  console.log('  PASS - Helper functions work with all providers');
} else {
  console.error('  FAIL - Helper function errors');
  process.exit(1);
}
console.log();

// Test 10: Comparative Analysis
console.log('Test 10: Comparative Analysis (100 tokens)');
console.log('-'.repeat(70));

console.log('  Provider Comparison:');

// Display all providers
allProviders.forEach(provider => {
  const energy = energyResults[provider.id];
  console.log(`    ${provider.name}: ${energy.totalEnergy.toFixed(4)} Wh (${energy.numGPUs} GPUs)`);
});

// Calculate ratios if we have multiple providers
if (allProviders.length > 1) {
  console.log();
  console.log('  Energy Ratios (relative to first provider):');
  const baseProvider = allProviders[0];
  const baseEnergy = energyResults[baseProvider.id].totalEnergy;

  allProviders.slice(1).forEach(provider => {
    const energy = energyResults[provider.id].totalEnergy;
    const ratio = (energy / baseEnergy).toFixed(2);
    console.log(`    ${provider.name}/${baseProvider.name}: ${ratio}x`);
  });
}

console.log('  PASS - Comparative analysis completed');
console.log();

// Summary
console.log('='.repeat(70));
console.log('ALL PROVIDER TESTS PASSED');
console.log('='.repeat(70));
console.log();
console.log('Summary:');
console.log('  - Provider registration working');
console.log('  - Provider detection accurate');
console.log('  - Provider lookup by ID working');
console.log('  - Model parameters configured correctly');
console.log('  - Token estimation functions working');
console.log('  - Energy calculations work with all providers');
console.log('  - DOM selectors defined for all providers');
console.log('  - API patterns configured correctly');
console.log('  - Helper functions work with provider params');
console.log('  - Comparative analysis shows reasonable results');
console.log();
console.log('Provider Abstraction Layer is ready!');
console.log();
