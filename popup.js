/**
 * AI Impact Tracker - Popup UI Script
 * =======================================
 * This script handles the popup UI functionality including loading,
 * displaying usage logs and environmental metrics.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Load and display the logs when the popup opens
  loadLogs();
  
  // Set up tab switching
  document.getElementById('lifetime-tab').addEventListener('click', function() {
    switchTab('lifetime');
  });
  
  document.getElementById('today-tab').addEventListener('click', function() {
    switchTab('today');
  });
  
  
  // Add resize observer to adjust popup size based on content
  adjustPopupHeight();
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
    chrome.storage.local.get('chatgptLogs', function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading logs:', chrome.runtime.lastError);
        return;
      }
      
      const logs = result.chatgptLogs || [];
      console.log(`Loaded ${logs.length} logs from storage`);
      
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
  document.getElementById('today-energy').textContent = formatNumber(todayEnergyUsage.toFixed(2), true);
  
  // Calculate and update today's environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(todayEnergyUsage);
  
  // Update the DOM with the calculated values, ensure we have proper formatting
  try {
    // Update each element individually with error handling
    document.getElementById('today-movies').textContent = `${equivalents.movies} mins`;
    
    // Special handling for water consumption with explicit debugging
    const todayWaterElement = document.getElementById('today-toasts');
    if (todayWaterElement) {
      console.log('Updating today water consumption element:', todayWaterElement, 'with value:', equivalents.water);
      // Format water in ml if small, otherwise in L
      if (equivalents.water < 0.01) {
        todayWaterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(2))} ml`;
      } else {
        todayWaterElement.textContent = `${formatNumber(equivalents.water.toFixed(4))} L`;
      }
    } else {
      console.error('Today water consumption element not found! Check the ID in HTML.');
    }
    
    document.getElementById('today-phones').textContent = formatNumber(equivalents.phones);
    document.getElementById('today-train').textContent = `${formatNumber(equivalents.train)} km`;
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
  document.getElementById('lifetime-energy').textContent = formatNumber(totalEnergyUsage.toFixed(2), true);
  
  // Calculate and update lifetime environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(totalEnergyUsage);
  
  // Update the DOM with the calculated values, ensure we have proper formatting
  try {
    // Update each element individually with error handling
    document.getElementById('lifetime-movies').textContent = `${equivalents.movies} mins`;
    
    // Special handling for water consumption with explicit debugging
    const waterElement = document.getElementById('lifetime-toasts');
    if (waterElement) {
      console.log('Updating water consumption element:', waterElement, 'with value:', equivalents.water);
      // Format water in ml if small, otherwise in L
      if (equivalents.water < 0.01) {
        waterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(2))} ml`;
      } else {
        waterElement.textContent = `${formatNumber(equivalents.water.toFixed(4))} L`;
      }
    } else {
      console.error('Water consumption element not found! Check the ID in HTML.');
    }
    
    document.getElementById('lifetime-phones').textContent = formatNumber(equivalents.phones);
    document.getElementById('lifetime-train').textContent = `${formatNumber(equivalents.train)} km`;
    
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
      water: 0,
      phones: 0,
      train: 0
    };
  }
  
  // Environmental equivalents based on methodology.md
  // YouTube video streaming (0.25 Wh per minute of standard definition streaming)
  const movieMinutes = Math.max(0, Math.round(validEnergyUsage / 0.25));
  
  // Water consumption calculation (liters)
  // Water_Consumption_Liters = (Energy_Wh / 1000) * WUE_L_per_kWh
  // Using WUE of 0.2 L/kWh for Azure data centers
  const waterConsumptionLiters = Math.max(0, (validEnergyUsage / 1000) * 0.2);
  console.log(`Calculated water consumption: (${validEnergyUsage} Wh / 1000) * 0.2 = ${waterConsumptionLiters.toFixed(6)} liters`);
  
  // Phone charges (10-15 Wh per full charge)
  const phoneCharges = Math.max(0, Math.round(validEnergyUsage / 13.5 * 10) / 10);
  
  // High-speed train travel (20-30 Wh per passenger-kilometer)
  const trainTravel = Math.max(0, Math.round(validEnergyUsage / 25 * 10) / 10);
  
  console.log(`Calculating equivalents for ${validEnergyUsage}Wh (${energyUsageKwh}kWh):`, {
    movies: movieMinutes,
    water: waterConsumptionLiters,
    phones: phoneCharges,
    train: trainTravel
  });
  
  return {
    electricity: energyUsageKwh.toFixed(3),
    movies: movieMinutes,
    water: waterConsumptionLiters,
    phones: phoneCharges,
    train: trainTravel
  };
}

/**
 * Formats numbers with commas for better readability
 * For watt-hour values over 1000, uses k format (e.g., 1.4k)
 * @param {number} num - Number to format
 * @param {boolean} isEnergy - Whether this is an energy value (Wh)
 * @returns {string} Formatted number string
 */
function formatNumber(num, isEnergy = false) {
  // Parse the number to ensure we're working with a number
  const value = parseFloat(num);
  
  // For energy values (Wh) over 1000, use k format
  if (isEnergy && value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  
  // Otherwise use comma format
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}