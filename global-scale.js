/**
 * AI Impact Tracker - Global Scale Comparison Module
 * ===================================================
 *
 * This module provides functionality to contextualize individual AI usage
 * at a global scale by comparing what would happen if all ChatGPT users
 * consumed the same amount of energy.
 *
 * Formula: User's daily average × 900 million ChatGPT WAU × 365 days
 * Result: Compared against annual electricity consumption of cities, countries, and continents
 *
 * @module global-scale
 */

/**
 * Estimated ChatGPT weekly active users (WAU) for scaling calculations (2025 estimate)
 */
const CHATGPT_WAU = 900e6; // 900 million weekly active users

/**
 * Days in a year for annual calculations
 */
const DAYS_PER_YEAR = 365;

/**
 * Reference dataset of geographical entities and their annual electricity consumption
 * All values in TWh (Terawatt-hours) per year
 *
 * Sources:
 * - Countries: IEA, Enerdata, Our World in Data (2023-2024 data)
 * - Cities: EIA, local utility data, municipal energy reports
 * - Continents: World Bank, IEA aggregated data
 *
 * Sorted from smallest to largest for efficient comparison
 */
const ELECTRICITY_CONSUMPTION_REFERENCE = [
  // Small island nations and city-states
  { name: "Malta", type: "country", consumption: 2.3, population: "0.5 million" },
  { name: "Luxembourg", type: "country", consumption: 6.4, population: "0.6 million" },
  { name: "Boston", type: "city", consumption: 12.3, population: "0.7 million" },
  { name: "Denver", type: "city", consumption: 13.1, population: "0.7 million" },
  { name: "Paris", type: "city", consumption: 16, population: "2.1 million" },
  { name: "Iceland", type: "country", consumption: 19.6, population: "0.4 million" },
  { name: "Ireland", type: "country", consumption: 31, population: "5.1 million" },
  { name: "Denmark", type: "country", consumption: 33, population: "5.9 million" },
  { name: "London", type: "city", consumption: 40, population: "9 million" },
  { name: "New Zealand", type: "country", consumption: 42, population: "5.1 million" },
  { name: "Tokyo", type: "city", consumption: 48, population: "14 million" },
  { name: "Portugal", type: "country", consumption: 50, population: "10.3 million" },
  { name: "Greece", type: "country", consumption: 53, population: "10.4 million" },
  { name: "Singapore", type: "country", consumption: 55, population: "5.9 million" },
  { name: "Switzerland", type: "country", consumption: 58, population: "8.7 million" },
  { name: "Czech Republic", type: "country", consumption: 62, population: "10.5 million" },
  { name: "Austria", type: "country", consumption: 72, population: "9.0 million" },
  { name: "Belgium", type: "country", consumption: 85, population: "11.6 million" },
  { name: "Finland", type: "country", consumption: 85, population: "5.5 million" },
  { name: "Netherlands", type: "country", consumption: 119, population: "17.6 million" },
  { name: "Norway", type: "country", consumption: 136, population: "5.5 million" },
  { name: "Sweden", type: "country", consumption: 140, population: "10.5 million" },
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
  { name: "India", type: "country", consumption: 1600, population: "1.4 billion" },
  { name: "Europe", type: "continent", consumption: 3400, population: "748 million" },
  { name: "United States", type: "country", consumption: 4065, population: "335 million" },
  { name: "North America", type: "continent", consumption: 4900, population: "580 million" },
  { name: "China", type: "country", consumption: 8539, population: "1.4 billion" },
  { name: "Asia", type: "continent", consumption: 13500, population: "4.7 billion" }
];

/**
 * Calculates what the total electricity consumption would be if all
 * ChatGPT users consumed the same amount as this user
 *
 * @param {number} dailyAverageWh - User's daily average energy consumption in Wh
 * @returns {number} Annual consumption across all ChatGPT users in TWh
 */
function calculateGlobalAnnualConsumption(dailyAverageWh) {
  // Convert Wh to TWh and scale to all ChatGPT users over a year
  // Formula: (Wh/day) × (900M users) × (365 days/year) × (1 TWh / 1e12 Wh)
  const globalAnnualTWh = dailyAverageWh * CHATGPT_WAU * DAYS_PER_YEAR / 1e12;
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
  for (const entity of ELECTRICITY_CONSUMPTION_REFERENCE) {
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
    `If all 900M ChatGPT users consumed as much per day, in a year it would represent ` +
    `${formattedGlobalConsumption} — ${comparison.formattedRatio}${relationshipText} ` +
    `${closestEntity.name}'s annual electricity consumption ` +
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
  window.CHATGPT_WAU = CHATGPT_WAU;
  window.DAYS_PER_YEAR = DAYS_PER_YEAR;
  window.ELECTRICITY_CONSUMPTION_REFERENCE = ELECTRICITY_CONSUMPTION_REFERENCE;
  window.calculateGlobalAnnualConsumption = calculateGlobalAnnualConsumption;
  window.findClosestEntity = findClosestEntity;
  window.calculateComparisonRatio = calculateComparisonRatio;
  window.getGlobalScaleComparison = getGlobalScaleComparison;
}

// CommonJS exports for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHATGPT_WAU,
    DAYS_PER_YEAR,
    ELECTRICITY_CONSUMPTION_REFERENCE,
    calculateGlobalAnnualConsumption,
    findClosestEntity,
    calculateComparisonRatio,
    getGlobalScaleComparison
  };
}
