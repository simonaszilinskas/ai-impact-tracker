/**
 * AI Impact Tracker - Content Script
 * =====================================
 * This script captures conversation data from the ChatGPT web interface,
 * extracts message content, calculates token usage, energy consumption,
 * and CO2 emissions. It persists data to Chrome storage for the popup UI.
 *
 * Note: energy-calculator.js is loaded before this file via manifest.json
 * The calculateEnergyAndEmissions() function is available in global scope.
 */

// In-memory storage for conversation logs
const logs = [];
let conversationId = null;
let isExtensionContextValid = true; // Track if extension context is still valid
let intervalIds = []; // Track all intervals to clear them if context is invalidated

/**
 * Checks if the extension context is still valid
 * @returns {boolean} True if context is valid, false otherwise
 */
function checkExtensionContext() {
  try {
    // Try to access a simple Chrome API property
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return true;
    }
  } catch (e) {
    console.warn('Extension context check failed:', e.message);
  }
  return false;
}

/**
 * Gets the current estimation method from storage
 * @returns {Promise<string>} 'community' or 'altman'
 */
function getEstimationMethod() {
  return new Promise((resolve) => {
    if (!checkExtensionContext()) {
      console.log('Content script: No extension context, defaulting to community');
      resolve('community'); // Default to community estimates
      return;
    }
    
    try {
      chrome.storage.local.get(['estimationMethod'], function(result) {
        if (chrome.runtime.lastError) {
          console.error('Content script: Error getting estimation method:', chrome.runtime.lastError);
          resolve('community');
        } else {
          const method = result.estimationMethod || 'community';
          console.log('Content script: Loaded estimation method from storage:', method);
          resolve(method);
        }
      });
    } catch (error) {
      console.error('Content script: Error accessing storage for estimation method:', error);
      resolve('community');
    }
  });
}

/**
 * Saves data to Chrome's local storage
 * Handles extension context invalidation gracefully
 * @param {Object} data - Data object to store
 */
function saveToStorage(data) {
  try {
    // Check if extension context is still valid
    if (!isExtensionContextValid || !checkExtensionContext()) {
      console.warn('Extension context invalidated, skipping storage save');
      return;
    }
    
    // Check if Chrome API is still available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, function() {
        // Check for runtime error
        if (chrome.runtime.lastError) {
          console.error("Chrome storage error:", chrome.runtime.lastError);
          // If context is invalidated, we'll retry once after a delay
          if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
            console.warn('Extension context has been invalidated');
            isExtensionContextValid = false;
            // Clear all intervals to prevent further errors
            intervalIds.forEach(id => clearInterval(id));
            intervalIds = [];
          }
        }
      });
    } else {
      console.warn("Chrome storage API not available");
    }
  } catch (e) {
    console.error("Storage error:", e);
    // Don't throw further, just log and continue
  }
}

/**
 * Saves or updates a conversation exchange
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - ChatGPT's response
 */
async function saveLog(userMessage, assistantResponse) {
  // Use message prefix as unique identifier for this exchange
  const userMessageKey = userMessage.substring(0, 100);
  
  // Estimate token count (4 chars ≈ 1 token for English text)
  const userTokenCount = Math.ceil(userMessage.length / 4);
  const assistantTokenCount = Math.ceil(assistantResponse.length / 4);
  
  // Get the current estimation method and calculate environmental impact
  const estimationMethod = await getEstimationMethod();
  const energyData = calculateEnergyAndEmissions(assistantTokenCount, estimationMethod);
  const energyUsage = energyData.totalEnergy;
  const co2Emissions = energyData.co2Emissions;
  
  // Check if we already have a log with this user message
  const existingLogIndex = logs.findIndex(log => 
    log.userMessage.substring(0, 100) === userMessageKey
  );
  
  let shouldUpdateNotification = false;
  
  if (existingLogIndex !== -1) {
    // Update existing log if new response is more complete
    const existingLog = logs[existingLogIndex];
    
    if (assistantResponse.length > existingLog.assistantResponse.length || 
        (assistantResponse.length > 0 && existingLog.assistantResponse.length === 0)) {
      
      // Update with more complete response
      logs[existingLogIndex] = {
        ...existingLog,
        assistantResponse: assistantResponse,
        assistantTokenCount: assistantTokenCount,
        energyUsage: energyData.totalEnergy,
        co2Emissions: energyData.co2Emissions,
        lastUpdated: Date.now()
      };
      
      saveToStorage({ chatgptLogs: logs });
      shouldUpdateNotification = true;
    }
  } else {
    // Create new log entry
    const logEntry = {
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      url: window.location.href,
      conversationId: conversationId,
      userMessage: userMessage,
      assistantResponse: assistantResponse,
      userTokenCount: userTokenCount,
      assistantTokenCount: assistantTokenCount,
      energyUsage: energyUsage,
      co2Emissions: co2Emissions
    };
    
    logs.push(logEntry);
    saveToStorage({ chatgptLogs: logs });
    shouldUpdateNotification = true;
  }
  
  // Always update the notification when logs change
  // Create the notification if it doesn't exist yet
  if (!document.getElementById('ai-impact-notification')) {
    createUsageNotification();
  } else {
    updateUsageNotification();
  }
}

/**
 * Scans the DOM for ChatGPT conversation messages
 * Uses data attributes specific to ChatGPT's DOM structure
 * Includes error handling to prevent extension crashes
 */
async function scanMessages() {
  // Skip if extension context is invalidated
  if (!isExtensionContextValid) {
    return false;
  }
  
  try {
    // Find all user and assistant messages by their data attributes
    const userMessages = [...document.querySelectorAll('[data-message-author-role="user"]')];
    const assistantMessages = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
    
    // Attempt alternative selectors if the primary ones didn't find anything
    let foundMessages = userMessages.length > 0 && assistantMessages.length > 0;
    
    // If we didn't find any messages with the primary selectors, try alternative ones
    if (!foundMessages) {
      // Try some alternative selectors that might match different versions of ChatGPT
      const alternativeUserSelectors = [
        '.markdown p', // Look for paragraph text in markdown areas
        '[data-role="user"]', 
        '.user-message',
        '[data-testid="user-message"]',
        '.text-message-content'
      ];
      
      const alternativeAssistantSelectors = [
        '.markdown p',
        '[data-role="assistant"]',
        '.assistant-message', 
        '[data-testid="assistant-message"]',
        '.assistant-response'
      ];
      
      // Try each alternative selector
      for (const userSelector of alternativeUserSelectors) {
        const altUserMessages = document.querySelectorAll(userSelector);
        if (altUserMessages.length > 0) {
          for (const assistantSelector of alternativeAssistantSelectors) {
            const altAssistantMessages = document.querySelectorAll(assistantSelector);
            if (altAssistantMessages.length > 0) {
              console.log(`Found alternative selectors: ${userSelector} (${altUserMessages.length}) and ${assistantSelector} (${altAssistantMessages.length})`);
              
              // Try to process these alternative messages
              for (let i = 0; i < Math.min(altUserMessages.length, altAssistantMessages.length); i++) {
                try {
                  const userMessage = altUserMessages[i].textContent.trim();
                  const assistantResponse = altAssistantMessages[i].textContent.trim();
                  
                  if (userMessage && assistantResponse) {
                    // Save any non-empty exchange
                    await saveLog(userMessage, assistantResponse);
                    foundMessages = true;
                  }
                } catch (altMessageError) {
                  console.error("Error processing alternative message pair:", altMessageError);
                }
              }
              
              // If we found messages with this selector pair, stop trying others
              if (foundMessages) break;
            }
          }
          // If we found messages with any assistant selector, stop trying other user selectors
          if (foundMessages) break;
        }
      }
    }
    
    // Log the results of the scan for debugging
    if (userMessages.length > 0 || assistantMessages.length > 0) {
      console.log(`Found ${userMessages.length} user messages and ${assistantMessages.length} assistant messages`);
    }
    
    // Process message pairs in order
    for (let i = 0; i < userMessages.length; i++) {
      if (i < assistantMessages.length) {
        try {
          const userMessage = userMessages[i].textContent.trim();
          const assistantResponse = assistantMessages[i].textContent.trim();
          
          if (userMessage) {
            // Save any non-empty exchange
            await saveLog(userMessage, assistantResponse);
          }
        } catch (messageError) {
          console.error("Error processing message pair:", messageError);
          // Continue with next message pair
        }
      }
    }
    
    return foundMessages;
  } catch (e) {
    console.error("Error scanning messages:", e);
    return false;
  }
}

/**
 * Intercepts fetch requests to extract conversation information
 * Uses a fetch proxy pattern to capture API responses without affecting functionality
 */
function setupFetchInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(resource, init) {
    const url = resource instanceof Request ? resource.url : resource;
    
    // Call original fetch
    const response = await originalFetch.apply(this, arguments);
    
    // Process conversation API responses
    if (typeof url === 'string' && url.includes('conversation')) {
      try {
        // Extract conversation ID from URL
        const match = url.match(/\/c\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          conversationId = match[1];
        }
        
        // Process server-sent events streams
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          const clonedResponse = response.clone();
          
          (async () => {
            try {
              const reader = clonedResponse.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let lastUpdateTime = 0;
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Process stream data
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Extract conversation ID
                const convoMatch = buffer.match(/"conversation_id":\s*"([^"]+)"/);
                if (convoMatch && convoMatch[1]) {
                  conversationId = convoMatch[1];
                }
                
                // Check for content updates during streaming
                const now = Date.now();
                if (now - lastUpdateTime > 500) { // Update every 500ms max
                  lastUpdateTime = now;
                  
                  // Quick scan for updates during active generation
                  await scanMessages();
                  
                  // Update notification with latest data
                  updateUsageNotification();
                }
                
                // Limit buffer size
                if (buffer.length > 100000) {
                  buffer = buffer.substring(buffer.length - 50000);
                }
              }
              
              // Scan after stream completes
              setTimeout(async () => {
                await scanMessages();
                updateUsageNotification();
              }, 1000);
            } catch {
              // Ignore stream processing errors
            }
          })();
        }
      } catch {
        // Ignore general interception errors
      }
    }
    
    return response;
  };
}

/**
 * Sets up a MutationObserver to detect when new messages are added to the DOM
 * Efficiently triggers scans only when relevant content changes
 */
function setupObserver() {
  // Track the time of the last update to avoid excessive updates
  let lastUpdateTime = 0;
  
  const observer = new MutationObserver(async (mutations) => {
    let shouldScan = false;
    
    // Check if any assistant messages were added or modified
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && 
              (node.getAttribute('data-message-author-role') === 'assistant' || 
               node.querySelector('[data-message-author-role="assistant"]'))) {
            shouldScan = true;
            break;
          }
        }
      } else if (mutation.type === 'characterData') {
        // Text content changed inside an element
        // This can catch typing updates on the assistant's responses
        shouldScan = true;
      }
      
      if (shouldScan) break;
    }
    
    // Scan on relevant changes
    if (shouldScan) {
      const now = Date.now();
      
      // Throttle updates to avoid excessive processing
      // Update at most every 300ms during active typing/generation
      if (now - lastUpdateTime > 300) {
        lastUpdateTime = now;
        
        // Scan for new/updated content
        await scanMessages();
        
        // Update the notification with latest data
        updateUsageNotification();
      }
      
      // Also do delayed scans to catch fully completed responses
      setTimeout(async () => {
        await scanMessages();
        updateUsageNotification();
      }, 1000);
    }
  });
  
  // Observe the entire document for changes, including text changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

/**
 * Creates and inserts the usage notification element into the ChatGPT UI
 */
function createUsageNotification() {
  // Check if notification already exists
  if (document.getElementById('ai-impact-notification')) {
    return;
  }
  
  // Create the notification element
  const notification = document.createElement('div');
  notification.id = 'ai-impact-notification';
  notification.className = 'ai-impact-notification';
  
  // Create the styles for the notification
  const styles = document.createElement('style');
  styles.textContent = `
    .ai-impact-notification {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: white;
      color: #333;
      padding: 4px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: box-shadow 0.2s ease;
      cursor: pointer;
      line-height: 1.2;
      text-align: center;
      width: auto;
      min-width: auto;
      max-width: auto;
      height: auto;
      user-select: none;
    }

    .ai-impact-notification:hover {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    }

    .ai-impact-notification:active {
      transform: translateX(-50%) scale(0.98);
    }
    
    .ai-impact-content {
      text-align: center;
      white-space: nowrap;
      overflow: visible;
    }
    
    .ai-impact-message {
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ai-impact-energy {
      font-weight: 500;
      display: inline;
      margin-left: 4px;
    }
    
    .ai-impact-emoji {
      margin: 0 4px 0 0;
      color: #3E7B67;
    }
    
    /* Make the notification adapt to the dark mode of ChatGPT */
    .dark .ai-impact-notification {
      background-color: #343541;
      color: #ECECF1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .ai-impact-notification {
        font-size: 11px;
        padding: 3px 10px;
      }
    }
    
    @media (max-width: 480px) {
      .ai-impact-notification {
        font-size: 10px;
        padding: 3px 8px;
      }
    }
  `;
  
  // Default basic message (will be updated by updateUsageNotification)
  let message = "AI models have an environmental impact";
  
  // Initially populate with basic message
  notification.innerHTML = `
    <div class="ai-impact-content">
      <div id="ai-impact-message" class="ai-impact-message">${message}</div>
    </div>
  `;

  // Add click event listener to open extension popup
  notification.addEventListener('click', () => {
    // Try to open the extension popup programmatically
    try {
      chrome.runtime.sendMessage({ action: "openPopup" });
    } catch (e) {
      console.error("Failed to open popup:", e);
    }
  });
  
  // Add the styles to the head with error handling
  try {
    if (document.head) {
      document.head.appendChild(styles);
    } else {
      console.warn("Document head not available for styles - will retry");
      // If head is not available yet, we'll try again later
      setTimeout(() => {
        if (document.head) {
          document.head.appendChild(styles);
        }
      }, 500);
    }
  } catch (e) {
    console.error("Error appending styles:", e);
  }
  
  // Insert notification directly to body for stability
  // Using body ensures it persists across ChatGPT's page navigation
  try {
    if (document.body) {
      document.body.appendChild(notification);
    } else {
      console.warn("Document body not available for notification insertion");
    }
  } catch (e) {
    console.error("Error inserting notification:", e);
  }

  // Set up MutationObserver to detect if notification gets removed
  // This handles cases where ChatGPT's navigation removes DOM elements
  const notificationObserver = new MutationObserver((mutations) => {
    // Check if our notification still exists
    if (!document.getElementById('ai-impact-notification')) {
      console.log('Notification was removed, recreating...');
      // Wait a moment for DOM to stabilize, then recreate
      setTimeout(() => {
        if (!document.getElementById('ai-impact-notification')) {
          createUsageNotification();
        }
      }, 100);
    }
  });

  // Observe body for child removals
  if (document.body) {
    notificationObserver.observe(document.body, {
      childList: true,
      subtree: false
    });
  }

  console.log("AI Impact notification added to page");

  // Initial update
  updateUsageNotification();
}

/**
 * Updates the notification with the current user's usage level
 */
function updateUsageNotification() {
  try {
    const messageElement = document.getElementById('ai-impact-message');
    
    if (!messageElement) {
      // Element not found, which could be normal if notification isn't created yet
      return;
    }
    
    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter logs for today only - with error handling
    let todayLogs = [];
    let todayEnergyUsage = 0;
    let todayMessages = 0;
    
    try {
      // Safely filter logs
      if (Array.isArray(logs)) {
        todayLogs = logs.filter(log => {
          try {
            // Handle potentially invalid log entries
            return log && log.timestamp && new Date(log.timestamp) >= today;
          } catch (dateError) {
            // Skip this log entry if date parsing fails
            return false;
          }
        });
        
        todayMessages = todayLogs.length;
        
        // Safely calculate energy
        todayLogs.forEach(log => {
          try {
            todayEnergyUsage += log.energyUsage || 0;
          } catch (energyError) {
            // Skip this log if energy calculation fails
          }
        });
      }
    } catch (logsError) {
      console.error("Error processing logs for notification:", logsError);
      // Continue with defaults (zeros) if logs processing fails
    }
    
    // Format energy usage for display (1 decimal place)
    const formattedEnergy = todayEnergyUsage.toFixed(1);
    
    // Add a timestamp for debugging
    const updateTime = new Date().toLocaleTimeString();
    
    // One-line message with energy usage information
    let message = `<span class="ai-impact-emoji">⚡️</span> <span class="ai-impact-energy">${formattedEnergy} Wh consumed today</span>`;
    
    // Log for debugging how frequently updates occur
    console.log(`[${updateTime}] Updating energy notification: ${formattedEnergy} Wh`);
    
    // Update the UI with error handling
    try {
      messageElement.innerHTML = message;
    } catch (updateError) {
      console.error("Error updating notification message:", updateError);
    }
  } catch (error) {
    console.error("Error in updateUsageNotification:", error);
  }
}

/**
 * Initializes the extension functionality
 */
function initialize() {
  // Load existing logs from storage with improved error handling and retry
  initializeWithRetry(3);
  
  // Setup periodic storage validation to fix potential issues
  setInterval(validateAndRepairStorage, 5 * 60 * 1000); // Every 5 minutes
  
  // Setup when DOM is ready
  const setupUI = async () => {
    setupFetchInterceptor();
    setupObserver();
    await scanMessages(); // Initial scan
    
    // Create notification if not created yet
    if (!document.getElementById('ai-impact-notification')) {
      createUsageNotification();
    }
  };
  
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(setupUI, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(setupUI, 1000);
    });
  }
  
  // Monitor URL changes to detect new conversations
  let lastUrl = window.location.href;
  const urlMonitorInterval = setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      // Extract conversation ID from URL
      try {
        const match = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          conversationId = match[1];
        }
      } catch {
        // Ignore URL parsing errors
      }
      
      // Scan after URL change
      setTimeout(async () => await scanMessages(), 1000);
    }
  }, 1000);
  intervalIds.push(urlMonitorInterval);
  
  // Setup periodic notification updates (every 2 minutes)
  // This ensures the notification reflects current usage even if the user
  // has the page open for a long time
  setInterval(() => {
    if (document.getElementById('ai-impact-notification')) {
      updateUsageNotification();
    } else {
      // In case the notification has been removed from the DOM for some reason
      createUsageNotification();
    }
  }, 2 * 60 * 1000); // 2 minutes in milliseconds
}


/**
 * Reloads logs from Chrome storage to sync with popup changes
 */
function reloadLogsFromStorage() {
  return new Promise((resolve) => {
    if (!checkExtensionContext()) {
      resolve();
      return;
    }
    
    try {
      chrome.storage.local.get(['chatgptLogs'], function(result) {
        if (chrome.runtime.lastError) {
          console.error('Error reloading logs from storage:', chrome.runtime.lastError);
          resolve();
        } else {
          const storedLogs = result.chatgptLogs || [];
          // Update the in-memory logs array with the recalculated values
          logs.length = 0; // Clear existing logs
          logs.push(...storedLogs); // Add the updated logs
          console.log(`Reloaded ${logs.length} logs from storage`);
          resolve();
        }
      });
    } catch (error) {
      console.error('Error accessing storage for log reload:', error);
      resolve();
    }
  });
}

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateNotification") {
    if (message.enabled) {
      // Show the notification if it doesn't exist
      if (!document.getElementById('ai-impact-notification')) {
        createUsageNotification();
      }
    } else {
      // Hide the notification if it exists
      const notification = document.getElementById('ai-impact-notification');
      if (notification) {
        notification.parentNode.removeChild(notification);
      }
    }
    return true;
  } else if (message.type === 'estimationMethodChanged') {
    // Acknowledge the change and reload logs from storage after a brief delay
    console.log('Content script: Estimation method changed to:', message.method);
    
    // Wait a moment to ensure popup has finished saving, then reload
    setTimeout(() => {
      reloadLogsFromStorage().then(() => {
        // Update the notification with the new calculations
        updateUsageNotification();
        console.log('Content script: Notification updated with new estimation method');
      });
    }, 100);
    
    sendResponse({ success: true });
    return true;
  }
});
  } catch (e) {
    console.warn('Failed to add message listener:', e);
  }
}


/**
 * Calculates energy usage and CO2 emissions based on selected methodology
 *
 * NOTE: This function is now imported from energy-calculator.js (shared module)
 * The implementation is in energy-calculator.js to eliminate code duplication
 * See: energy-calculator.js for the complete implementation
 *
 * This implements either:
 * 1. EcoLogits methodology (community estimates) from https://ecologits.ai/0.2/methodology/llm_inference/
 * 2. Sam Altman's estimation (0.34 Wh per query, scaled by tokens)
 *
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @param {string} method - 'community' or 'altman'
 * @returns {Object} Energy usage and emissions data
 *
 * The function is imported at the top of this file and used directly.
 */
// calculateEnergyAndEmissions is now imported from energy-calculator.js

/**
 * Validates and repairs storage if needed
 * This helps recover from corrupted/missing data
 */
function validateAndRepairStorage() {
  // Check if extension context is still valid
  if (!isExtensionContextValid || !checkExtensionContext()) {
    console.log('Extension context invalidated, skipping storage validation');
    return;
  }
  
  console.log("Running storage validation check...");
  
  try {
    chrome.storage.local.get(['chatgptLogs', 'extensionVersion'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error checking storage:", chrome.runtime.lastError);
      return;
    }
    
    let needsRepair = false;
    
    // Check if logs exists and is an array
    if (!result.chatgptLogs || !Array.isArray(result.chatgptLogs)) {
      console.warn("Invalid logs format in storage, needs repair");
      needsRepair = true;
    }
    
    // Check if version is missing
    if (!result.extensionVersion) {
      console.warn("Missing extension version in storage, will repair");
      needsRepair = true;
    }
    
    if (needsRepair) {
      // Use in-memory logs if they exist and are valid
      if (logs && Array.isArray(logs) && logs.length > 0) {
        console.log("Repairing storage with in-memory logs");
        chrome.storage.local.set({ 
          chatgptLogs: logs,
          extensionVersion: chrome.runtime.getManifest().version
        });
      } else {
        // Otherwise initialize fresh (last resort)
        console.log("Initializing fresh logs in storage");
        chrome.storage.local.set({ 
          chatgptLogs: [],
          extensionVersion: chrome.runtime.getManifest().version
        });
      }
    } else {
      // Log storage is healthy
      console.log("Storage validation passed - data is healthy");
    }
  });
  } catch (e) {
    console.error('Error accessing Chrome storage:', e);
    if (e.message && e.message.includes('Extension context invalidated')) {
      isExtensionContextValid = false;
      // Clear all intervals
      intervalIds.forEach(id => clearInterval(id));
      intervalIds = [];
    }
  }
}

/**
 * Improved initialization with retry mechanism
 * @param {number} retryCount - Number of retries left
 */
function initializeWithRetry(retryCount = 3) {
  console.log(`Initializing with ${retryCount} retries remaining`);
  try {
    chrome.storage.local.get(['chatgptLogs', 'extensionVersion'], (result) => {
      // Check for runtime error
      if (chrome.runtime.lastError) {
        console.error("Error loading logs:", chrome.runtime.lastError);
        
        // Check if it's a context invalidation error
        if (chrome.runtime.lastError.message && 
            chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated during initialization');
          isExtensionContextValid = false;
          // Clear all intervals
          intervalIds.forEach(id => clearInterval(id));
          intervalIds = [];
          return; // Don't retry if context is invalidated
        }
        
        if (retryCount > 0) {
          console.log(`Retrying in 1 second (${retryCount} attempts left)...`);
          setTimeout(() => initializeWithRetry(retryCount - 1), 1000);
          return;
        }
      }
      
      // Store extension version for reference
      const currentVersion = chrome.runtime.getManifest().version;
      const storedVersion = result.extensionVersion || '0.0';
      console.log(`Extension version: Current=${currentVersion}, Stored=${storedVersion}`);
      
      // Load logs with validation
      if (result && result.chatgptLogs && Array.isArray(result.chatgptLogs)) {
        try {
          // Clear any potential stale data
          logs.length = 0;
          logs.push(...result.chatgptLogs);
          console.log(`Loaded ${result.chatgptLogs.length} conversation logs`);
        } catch (arrayError) {
          console.error("Error adding logs to array:", arrayError);
          logs.length = 0;
        }
      } else {
        console.log("No existing logs found or invalid format, starting fresh");
        logs.length = 0;
      }
      
      // Create notification after logs are loaded
      setTimeout(createUsageNotification, 500);
    });
  } catch (e) {
    console.error("Critical initialization error:", e);
    
    // Check if it's a context invalidation error
    if (e.message && e.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated during initialization');
      isExtensionContextValid = false;
      // Clear all intervals
      intervalIds.forEach(id => clearInterval(id));
      intervalIds = [];
      return; // Don't continue if context is invalidated
    }
    
    if (retryCount > 0) {
      console.log(`Retrying in 1 second (${retryCount} attempts left)...`);
      setTimeout(() => initializeWithRetry(retryCount - 1), 1000);
    } else {
      // Last resort fallback
      logs.length = 0;
      setTimeout(createUsageNotification, 500);
    }
  }
}

// Handle page unload to clean up
window.addEventListener('beforeunload', () => {
  // Clear all intervals
  intervalIds.forEach(id => clearInterval(id));
  intervalIds = [];
});

// Start the extension
initialize();