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
  
  // Set up theme toggle
  initTheme();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
});

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
}

/**
 * Loads logs from Chrome storage and updates the UI
 */
function loadLogs() {
  chrome.storage.local.get('chatgptLogs', function(result) {
    const logs = result.chatgptLogs || [];
    updateTodayStats(logs);
    updateLifetimeStats(logs);
    renderUsageChart(logs);
    renderHourlyChart(logs);
  });
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
  
  todayLogs.forEach(log => {
    todayEnergyUsage += log.energyUsage || 0;
  });
  
  // Update the UI
  document.getElementById('today-messages').textContent = formatNumber(todayMessages);
  document.getElementById('today-energy').textContent = formatNumber(todayEnergyUsage.toFixed(2));
  
  // Calculate and update today's environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(todayEnergyUsage);
  
  document.getElementById('today-movies').textContent = `${equivalents.movies} mins`;
  document.getElementById('today-toasts').textContent = equivalents.toasts;
  document.getElementById('today-phones').textContent = equivalents.phones;
  document.getElementById('today-train').textContent = `${equivalents.train} km`;
}

/**
 * Updates the lifetime statistics section
 * @param {Array} logs - Array of conversation log entries
 */
function updateLifetimeStats(logs) {
  // Calculate lifetime totals
  let totalMessages = logs.length;
  let totalEnergyUsage = 0;
  
  logs.forEach(log => {
    totalEnergyUsage += log.energyUsage || 0;
  });
  
  // Update the UI
  document.getElementById('lifetime-messages').textContent = formatNumber(totalMessages);
  document.getElementById('lifetime-energy').textContent = formatNumber(totalEnergyUsage.toFixed(2));
  
  // Calculate and update lifetime environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(totalEnergyUsage);
  
  document.getElementById('lifetime-movies').textContent = `${equivalents.movies} mins`;
  document.getElementById('lifetime-toasts').textContent = equivalents.toasts;
  document.getElementById('lifetime-phones').textContent = equivalents.phones;
  document.getElementById('lifetime-train').textContent = `${equivalents.train} km`;
}

/**
 * Calculates environmental equivalents for a given energy usage
 * @param {number} energyUsageWh - Energy usage in watt-hours
 * @returns {Object} Object containing various environmental equivalents
 */
function calculateEnvironmentalEquivalents(energyUsageWh) {
  // Convert Wh to kWh
  const energyUsageKwh = energyUsageWh / 1000;
  
  // Environmental equivalents (approximate values)
  // Harry Potter movie streaming (assuming 0.08 kWh per hour of HD streaming)
  const movieMinutes = Math.round(energyUsageKwh / 0.08 * 60);
  
  // Toasts (assuming 0.04 kWh per toast)
  const toastsToasted = Math.round(energyUsageKwh / 0.04);
  
  // Phone charges (assuming 0.0088 kWh per full phone charge)
  const phoneCharges = Math.round(energyUsageKwh / 0.0088 * 10) / 10;
  
  // High-speed train travel (assuming 0.022 kWh per passenger-km)
  const trainTravel = Math.round(energyUsageKwh / 0.022 * 10) / 10;
  
  return {
    electricity: energyUsageKwh.toFixed(3),
    movies: movieMinutes,
    toasts: toastsToasted,
    phones: phoneCharges,
    train: trainTravel
  };
}

/**
 * Renders the usage chart showing daily message and energy usage
 * @param {Array} logs - Array of conversation log entries
 */
function renderUsageChart(logs) {
  const chartContainer = document.getElementById('lifetime-usage-chart');
  chartContainer.innerHTML = '';
  
  // Get date range (last 7 days)
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }
  
  // Calculate daily usage
  const dailyUsage = dates.map(date => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    const dayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= date && logDate < nextDay;
    });
    
    let dayEnergyUsage = 0;
    
    dayLogs.forEach(log => {
      dayEnergyUsage += log.energyUsage || 0;
    });
    
    return {
      date: date.toLocaleDateString(),
      energyUsage: dayEnergyUsage,
      messageCount: dayLogs.length
    };
  });
  
  // Find the maximum value for scaling
  const maxEnergy = Math.max(...dailyUsage.map(day => day.energyUsage), 0.1);
  
  // Create chart bars
  dailyUsage.forEach(day => {
    const barHeight = (day.energyUsage / maxEnergy) * 100;
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(barHeight, 4)}%`;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.textContent = `${day.date}: ${formatNumber(day.messageCount)} msgs (${day.energyUsage.toFixed(2)} Wh)`;
    
    bar.appendChild(tooltip);
    chartContainer.appendChild(bar);
  });
}

/**
 * Renders the hourly usage chart for today
 * @param {Array} logs - Array of conversation log entries
 */
function renderHourlyChart(logs) {
  const chartContainer = document.getElementById('hourly-usage-chart');
  chartContainer.innerHTML = '';
  
  // Get today's date (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter logs for today only
  const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);
  
  // Initialize hourly data
  const hourlyData = [];
  for (let hour = 0; hour < 24; hour++) {
    hourlyData.push({
      hour: hour,
      energyUsage: 0,
      messageCount: 0
    });
  }
  
  // Calculate hourly usage
  todayLogs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const hour = logDate.getHours();
    
    hourlyData[hour].energyUsage += log.energyUsage || 0;
    hourlyData[hour].messageCount++;
  });
  
  // Find the maximum value for scaling
  const maxEnergy = Math.max(...hourlyData.map(hour => hour.energyUsage), 0.1);
  
  // Create chart bars
  hourlyData.forEach(hourData => {
    const barHeight = (hourData.energyUsage / maxEnergy) * 100;
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(barHeight, 4)}%`;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    
    // Format hour with leading zero
    const hourStr = `${hourData.hour.toString().padStart(2, '0')}:00`;
    tooltip.textContent = `${hourStr}: ${formatNumber(hourData.messageCount)} msgs (${hourData.energyUsage.toFixed(2)} Wh)`;
    
    bar.appendChild(tooltip);
    chartContainer.appendChild(bar);
  });
}

/**
 * Formats numbers with commas for better readability
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Initializes the theme based on saved preferences or system preferences
 */
function initTheme() {
  chrome.storage.local.get('theme', function(result) {
    const savedTheme = result.theme;
    
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // If no preference is saved, respect the system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  });
}

/**
 * Toggles between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  let newTheme;
  
  if (currentTheme === 'dark') {
    newTheme = 'light';
  } else {
    newTheme = 'dark';
  }
  
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // Save the theme preference
  chrome.storage.local.set({ theme: newTheme });
}