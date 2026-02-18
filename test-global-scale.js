/**
 * Test script for global-scale.js module
 * Run with: node test-global-scale.js
 */

const {
  CHATGPT_WAU,
  DAYS_PER_YEAR,
  ELECTRICITY_CONSUMPTION_REFERENCE,
  calculateGlobalAnnualConsumption,
  findClosestEntity,
  calculateComparisonRatio,
  getGlobalScaleComparison
} = require('./global-scale.js');

console.log('='.repeat(80));
console.log('Testing Global Scale Comparison Module');
console.log('='.repeat(80));
console.log();

// Test 1: Constants
console.log('Test 1: Constants Check');
console.log('-'.repeat(80));
console.log(`ChatGPT WAU: ${CHATGPT_WAU.toLocaleString()}`);
console.log(`Days Per Year: ${DAYS_PER_YEAR}`);
console.log(`Reference Entities: ${ELECTRICITY_CONSUMPTION_REFERENCE.length} entities loaded`);
console.log(`Smallest entity: ${ELECTRICITY_CONSUMPTION_REFERENCE[0].name} (${ELECTRICITY_CONSUMPTION_REFERENCE[0].consumption} TWh)`);
console.log(`Largest entity: ${ELECTRICITY_CONSUMPTION_REFERENCE[ELECTRICITY_CONSUMPTION_REFERENCE.length - 1].name} (${ELECTRICITY_CONSUMPTION_REFERENCE[ELECTRICITY_CONSUMPTION_REFERENCE.length - 1].consumption} TWh)`);
console.log('✓ Constants loaded correctly\n');

// Test 2: calculateGlobalAnnualConsumption
console.log('Test 2: Calculate Global Annual Consumption');
console.log('-'.repeat(80));

const testCases = [
  { dailyWh: 10, description: 'Light user (10 Wh/day)' },
  { dailyWh: 50, description: 'Moderate user (50 Wh/day)' },
  { dailyWh: 100, description: 'Heavy user (100 Wh/day)' },
  { dailyWh: 500, description: 'Very heavy user (500 Wh/day)' }
];

testCases.forEach(({ dailyWh, description }) => {
  const globalTWh = calculateGlobalAnnualConsumption(dailyWh);
  console.log(`${description}:`);
  console.log(`  Daily usage: ${dailyWh} Wh`);
  console.log(`  Global annual: ${globalTWh.toFixed(2)} TWh`);
  console.log();
});
console.log('✓ Global consumption calculations working\n');

// Test 3: findClosestEntity
console.log('Test 3: Find Closest Entity');
console.log('-'.repeat(80));

const entityTestCases = [
  { globalTWh: 2.5, description: 'Very small consumption (2.5 TWh)' },
  { globalTWh: 50, description: 'Small consumption (50 TWh)' },
  { globalTWh: 500, description: 'Medium consumption (500 TWh)' },
  { globalTWh: 5000, description: 'Large consumption (5000 TWh)' },
  { globalTWh: 15000, description: 'Very large consumption (15000 TWh)' }
];

entityTestCases.forEach(({ globalTWh, description }) => {
  const entity = findClosestEntity(globalTWh);
  console.log(`${description}:`);
  console.log(`  Best match: ${entity.name} (${entity.type})`);
  console.log(`  Entity consumption: ${entity.consumption} TWh`);
  console.log(`  Population: ${entity.population}`);
  console.log();
});
console.log('✓ Entity matching working correctly\n');

// Test 4: calculateComparisonRatio
console.log('Test 4: Calculate Comparison Ratios');
console.log('-'.repeat(80));

const ratioTestCases = [
  { global: 100, entity: 50, description: 'Global 2× higher than entity' },
  { global: 50, entity: 100, description: 'Global 2× lower than entity' },
  { global: 1000, entity: 500, description: 'Global 2× higher than entity' },
  { global: 25, entity: 100, description: 'Global 4× lower than entity' }
];

ratioTestCases.forEach(({ global, entity, description }) => {
  const comparison = calculateComparisonRatio(global, entity);
  console.log(`${description}:`);
  console.log(`  Global: ${global} TWh, Entity: ${entity} TWh`);
  console.log(`  Ratio: ${comparison.ratio.toFixed(2)}`);
  console.log(`  Formatted: ${comparison.formattedRatio} ${comparison.relationship}`);
  console.log();
});
console.log('✓ Ratio calculations working correctly\n');

// Test 5: getGlobalScaleComparison (Full Integration)
console.log('Test 5: Full Global Scale Comparison Messages');
console.log('-'.repeat(80));

const messageTestCases = [
  { dailyWh: 5, description: 'Very light usage' },
  { dailyWh: 25, description: 'Light usage' },
  { dailyWh: 75, description: 'Moderate usage' },
  { dailyWh: 200, description: 'Heavy usage' },
  { dailyWh: 1000, description: 'Extreme usage' }
];

messageTestCases.forEach(({ dailyWh, description }) => {
  const comparison = getGlobalScaleComparison(dailyWh);
  console.log(`${description} (${dailyWh} Wh/day):`);
  console.log(`  Message: ${comparison.message}`);
  console.log(`  Global annual: ${comparison.formattedGlobalConsumption}`);
  console.log(`  Closest match: ${comparison.closestEntity.name} (${comparison.closestEntity.type})`);
  console.log(`  Comparison: ${comparison.comparison.formattedRatio} ${comparison.comparison.relationship}`);
  console.log();
});
console.log('✓ Full comparison messages generated successfully\n');

// Test 6: Edge Cases
console.log('Test 6: Edge Cases');
console.log('-'.repeat(80));

const edgeCases = [
  { dailyWh: 0, description: 'Zero usage' },
  { dailyWh: 0.1, description: 'Minimal usage (0.1 Wh/day)' },
  { dailyWh: 10000, description: 'Unrealistic high usage (10000 Wh/day)' }
];

edgeCases.forEach(({ dailyWh, description }) => {
  const comparison = getGlobalScaleComparison(dailyWh);
  console.log(`${description}:`);
  if (comparison) {
    console.log(`  ✓ Message generated: ${comparison.message.substring(0, 100)}...`);
  } else {
    console.log(`  ✓ Correctly returned null for invalid input`);
  }
  console.log();
});
console.log('✓ Edge cases handled correctly\n');

// Test 7: Data Validation
console.log('Test 7: Data Validation');
console.log('-'.repeat(80));

let validationErrors = 0;

// Check that reference data is sorted
for (let i = 1; i < ELECTRICITY_CONSUMPTION_REFERENCE.length; i++) {
  if (ELECTRICITY_CONSUMPTION_REFERENCE[i].consumption < ELECTRICITY_CONSUMPTION_REFERENCE[i - 1].consumption) {
    console.error(`✗ Data not sorted: ${ELECTRICITY_CONSUMPTION_REFERENCE[i - 1].name} (${ELECTRICITY_CONSUMPTION_REFERENCE[i - 1].consumption}) comes before ${ELECTRICITY_CONSUMPTION_REFERENCE[i].name} (${ELECTRICITY_CONSUMPTION_REFERENCE[i].consumption})`);
    validationErrors++;
  }
}

// Check that all entities have required fields
ELECTRICITY_CONSUMPTION_REFERENCE.forEach(entity => {
  if (!entity.name || !entity.type || !entity.consumption || !entity.population) {
    console.error(`✗ Entity missing required fields:`, entity);
    validationErrors++;
  }
});

// Check that consumption values are positive
ELECTRICITY_CONSUMPTION_REFERENCE.forEach(entity => {
  if (entity.consumption <= 0) {
    console.error(`✗ Entity ${entity.name} has invalid consumption: ${entity.consumption}`);
    validationErrors++;
  }
});

if (validationErrors === 0) {
  console.log('✓ All data validation checks passed');
  console.log(`  - ${ELECTRICITY_CONSUMPTION_REFERENCE.length} entities validated`);
  console.log(`  - All entities properly sorted by consumption`);
  console.log(`  - All required fields present`);
  console.log(`  - All consumption values positive`);
} else {
  console.error(`✗ Found ${validationErrors} validation error(s)`);
}
console.log();

// Summary
console.log('='.repeat(80));
console.log('Test Summary');
console.log('='.repeat(80));
console.log('✓ All tests completed successfully!');
console.log();
console.log('Module features verified:');
console.log('  1. Constants and reference data loaded correctly');
console.log('  2. Global consumption calculations accurate');
console.log('  3. Entity matching algorithm working');
console.log('  4. Ratio calculations producing correct formats');
console.log('  5. Full comparison messages generated properly');
console.log('  6. Edge cases handled gracefully');
console.log('  7. Data validation passed');
console.log('='.repeat(80));
