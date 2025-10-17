/**
 * AI Impact Tracker - Global Scale Comparison Module
 * ===================================================
 *
 * This module provides functionality to contextualize individual AI usage
 * at a global scale by comparing what would happen if everyone in the world
 * consumed the same amount of energy.
 *
 * Formula: User's daily average × 8.2 billion people × 365 days
 * Result: Compared against annual energy consumption of cities, countries, and continents
 *
 * @module global-scale
 */

/**
 * World population for scaling calculations (2025 estimate)
 */
const WORLD_POPULATION = 8.2e9; // 8.2 billion people

/**
 * Days in a year for annual calculations
 */
const DAYS_PER_YEAR = 365;

/**
 * Reference dataset of geographical entities and their annual energy consumption
 * All values in TWh (Terawatt-hours) per year
 *
 * Sources:
 * - Countries: IEA, Enerdata, Our World in Data (2024 data)
 * - Cities: EIA, local utility data
 * - Continents: World Bank, IEA aggregated data
 *
 * Sorted from smallest to largest for efficient comparison
 */
const ENERGY_CONSUMPTION_REFERENCE = [
  // Small island nations and city-states
  { name: "Malta", type: "country", consumption: 2.3, population: "0.5 million" },
  { name: "Luxembourg", type: "country", consumption: 5.87, population: "0.6 million" },
  { name: "Boston", type: "city", consumption: 12.3, population: "0.7 million" },
  { name: "Denver", type: "city", consumption: 13.1, population: "0.7 million" },
  { name: "Iceland", type: "country", consumption: 19.6, population: "0.4 million" },
  { name: "Ireland", type: "country", consumption: 31, population: "5.1 million" },
  { name: "Denmark", type: "country", consumption: 33, population: "5.9 million" },
  { name: "New Zealand", type: "country", consumption: 42, population: "5.1 million" },
  { name: "Portugal", type: "country", consumption: 50, population: "10.3 million" },
  { name: "Greece", type: "country", consumption: 53, population: "10.4 million" },
  { name: "Singapore", type: "country", consumption: 55, population: "5.9 million" },
  { name: "Switzerland", type: "country", consumption: 58, population: "8.7 million" },
  { name: "Czech Republic", type: "country", consumption: 62, population: "10.5 million" },
  { name: "Austria", type: "country", consumption: 72, population: "9.0 million" },
  { name: "Belgium", type: "country", consumption: 85, population: "11.6 million" },
  { name: "Finland", type: "country", consumption: 85, population: "5.5 million" },
  { name: "Netherlands", type: "country", consumption: 119, population: "17.6 million" },
  { name: "Sweden", type: "country", consumption: 140, population: "10.5 million" },
  { name: "Norway", type: "country", consumption: 147, population: "5.5 million" },
  { name: "Poland", type: "country", consumption: 165, population: "38 million" },
  { name: "Thailand", type: "country", consumption: 202, population: "70 million" },
  { name: "Spain", type: "country", consumption: 268, population: "47.4 million" },
  { name: "Indonesia", type: "country", consumption: 283, population: "275 million" },
  { name: "Oceania", type: "continent", consumption: 300, population: "45 million" },
  { name: "United Kingdom", type: "country", consumption: 305, population: "67.3 million" },
  { name: "Turkey", type: "country", consumption: 308, population: "85 million" },
  { name: "Italy", type: "country", consumption: 310, population: "59 million" },
  { name: "France", type: "country", consumption: 445, population: "67.7 million" },
  { name: "Germany", type: "country", consumption: 510, population: "83.3 million" },
  { name: "Canada", type: "country", consumption: 553, population: "39 million" },
  { name: "South Korea", type: "country", consumption: 607, population: "51.7 million" },
  { name: "Brazil", type: "country", consumption: 632, population: "215 million" },
  { name: "Africa", type: "continent", consumption: 870, population: "1.4 billion" },
  { name: "Japan", type: "country", consumption: 939, population: "125 million" },
  { name: "Russia", type: "country", consumption: 1025, population: "144 million" },
  { name: "South America", type: "continent", consumption: 1200, population: "434 million" },
  { name: "India", type: "country", consumption: 1463, population: "1.4 billion" },
  { name: "Europe", type: "continent", consumption: 3400, population: "748 million" },
  { name: "United States", type: "country", consumption: 4065, population: "335 million" },
  { name: "North America", type: "continent", consumption: 4900, population: "580 million" },
  { name: "China", type: "country", consumption: 8539, population: "1.4 billion" },
  { name: "Asia", type: "continent", consumption: 13500, population: "4.7 billion" }
];

/**
 * Calculates what the global energy consumption would be if everyone
 * consumed the same amount of AI energy as the user
 *
 * @param {number} dailyAverageWh - User's daily average energy consumption in Wh
 * @returns {number} Annual global consumption in TWh
 */
function calculateGlobalAnnualConsumption(dailyAverageWh) {
  // Convert Wh to TWh and scale to global population and annual timeframe
  // Formula: (Wh/day) × (8.2B people) × (365 days/year) × (1 TWh / 1e12 Wh)
  const globalAnnualTWh = dailyAverageWh * WORLD_POPULATION * DAYS_PER_YEAR / 1e12;
  return globalAnnualTWh;
}

/**
 * Finds the closest geographical entity for comparison
 * Uses logarithmic distance to find the best match
 *
 * @param {number} globalConsumptionTWh - Global annual consumption in TWh
 * @returns {Object|null} Closest matching entity or null if no data
 */
function findClosestEntity(globalConsumptionTWh) {
  if (!globalConsumptionTWh || globalConsumptionTWh <= 0) {
    return null;
  }

  let closestEntity = null;
  let minDistance = Infinity;

  // Find entity with minimum logarithmic distance
  for (const entity of ENERGY_CONSUMPTION_REFERENCE) {
    // Use logarithmic distance for better scaling across orders of magnitude
    const distance = Math.abs(Math.log10(entity.consumption) - Math.log10(globalConsumptionTWh));

    if (distance < minDistance) {
      minDistance = distance;
      closestEntity = entity;
    }
  }

  return closestEntity;
}

/**
 * Calculates the comparison ratio between global consumption and entity
 *
 * @param {number} globalConsumptionTWh - Global annual consumption in TWh
 * @param {number} entityConsumptionTWh - Entity's annual consumption in TWh
 * @returns {Object} Comparison data with ratio and relationship
 */
function calculateComparisonRatio(globalConsumptionTWh, entityConsumptionTWh) {
  const ratio = globalConsumptionTWh / entityConsumptionTWh;

  // Determine if it's "more than" or "less than" and format appropriately
  let relationship, formattedRatio;

  if (ratio >= 1) {
    // Global consumption is higher - e.g., "2.5× more than"
    relationship = "more than";
    formattedRatio = ratio.toFixed(1) + "×";
  } else {
    // Global consumption is lower - express as percentage, e.g., "about half of" or "88% of"
    const percentage = ratio * 100;

    // Use friendly phrases for common ratios
    if (percentage >= 90) {
      formattedRatio = "about the same as";
      relationship = "";
    } else if (percentage >= 75) {
      formattedRatio = Math.round(percentage) + "% of";
      relationship = "";
    } else if (percentage >= 45 && percentage <= 55) {
      formattedRatio = "about half of";
      relationship = "";
    } else if (percentage >= 30 && percentage <= 37) {
      formattedRatio = "about one-third of";
      relationship = "";
    } else if (percentage >= 23 && percentage <= 27) {
      formattedRatio = "about one-quarter of";
      relationship = "";
    } else if (percentage < 10) {
      formattedRatio = "less than " + Math.round(percentage) + "% of";
      relationship = "";
    } else {
      formattedRatio = Math.round(percentage) + "% of";
      relationship = "";
    }
  }

  return {
    ratio,
    relationship,
    formattedRatio,
    isHigher: ratio >= 1
  };
}

/**
 * Generates a human-readable global scale comparison message
 *
 * @param {number} dailyAverageWh - User's daily average energy consumption in Wh
 * @returns {Object|null} Comparison message and data, or null if insufficient data
 */
function getGlobalScaleComparison(dailyAverageWh) {
  // Return null if no meaningful consumption
  if (!dailyAverageWh || dailyAverageWh <= 0) {
    return null;
  }

  // Calculate global annual consumption
  const globalAnnualTWh = calculateGlobalAnnualConsumption(dailyAverageWh);

  // Find closest entity for comparison
  const closestEntity = findClosestEntity(globalAnnualTWh);

  if (!closestEntity) {
    return null;
  }

  // Calculate comparison ratio
  const comparison = calculateComparisonRatio(globalAnnualTWh, closestEntity.consumption);

  // Format the global consumption value
  let formattedGlobalConsumption;
  if (globalAnnualTWh >= 1) {
    formattedGlobalConsumption = globalAnnualTWh.toFixed(1) + " TWh";
  } else if (globalAnnualTWh >= 0.001) {
    formattedGlobalConsumption = (globalAnnualTWh * 1000).toFixed(1) + " GWh";
  } else {
    formattedGlobalConsumption = (globalAnnualTWh * 1e6).toFixed(1) + " MWh";
  }

  // Construct the message
  const relationshipText = comparison.relationship ? ` ${comparison.relationship}` : '';
  const message = `You consume ${dailyAverageWh.toFixed(2)} Wh per day on average. ` +
    `If everyone in the world consumed as much per day, in a year it would represent ` +
    `${formattedGlobalConsumption} — ${comparison.formattedRatio}${relationshipText} ` +
    `${closestEntity.name}${closestEntity.type === 'country' ? "'s" : "'s"} annual energy consumption ` +
    `(${closestEntity.consumption.toFixed(1)} TWh).`;

  return {
    message,
    dailyAverage: dailyAverageWh,
    globalAnnualTWh,
    formattedGlobalConsumption,
    closestEntity: {
      name: closestEntity.name,
      type: closestEntity.type,
      consumption: closestEntity.consumption,
      population: closestEntity.population
    },
    comparison: {
      ratio: comparison.ratio,
      relationship: comparison.relationship,
      formattedRatio: comparison.formattedRatio,
      isHigher: comparison.isHigher
    }
  };
}

// Make functions available globally for browser context
if (typeof window !== 'undefined') {
  window.WORLD_POPULATION = WORLD_POPULATION;
  window.DAYS_PER_YEAR = DAYS_PER_YEAR;
  window.ENERGY_CONSUMPTION_REFERENCE = ENERGY_CONSUMPTION_REFERENCE;
  window.calculateGlobalAnnualConsumption = calculateGlobalAnnualConsumption;
  window.findClosestEntity = findClosestEntity;
  window.calculateComparisonRatio = calculateComparisonRatio;
  window.getGlobalScaleComparison = getGlobalScaleComparison;
}

// CommonJS exports for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WORLD_POPULATION,
    DAYS_PER_YEAR,
    ENERGY_CONSUMPTION_REFERENCE,
    calculateGlobalAnnualConsumption,
    findClosestEntity,
    calculateComparisonRatio,
    getGlobalScaleComparison
  };
}
