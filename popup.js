/**
 * AI Impact Tracker - Popup UI Script
 * =======================================
 * This script handles the popup UI functionality including loading,
 * displaying, exporting, and clearing usage logs.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Load and display the logs when the popup opens
  loadLogs();
  
  // Set up event listeners for UI controls
  document.getElementById('refresh-btn').addEventListener('click', loadLogs);
  document.getElementById('export-btn').addEventListener('click', exportLogs);
  document.getElementById('clear-btn').addEventListener('click', clearLogs);
});

/**
 * Loads logs from Chrome storage and updates the UI
 */
function loadLogs() {
  chrome.storage.local.get('chatgptLogs', function(result) {
    const logs = result.chatgptLogs || [];
    updateTodayStats(logs);
    updateLifetimeStats(logs);
    renderUsageChart(logs);
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
  let todayUserTokens = 0;
  let todayAssistantTokens = 0;
  let todayEnergyUsage = 0;
  
  todayLogs.forEach(log => {
    todayUserTokens += log.userTokenCount || Math.ceil(log.userMessage.length / 4);
    todayAssistantTokens += log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
    todayEnergyUsage += log.energyUsage || 0;
  });
  
  const todayTotalTokens = todayUserTokens + todayAssistantTokens;
  
  // Update the UI
  document.getElementById('today-messages').textContent = formatNumber(todayMessages);
  document.getElementById('today-tokens').textContent = formatNumber(todayTotalTokens);
  
  // Calculate and update today's environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(todayEnergyUsage);
  
  document.getElementById('equiv-electricity').textContent = `${equivalents.electricity} kWh`;
  document.getElementById('equiv-movies').textContent = `${equivalents.movies} mins`;
  document.getElementById('equiv-toasts').textContent = equivalents.toasts;
  document.getElementById('equiv-laundry').textContent = equivalents.laundry;
}

/**
 * Updates the lifetime statistics section
 * @param {Array} logs - Array of conversation log entries
 */
function updateLifetimeStats(logs) {
  // Calculate lifetime totals
  let totalMessages = logs.length;
  let totalUserTokens = 0;
  let totalAssistantTokens = 0;
  let totalEnergyUsage = 0;
  
  logs.forEach(log => {
    totalUserTokens += log.userTokenCount || Math.ceil(log.userMessage.length / 4);
    totalAssistantTokens += log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
    totalEnergyUsage += log.energyUsage || 0;
  });
  
  const totalTokens = totalUserTokens + totalAssistantTokens;
  
  // Update the UI
  document.getElementById('lifetime-messages').textContent = formatNumber(totalMessages);
  document.getElementById('lifetime-tokens').textContent = formatNumber(totalTokens);
  
  // Calculate and update lifetime environmental equivalents
  const equivalents = calculateEnvironmentalEquivalents(totalEnergyUsage);
  
  document.getElementById('lifetime-electricity').textContent = `${equivalents.electricity} kWh`;
  document.getElementById('lifetime-movies').textContent = `${equivalents.movies} mins`;
  document.getElementById('lifetime-toasts').textContent = equivalents.toasts;
  document.getElementById('lifetime-laundry').textContent = equivalents.laundry;
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
  
  // Display electricity directly in kWh
  const electricityKwh = energyUsageKwh.toFixed(3);
  
  // Laundry cycles (assuming 0.5 kWh per load)
  const laundryLoads = Math.round(energyUsageKwh / 0.5 * 10) / 10;
  
  return {
    electricity: electricityKwh,
    movies: movieMinutes,
    toasts: toastsToasted,
    laundry: laundryLoads
  };
}

/**
 * Renders the usage chart showing daily token usage
 * @param {Array} logs - Array of conversation log entries
 */
function renderUsageChart(logs) {
  const chartContainer = document.getElementById('usage-chart');
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
    
    let dayUserTokens = 0;
    let dayAssistantTokens = 0;
    
    dayLogs.forEach(log => {
      dayUserTokens += log.userTokenCount || Math.ceil(log.userMessage.length / 4);
      dayAssistantTokens += log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
    });
    
    return {
      date: date.toLocaleDateString(),
      totalTokens: dayUserTokens + dayAssistantTokens
    };
  });
  
  // Find the maximum value for scaling
  const maxTokens = Math.max(...dailyUsage.map(day => day.totalTokens), 1);
  
  // Create chart bars
  dailyUsage.forEach(day => {
    const barHeight = (day.totalTokens / maxTokens) * 100;
    
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(barHeight, 4)}%`;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.textContent = `${day.date}: ${formatNumber(day.totalTokens)} tokens`;
    
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
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Exports logs as a downloadable JSON file
 * Includes summary statistics in the exported data
 */
function exportLogs() {
  chrome.storage.local.get('chatgptLogs', function(result) {
    const logs = result.chatgptLogs || [];
    
    if (logs.length === 0) {
      alert('No logs to export');
      return;
    }
    
    // Calculate overall totals for the export summary
    let totalUserTokens = 0;
    let totalAssistantTokens = 0;
    let totalEnergyUsage = 0;
    let totalCO2Emissions = 0;
    
    logs.forEach(log => {
      totalUserTokens += log.userTokenCount || Math.ceil(log.userMessage.length / 4);
      totalAssistantTokens += log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
      totalEnergyUsage += log.energyUsage || 0;
      totalCO2Emissions += log.co2Emissions || 0;
    });
    
    const data = JSON.stringify({
      logs: logs,
      exportDate: new Date().toISOString(),
      count: logs.length,
      totalUserTokens: totalUserTokens,
      totalAssistantTokens: totalAssistantTokens,
      totalEnergyUsage: totalEnergyUsage.toFixed(2),
      totalCO2Emissions: totalCO2Emissions.toFixed(2)
    }, null, 2);
    
    // Create and trigger a download
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chatgpt-logs.json';
    a.click();
    
    URL.revokeObjectURL(url);
  });
}

/**
 * Clears all logs from storage after confirmation
 */
function clearLogs() {
  if (confirm('Are you sure you want to delete all logs? This cannot be undone.')) {
    chrome.storage.local.set({chatgptLogs: []}, function() {
      loadLogs(); // Refresh the display
    });
  }
}