/**
 * AI Impact Tracker - Popup UI Script
 * =======================================
 * This script handles the popup UI functionality including loading,
 * displaying usage logs and environmental metrics.
 *
 * Note: energy-calculator.js is loaded before this file via popup.html
 * The calculateEnergyAndEmissions() function is available from window.calculateEnergyAndEmissions
 */

/**
 * Safely access chrome.storage API
 * Returns null if not available
 */
const getChromeStorage = () => {
  try {
    // Check if we're in a proper extension context
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
  } catch (e) {
    console.error("Error accessing chrome storage API:", e);
  }
  return null;
};

/**
 * One-time cleanup of email-related storage keys (Issue #15)
 * Removes all email collection data from previous versions
 */
function cleanupEmailStorage() {
  const storage = getChromeStorage();
  if (storage) {
    storage.remove([
      'userEmail',
      'emailConsent',
      'emailConsentDate',
      'marketingConsent',
      'marketingConsentDate'
    ], function() {
      console.log('Email storage cleanup completed (Issue #15)');
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  try {
    // One-time cleanup: Remove old email-related storage keys (Issue #15)
    cleanupEmailStorage();

    // Set up tab switching (this will work regardless of storage)
    document.getElementById('lifetime-tab').addEventListener('click', function() {
      switchTab('lifetime');
    });

    document.getElementById('today-tab').addEventListener('click', function() {
      switchTab('today');
    });

    // Recalculate all logs on load to ensure they use the current formula
    recalculateAllLogs();

    // Add resize observer to adjust popup size based on content
    adjustPopupHeight();

    // Initialize with empty data
    updateTodayStats([]);
    updateLifetimeStats([]);

    // Try to load logs, but don't fail if storage is unavailable
    loadLogs();
  } catch(err) {
    console.error("Error initializing popup:", err);
  }
});

/**
 * Adjusts the popup height to fit content without scrolling
 * Uses a safer implementation to avoid ResizeObserver loop errors
 */
function adjustPopupHeight() {
  // Use requestAnimationFrame to avoid ResizeObserver loops
  let rafId = null;
  let lastHeight = 0;
  let resizeObserver = null;
  
  // Function that actually handles resizing, but throttled with rAF
  const processResize = () => {
    rafId = null;
    
    // Get the visible tab content
    const activeTab = document.querySelector('.stats-container.active');
    if (!activeTab) return;
    
    // Get current height
    const currentScrollHeight = document.body.scrollHeight;
    
    // Only process if height actually changed since last check
    if (currentScrollHeight !== lastHeight && currentScrollHeight > window.innerHeight) {
      lastHeight = currentScrollHeight;
      
      // If we made changes, disconnect and delay re-connecting to prevent loops
      if (resizeObserver) {
        resizeObserver.disconnect();
        setTimeout(() => {
          resizeObserver.observe(document.body);
        }, 100);
      }
    }
  };
  
  // Create the observer with throttling pattern
  resizeObserver = new ResizeObserver(() => {
    if (!rafId) {
      rafId = requestAnimationFrame(processResize);
    }
  });
  
  // Start observing
  resizeObserver.observe(document.body);
  
  // Save reference to allow cleanup if needed
  window._popupResizeObserver = resizeObserver;
}

/**
 * Switches between lifetime and today tabs
 * @param {string} tabId - The ID of the tab to switch to ('lifetime' or 'today')
 */
function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.stats-container').forEach(container => {
    container.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show the selected tab
  document.getElementById(`${tabId}-stats`).classList.add('active');
  document.getElementById(`${tabId}-tab`).classList.add('active');
  
  // No need for manual resize event with our improved ResizeObserver
}

/**
 * Loads logs from Chrome storage and updates the UI
 * Includes additional error handling and logging
 */
function loadLogs() {
  try {
    // Get storage safely
    const storage = getChromeStorage();
    if (!storage) {
      console.warn('Chrome storage API not available - showing empty stats');
      return; // We already initialized with empty stats
    }
    
    storage.get(['chatgptLogs', 'extensionVersion'], function(result) {
      // Check for chrome.runtime.lastError safely
      const lastError = chrome.runtime && chrome.runtime.lastError;
      if (lastError) {
        console.error('Error loading logs:', lastError);
        // Retry once after a short delay
        setTimeout(() => {
          console.log('Retrying log load after error...');
          tryLoadLogsAgain();
        }, 500);
        return;
      }
      
      const logs = result.chatgptLogs || [];
      const version = result.extensionVersion || 'unknown';
      console.log(`Loaded ${logs.length} logs from storage (extension version: ${version})`);
      
      // Validate logs format
      if (!Array.isArray(logs)) {
        console.error('Invalid logs format in storage!');
        // Initialize with empty array as fallback
        updateTodayStats([]);
        updateLifetimeStats([]);
        
        // Attempt to repair storage
        chrome.storage.local.set({ 
          chatgptLogs: [],
          extensionVersion: chrome.runtime.getManifest().version 
        });
        return;
      }
      
      // Log some details about the logs if any exist
      if (logs.length > 0) {
        console.log('First log:', logs[0]);
        console.log('Last log:', logs[logs.length - 1]);
        
        // Calculate total energy usage
        const totalEnergy = logs.reduce((sum, log) => sum + (log.energyUsage || 0), 0);
        console.log(`Total energy usage in logs: ${totalEnergy.toFixed(2)} Wh`);
        
        // Check for logs with missing energy values
        const logsWithoutEnergy = logs.filter(log => log.energyUsage === undefined || log.energyUsage === null);
        if (logsWithoutEnergy.length > 0) {
          console.warn(`${logsWithoutEnergy.length} logs have missing energy usage values`);
        }
      }
      
      updateTodayStats(logs);
      updateLifetimeStats(logs);
    });
  } catch (e) {
    console.error('Error in loadLogs:', e);
    // Use empty arrays as fallback
    updateTodayStats([]);
    updateLifetimeStats([]);
  }
}

function tryLoadLogsAgain() {
  try {
    // Get storage safely
    const storage = getChromeStorage();
    if (!storage) {
      console.warn('Chrome storage API not available in retry attempt');
      return; // We already initialized with empty stats
    }
    
    storage.get('chatgptLogs', function(result) {
      // Safely handle result
      if (!result) {
        console.warn('No result from storage in retry');
        return;
      }
      
      const logs = Array.isArray(result.chatgptLogs) ? result.chatgptLogs : [];
      console.log(`Retry loaded ${logs.length} logs from storage`);
      
      updateTodayStats(logs);
      updateLifetimeStats(logs);
    });
  } catch (e) {
    console.error('Error in retry loadLogs:', e);
    // Already initialized with empty stats
  }
}

/**
 * Updates the "Today" section with statistics for today
 * @param {Array} logs - Array of conversation log entries
 */
function updateTodayStats(logs) {
  // Get today's date (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter logs for today only
  const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);
  
  // Calculate today's statistics
  let todayMessages = todayLogs.length;
  let todayEnergyUsage = 0;
  
  // Only use actual log data, don't add minimum values
  if (todayLogs.length === 0) {
    todayEnergyUsage = 0;
  } else {
    todayLogs.forEach(log => {
      // Ensure we have at least a minimum energy value
      const logEnergy = log.energyUsage || 0;
      todayEnergyUsage += logEnergy;
    });
    
    // Use actual value, no minimum threshold
    todayEnergyUsage = todayEnergyUsage;
  }
  
  // Update the UI
  document.getElementById('today-messages').textContent = formatNumber(todayMessages);
  const todayEnergy = formatEnergy(todayEnergyUsage);
  document.getElementById('today-energy').textContent = formatNumber(todayEnergy.value);
  document.getElementById('today-energy-unit').textContent = todayEnergy.unit + ' used';
  
  // Calculate and update today's environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(todayEnergyUsage);
  
  // Update the DOM with the calculated values, ensure we have proper formatting
  try {
    // Update each element individually with error handling
    // Format YouTube streaming time - show in hours if over 60 minutes
    const todayMovieMinutes = equivalents.movies;
    let todayFormattedMovieTime;
    
    if (todayMovieMinutes >= 60) {
      const todayMovieHours = todayMovieMinutes / 60;
      // One decimal place for 1-10 hours, no decimals above 10 hours
      if (todayMovieHours < 10) {
        todayFormattedMovieTime = `${formatNumber(todayMovieHours.toFixed(1))} hours`;
      } else {
        todayFormattedMovieTime = `${formatNumber(Math.round(todayMovieHours))} hours`;
      }
    } else {
      todayFormattedMovieTime = `${formatNumber(todayMovieMinutes)} mins`;
    }
    
    document.getElementById('today-movies').textContent = todayFormattedMovieTime;

    // Special handling for light bulb runtime with explicit debugging
    const todayLightbulbElement = document.getElementById('today-toasts');
    if (todayLightbulbElement) {
      console.log('Updating today light bulb runtime element:', todayLightbulbElement, 'with value:', equivalents.lightbulb);
      // Format light bulb runtime - show in minutes if < 60, hours if >= 60
      const lightBulbMinutes = equivalents.lightbulb;
      if (lightBulbMinutes < 1) {
        // Less than 1 minute, show as seconds
        const seconds = Math.round(lightBulbMinutes * 60);
        todayLightbulbElement.textContent = `${formatNumber(seconds)} secs`;
      } else if (lightBulbMinutes < 60) {
        // Less than 60 minutes, show in minutes
        todayLightbulbElement.textContent = `${formatNumber(Math.round(lightBulbMinutes))} mins`;
      } else {
        // 60+ minutes, show in hours
        const lightBulbHours = lightBulbMinutes / 60;
        if (lightBulbHours < 10) {
          todayLightbulbElement.textContent = `${formatNumber(lightBulbHours.toFixed(1))} hours`;
        } else {
          todayLightbulbElement.textContent = `${formatNumber(Math.round(lightBulbHours))} hours`;
        }
      }
    } else {
      console.error('Today light bulb runtime element not found! Check the ID in HTML.');
    }

    document.getElementById('today-phones').textContent = formatNumber(equivalents.phones);
    document.getElementById('today-elevator').textContent = `${formatNumber(equivalents.elevator)} floors`;
  } catch (error) {
    console.error('Error updating today environmental equivalents:', error);
  }
  
  // Log the values for debugging
  console.log('Today environmental equivalents:', equivalents);
}

/**
 * Updates the lifetime statistics section
 * @param {Array} logs - Array of conversation log entries
 */
function updateLifetimeStats(logs) {
  // Calculate lifetime totals
  let totalMessages = logs.length;
  let totalEnergyUsage = 0;
  
  // Only use actual log data, don't add minimum values
  if (logs.length === 0) {
    totalEnergyUsage = 0;
  } else {
    logs.forEach(log => {
      // Ensure we have at least a minimum energy value
      const logEnergy = log.energyUsage || 0;
      totalEnergyUsage += logEnergy;
    });
    
    // Use actual value, no minimum threshold
    totalEnergyUsage = totalEnergyUsage;
  }
  
  // Update the UI
  document.getElementById('lifetime-messages').textContent = formatNumber(totalMessages);
  const lifetimeEnergy = formatEnergy(totalEnergyUsage);
  document.getElementById('lifetime-energy').textContent = formatNumber(lifetimeEnergy.value);
  document.getElementById('lifetime-energy-unit').textContent = lifetimeEnergy.unit + ' used';
  
  // Calculate and update lifetime environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(totalEnergyUsage);
  
  // Update the DOM with the calculated values, ensure we have proper formatting
  try {
    // Update each element individually with error handling
    // Format YouTube streaming time - show in hours if over 60 minutes
    const lifetimeMovieMinutes = equivalents.movies;
    let lifetimeFormattedMovieTime;
    
    if (lifetimeMovieMinutes >= 60) {
      const lifetimeMovieHours = lifetimeMovieMinutes / 60;
      // One decimal place for 1-10 hours, no decimals above 10 hours
      if (lifetimeMovieHours < 10) {
        lifetimeFormattedMovieTime = `${formatNumber(lifetimeMovieHours.toFixed(1))} hours`;
      } else {
        lifetimeFormattedMovieTime = `${formatNumber(Math.round(lifetimeMovieHours))} hours`;
      }
    } else {
      lifetimeFormattedMovieTime = `${formatNumber(lifetimeMovieMinutes)} mins`;
    }
    
    document.getElementById('lifetime-movies').textContent = lifetimeFormattedMovieTime;

    // Special handling for light bulb runtime with explicit debugging
    const lightbulbElement = document.getElementById('lifetime-toasts');
    if (lightbulbElement) {
      console.log('Updating light bulb runtime element:', lightbulbElement, 'with value:', equivalents.lightbulb);
      // Format light bulb runtime - show in minutes if < 60, hours if >= 60
      const lightBulbMinutes = equivalents.lightbulb;
      if (lightBulbMinutes < 1) {
        // Less than 1 minute, show as seconds
        const seconds = Math.round(lightBulbMinutes * 60);
        lightbulbElement.textContent = `${formatNumber(seconds)} secs`;
      } else if (lightBulbMinutes < 60) {
        // Less than 60 minutes, show in minutes
        lightbulbElement.textContent = `${formatNumber(Math.round(lightBulbMinutes))} mins`;
      } else {
        // 60+ minutes, show in hours
        const lightBulbHours = lightBulbMinutes / 60;
        if (lightBulbHours < 10) {
          lightbulbElement.textContent = `${formatNumber(lightBulbHours.toFixed(1))} hours`;
        } else {
          lightbulbElement.textContent = `${formatNumber(Math.round(lightBulbHours))} hours`;
        }
      }
    } else {
      console.error('Light bulb runtime element not found! Check the ID in HTML.');
    }

    document.getElementById('lifetime-phones').textContent = formatNumber(equivalents.phones);
    document.getElementById('lifetime-elevator').textContent = `${formatNumber(equivalents.elevator)} floors`;

    // Update global scale comparison
    updateGlobalScaleComparison(logs, totalEnergyUsage);

    // Force a repaint to ensure updates are visible
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  } catch (error) {
    console.error('Error updating environmental equivalents:', error);
  }

  // Log the values for debugging
  console.log('Lifetime environmental equivalents:', equivalents);
}

/**
 * Updates the global scale comparison section
 * @param {Array} logs - Array of conversation log entries
 * @param {number} totalEnergyUsage - Total lifetime energy usage in Wh
 */
function updateGlobalScaleComparison(logs, totalEnergyUsage) {
  const messageElement = document.getElementById('lifetime-global-scale-message');

  if (!messageElement) {
    console.warn('Global scale message element not found');
    return;
  }

  // Calculate daily average energy usage
  if (logs.length === 0 || totalEnergyUsage <= 0) {
    messageElement.innerHTML = 'Start using ChatGPT to see your impact at scale!';
    return;
  }

  // Find the date range of logs
  const timestamps = logs.map(log => new Date(log.timestamp).getTime());
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);

  // Calculate number of days (minimum 1 day to avoid division by zero)
  const daysDifference = Math.max(1, Math.ceil((newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24)));

  // Calculate daily average
  const dailyAverageWh = totalEnergyUsage / daysDifference;

  // Get global scale comparison using the global-scale module
  if (typeof window.getGlobalScaleComparison === 'function') {
    const comparison = window.getGlobalScaleComparison(dailyAverageWh);

    if (comparison && comparison.message) {
      // Format the message with bold highlights
      let formattedMessage = comparison.message;

      // Make the daily average bold (the message from global-scale.js uses Wh)
      const dailyFormatted = formatEnergy(dailyAverageWh);
      formattedMessage = formattedMessage.replace(
        `${dailyAverageWh.toFixed(2)} Wh`,
        `<strong>${dailyFormatted.value} ${dailyFormatted.unit}</strong>`
      );

      // Make the global consumption bold
      formattedMessage = formattedMessage.replace(
        comparison.formattedGlobalConsumption,
        `<strong>${comparison.formattedGlobalConsumption}</strong>`
      );

      // Make the entity name bold
      formattedMessage = formattedMessage.replace(
        comparison.closestEntity.name,
        `<strong>${comparison.closestEntity.name}</strong>`
      );

      messageElement.innerHTML = formattedMessage;

      console.log('Global scale comparison:', comparison);
    } else {
      messageElement.innerHTML = 'Insufficient data for global comparison.';
    }
  } else {
    console.error('getGlobalScaleComparison function not available. Make sure global-scale.js is loaded.');
    messageElement.innerHTML = 'Global scale comparison unavailable.';
  }
}

/**
 * Calculates environmental equivalents for a given energy usage
 * Handles zero values appropriately
 * @param {number} energyUsageWh - Energy usage in watt-hours
 * @returns {Object} Object containing various environmental equivalents
 */
function calculateEnvironmentalEquivalents(energyUsageWh) {
  // Ensure we're working with a valid number
  const validEnergyUsage = parseFloat(energyUsageWh) || 0;
  
  // Convert Wh to kWh
  const energyUsageKwh = validEnergyUsage / 1000;
  
  // If energy usage is zero or very close to zero, return zeros for all equivalents
  if (energyUsageKwh < 0.0001) {
    return {
      electricity: "0",
      movies: 0,
      lightbulb: 0,
      phones: 0,
      elevator: 0
    };
  }

  // Environmental equivalents based on methodology.md
  // YouTube video streaming (0.25 Wh per minute of standard definition streaming)
  const movieMinutes = Math.max(0, Math.round(validEnergyUsage / 0.25));

  // Light bulb runtime calculation (60W incandescent bulb)
  // 60W bulb = 0.06 kW
  // Runtime in minutes = (energyWh / 60W) * 60 minutes
  const lightBulbMinutes = Math.max(0, (validEnergyUsage / 60) * 60);
  console.log(`Calculated light bulb runtime: (${validEnergyUsage} Wh / 60) * 60 = ${lightBulbMinutes.toFixed(2)} minutes`);

  // Phone charges (10-15 Wh per full charge)
  const phoneCharges = Math.max(0, Math.round(validEnergyUsage / 13.5 * 10) / 10);
  
  // Elevator rides (6.25 Wh per person per floor - assuming 2 people per elevator)
  const elevatorFloors = Math.max(0, Math.round(validEnergyUsage / 6.25));
  
  console.log(`Calculating equivalents for ${validEnergyUsage}Wh (${energyUsageKwh}kWh):`, {
    movies: movieMinutes,
    lightbulb: lightBulbMinutes,
    phones: phoneCharges,
    elevator: elevatorFloors
  });

  // Convert to numbers and apply sensible defaults to prevent NaN
  return {
    electricity: energyUsageKwh.toFixed(3),
    movies: movieMinutes || 0,
    lightbulb: lightBulbMinutes || 0,
    phones: phoneCharges || 0,
    elevator: elevatorFloors || 0
  };
}

/**
 * Formats numbers with commas for better readability
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  const value = parseFloat(num);
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats energy values with adaptive units for readability.
 * Shows mWh for small values, Wh for medium, kWh for large.
 * @param {number} energyWh - Energy in watt-hours
 * @returns {{value: string, unit: string}} Formatted value and unit label
 */
function formatEnergy(energyWh) {
  const val = parseFloat(energyWh) || 0;
  if (val >= 1000) {
    return { value: (val / 1000).toFixed(1), unit: 'kWh' };
  } else if (val >= 1) {
    return { value: val.toFixed(2), unit: 'Wh' };
  } else {
    return { value: (val * 1000).toFixed(1), unit: 'mWh' };
  }
}

/**
 * Recalculates all stored logs with the current formula.
 * Called on popup load to ensure stored energy values match the current methodology.
 */
function recalculateAllLogs() {
  const storage = getChromeStorage();
  if (!storage) return;

  storage.get(['chatgptLogs'], function(result) {
    const logs = result.chatgptLogs || [];

    logs.forEach(log => {
      if (log.assistantTokenCount > 0) {
        const energyData = calculateEnergyAndEmissions(log.assistantTokenCount);
        log.energyUsage = energyData.totalEnergy;
        log.co2Emissions = energyData.co2Emissions;
      }
    });

    storage.set({ chatgptLogs: logs }, function() {
      updateTodayStats(logs);
      updateLifetimeStats(logs);
      console.log(`Recalculated ${logs.length} logs with EcoLogits v0.9.x methodology`);
    });
  });
}

