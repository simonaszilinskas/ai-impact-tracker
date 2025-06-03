/**
 * AI Impact Tracker - Popup UI Script
 * =======================================
 * This script handles the popup UI functionality including loading,
 * displaying usage logs and environmental metrics.
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

document.addEventListener('DOMContentLoaded', function() {
  try {
    // Set up tab switching (this will work regardless of storage)
    document.getElementById('lifetime-tab').addEventListener('click', function() {
      switchTab('lifetime');
    });
    
    document.getElementById('today-tab').addEventListener('click', function() {
      switchTab('today');
    });
    
    // Set up email form event listeners
    setupEmailForm();
    
    // Add resize observer to adjust popup size based on content
    adjustPopupHeight();
    
    // Initialize with empty data
    updateTodayStats([]);
    updateLifetimeStats([]);
    
    // Check if user has email and show/hide overlay accordingly
    checkUserEmailAndUpdateUI();
    
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
    
    storage.get(['chatgptLogs', 'albertLogs', 'extensionVersion'], function(result) {
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
      
      const chatgptLogs = result.chatgptLogs || [];
      const albertLogs = result.albertLogs || [];
      const version = result.extensionVersion || 'unknown';
      
      // Combine logs from both platforms
      const allLogs = [...chatgptLogs, ...albertLogs];
      
      console.log(`Loaded ${chatgptLogs.length} ChatGPT logs and ${albertLogs.length} Albert logs (total: ${allLogs.length}) from storage (extension version: ${version})`);
      
      // Validate logs format
      if (!Array.isArray(chatgptLogs) || !Array.isArray(albertLogs)) {
        console.error('Invalid logs format in storage!');
        // Initialize with empty array as fallback
        updateTodayStats([]);
        updateLifetimeStats([]);
        
        // Attempt to repair storage
        chrome.storage.local.set({ 
          chatgptLogs: [],
          albertLogs: [],
          extensionVersion: chrome.runtime.getManifest().version 
        });
        return;
      }
      
      // Log some details about the logs if any exist
      if (allLogs.length > 0) {
        console.log('First log:', allLogs[0]);
        console.log('Last log:', allLogs[allLogs.length - 1]);
        
        // Calculate total energy usage
        const totalEnergy = allLogs.reduce((sum, log) => sum + (log.energyUsage || 0), 0);
        console.log(`Total energy usage in logs: ${totalEnergy.toFixed(2)} Wh`);
        
        // Check for logs with missing energy values
        const logsWithoutEnergy = allLogs.filter(log => log.energyUsage === undefined || log.energyUsage === null);
        if (logsWithoutEnergy.length > 0) {
          console.warn(`${logsWithoutEnergy.length} logs have missing energy usage values`);
        }
      }
      
      updateTodayStats(allLogs);
      updateLifetimeStats(allLogs);
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
    
    storage.get(['chatgptLogs', 'albertLogs'], function(result) {
      // Safely handle result
      if (!result) {
        console.warn('No result from storage in retry');
        return;
      }
      
      const chatgptLogs = Array.isArray(result.chatgptLogs) ? result.chatgptLogs : [];
      const albertLogs = Array.isArray(result.albertLogs) ? result.albertLogs : [];
      const allLogs = [...chatgptLogs, ...albertLogs];
      console.log(`Retry loaded ${chatgptLogs.length} ChatGPT logs and ${albertLogs.length} Albert logs (total: ${allLogs.length}) from storage`);
      
      updateTodayStats(allLogs);
      updateLifetimeStats(allLogs);
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
  document.getElementById('today-energy').textContent = formatNumber(todayEnergyUsage.toFixed(2), true);
  
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
    
    // Special handling for water consumption with explicit debugging
    const todayWaterElement = document.getElementById('today-toasts');
    if (todayWaterElement) {
      console.log('Updating today water consumption element:', todayWaterElement, 'with value:', equivalents.water);
      // Format water in ml if small, otherwise in L with simpler format
      if (equivalents.water < 0.01) {
        todayWaterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(0))} ml`;
      } else if (equivalents.water < 1) {
        todayWaterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(0))} ml`;
      } else {
        todayWaterElement.textContent = `${formatNumber(equivalents.water.toFixed(1))} L`;
      }
    } else {
      console.error('Today water consumption element not found! Check the ID in HTML.');
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
  document.getElementById('lifetime-energy').textContent = formatNumber(totalEnergyUsage.toFixed(2), true);
  
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
    
    // Special handling for water consumption with explicit debugging
    const waterElement = document.getElementById('lifetime-toasts');
    if (waterElement) {
      console.log('Updating water consumption element:', waterElement, 'with value:', equivalents.water);
      // Format water in ml if small, otherwise in L with simpler format
      if (equivalents.water < 0.01) {
        waterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(0))} ml`;
      } else if (equivalents.water < 1) {
        waterElement.textContent = `${formatNumber((equivalents.water * 1000).toFixed(0))} ml`;
      } else {
        waterElement.textContent = `${formatNumber(equivalents.water.toFixed(1))} L`;
      }
    } else {
      console.error('Water consumption element not found! Check the ID in HTML.');
    }
    
    document.getElementById('lifetime-phones').textContent = formatNumber(equivalents.phones);
    document.getElementById('lifetime-elevator').textContent = `${formatNumber(equivalents.elevator)} floors`;
    
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
      elevator: 0
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
  
  // Elevator rides (6.25 Wh per person per floor - assuming 2 people per elevator)
  const elevatorFloors = Math.max(0, Math.round(validEnergyUsage / 6.25));
  
  console.log(`Calculating equivalents for ${validEnergyUsage}Wh (${energyUsageKwh}kWh):`, {
    movies: movieMinutes,
    water: waterConsumptionLiters,
    phones: phoneCharges,
    elevator: elevatorFloors
  });
  
  // Convert to numbers and apply sensible defaults to prevent NaN
  return {
    electricity: energyUsageKwh.toFixed(3),
    movies: movieMinutes || 0,
    water: waterConsumptionLiters || 0,
    phones: phoneCharges || 0,
    elevator: elevatorFloors || 0
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

/**
 * Sets up email form event listeners
 */
function setupEmailForm() {
  const emailInput = document.getElementById('email-input');
  const submitBtn = document.getElementById('email-submit');
  
  // Submit email
  submitBtn.addEventListener('click', function() {
    const email = emailInput.value.trim();
    const marketingConsent = document.getElementById('marketing-consent').checked;
    
    if (email && isValidEmail(email)) {
      saveUserEmail(email, marketingConsent);
      hideEmailOverlay();
    } else {
      emailInput.style.borderColor = '#e74c3c';
      setTimeout(() => {
        emailInput.style.borderColor = '';
      }, 3000);
    }
  });
  
  // Allow enter key to submit
  emailInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });
}

/**
 * Checks user email and updates UI accordingly
 */
function checkUserEmailAndUpdateUI() {
  getUserEmail().then(email => {
    if (email) {
      hideEmailOverlay();
    } else {
      showEmailOverlay();
    }
  });
}

/**
 * Shows the email collection overlay
 */
function showEmailOverlay() {
  const overlay = document.getElementById('email-overlay');
  const lifetimeContainer = document.getElementById('lifetime-stats');
  const disclaimer = document.querySelector('.estimation-disclaimer');
  
  overlay.classList.remove('hidden');
  lifetimeContainer.classList.add('lifetime-blurred');
  if (disclaimer) disclaimer.style.display = 'none';
}

/**
 * Hides the email collection overlay
 */
function hideEmailOverlay() {
  const overlay = document.getElementById('email-overlay');
  const lifetimeContainer = document.getElementById('lifetime-stats');
  const disclaimer = document.querySelector('.estimation-disclaimer');
  
  overlay.classList.add('hidden');
  lifetimeContainer.classList.remove('lifetime-blurred');
  if (disclaimer) disclaimer.style.display = 'block';
  document.getElementById('email-input').value = '';
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Saves user email to storage
 */
function saveUserEmail(email, marketingConsent = false) {
  const storage = getChromeStorage();
  if (storage) {
    storage.set({ 
      userEmail: email,
      emailConsent: true,
      emailConsentDate: new Date().toISOString(),
      marketingConsent: marketingConsent,
      marketingConsentDate: marketingConsent ? new Date().toISOString() : null
    }, function() {
      console.log('User email saved with consent:', { email, marketingConsent });
      sendEmailToBackend(email, marketingConsent);
    });
  }
}

/**
 * Gets user email from storage
 */
function getUserEmail() {
  return new Promise((resolve) => {
    const storage = getChromeStorage();
    if (storage) {
      storage.get(['userEmail'], function(result) {
        resolve(result.userEmail || null);
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Sends email to backend for collection
 */
function sendEmailToBackend(email, marketingConsent = false) {
  // Supabase configuration (public anon key - safe to expose in browser extensions)
  const SUPABASE_URL = 'https://hhjwbkrobrljpuurvycq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoandia3JvYnJsanB1dXJ2eWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MjA1MTMsImV4cCI6MjA2MzQ5NjUxM30.aSU8ERRvV9RJdBYcReop42Ue3ZMH1U6S2JsNU-wpc5Y';
  
  fetch(`${SUPABASE_URL}/rest/v1/user_emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ 
      email: email,
      extension_version: chrome.runtime?.getManifest()?.version || 'unknown',
      consent_given: true,
      consent_date: new Date().toISOString(),
      marketing_consent: marketingConsent,
      marketing_consent_date: marketingConsent ? new Date().toISOString() : null
    })
  }).then(response => {
    if (response.ok) {
      console.log('Email sent to backend successfully');
    } else if (response.status === 409) {
      console.log('Email already exists in database (this is normal)');
    } else {
      console.error('Failed to send email to backend:', response.status);
    }
  }).catch(error => {
    console.error('Error sending email to backend:', error);
  });
}