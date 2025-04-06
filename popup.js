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
    displayLogs(logs);
    updateCounter(logs);
  });
}

/**
 * Displays conversation logs in the popup UI
 * Groups conversations by ID and creates collapsible accordions
 * @param {Array} logs - Array of conversation log entries
 */
function displayLogs(logs) {
  const logsContainer = document.getElementById('logs-container');
  logsContainer.innerHTML = ''; // Clear existing content
  
  if (logs.length === 0) {
    logsContainer.innerHTML = '<div class="empty-state">No conversation logs yet. Visit ChatGPT to start logging.</div>';
    return;
  }
  
  // Sort logs by timestamp (newest first)
  logs.sort((a, b) => b.timestamp - a.timestamp);
  
  // Group logs by conversation
  const conversationGroups = {};
  logs.forEach(log => {
    const convoId = log.conversationId || 'unknown';
    if (!conversationGroups[convoId]) {
      conversationGroups[convoId] = [];
    }
    conversationGroups[convoId].push(log);
  });
  
  // Create an accordion for each conversation
  Object.keys(conversationGroups).forEach(convoId => {
    const convoLogs = conversationGroups[convoId];
    const convoDate = new Date(convoLogs[0].timestamp).toLocaleDateString();
    
    // Calculate conversation totals
    let totalUserTokens = 0;
    let totalAssistantTokens = 0;
    let totalEnergyUsage = 0;
    let totalCO2Emissions = 0;
    
    convoLogs.forEach(log => {
      totalUserTokens += log.userTokenCount || Math.ceil(log.userMessage.length / 4);
      totalAssistantTokens += log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
      totalEnergyUsage += log.energyUsage || 0;
      totalCO2Emissions += log.co2Emissions || 0;
    });
    
    // Create conversation accordion
    const accordion = document.createElement('div');
    accordion.className = 'conversation-accordion';
    
    // Create accordion header
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
      <div class="convo-title">
        <span class="convo-date">${convoDate}</span>
      </div>
      <div class="convo-stats">
        <span class="message-count">${convoLogs.length} messages</span>
        <span class="token-count">(User: ${formatNumber(totalUserTokens)} tokens | AI: ${formatNumber(totalAssistantTokens)} tokens)</span>
      </div>
      <div class="env-stats">
        <span class="energy-badge">⚡ ${totalEnergyUsage.toFixed(2)} Wh</span>
        <span class="co2-badge">🌱 ${totalCO2Emissions.toFixed(2)} g CO2eq</span>
      </div>
      <span class="toggle-icon">▼</span>
    `;
    
    // Create accordion content
    const content = document.createElement('div');
    content.className = 'accordion-content hidden';
    
    // Add each message exchange to the content
    convoLogs.forEach(log => {
      const exchange = document.createElement('div');
      exchange.className = 'message-exchange';
      
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const userTokens = log.userTokenCount || Math.ceil(log.userMessage.length / 4);
      const assistantTokens = log.assistantTokenCount || Math.ceil(log.assistantResponse.length / 4);
      const energyUsage = log.energyUsage || 0;
      const co2Emissions = log.co2Emissions || 0;
      
      exchange.innerHTML = `
        <div class="message-time">${timestamp}</div>
        <div class="user-message">
          <div class="message-label">You: <span class="token-badge">${formatNumber(userTokens)} tokens</span></div>
          <div class="message-text">${escapeHtml(log.userMessage)}</div>
        </div>
        <div class="assistant-message">
          <div class="message-label">
            ChatGPT: 
            <span class="token-badge">${formatNumber(assistantTokens)} tokens</span>
            <span class="energy-badge small">⚡ ${energyUsage.toFixed(2)} Wh</span>
            <span class="co2-badge small">🌱 ${co2Emissions.toFixed(2)} g CO2eq</span>
          </div>
          <div class="message-text">${escapeHtml(log.assistantResponse)}</div>
        </div>
      `;
      
      content.appendChild(exchange);
    });
    
    // Add toggle functionality
    header.addEventListener('click', function() {
      content.classList.toggle('hidden');
      const toggleIcon = header.querySelector('.toggle-icon');
      toggleIcon.textContent = content.classList.contains('hidden') ? '▼' : '▲';
    });
    
    // Append header and content to accordion
    accordion.appendChild(header);
    accordion.appendChild(content);
    
    // Add to container
    logsContainer.appendChild(accordion);
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
 * Updates the summary counter with total statistics
 * @param {Array} logs - Array of conversation log entries
 */
function updateCounter(logs) {
  const counter = document.getElementById('logs-counter');
  
  if (logs.length === 0) {
    counter.textContent = "No conversation exchanges logged";
    return;
  }
  
  // Calculate overall totals
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
  
  counter.innerHTML = `
    ${logs.length} conversation exchanges logged
    <div class="total-tokens">
      Total tokens — User: ${formatNumber(totalUserTokens)} | AI: ${formatNumber(totalAssistantTokens)}
    </div>
    <div class="environmental-impact">
      <div class="energy-total">⚡ Total Energy: ${totalEnergyUsage.toFixed(2)} Wh</div>
      <div class="emissions-total">🌱 Total CO2: ${totalCO2Emissions.toFixed(2)} g CO2eq</div>
    </div>
  `;
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