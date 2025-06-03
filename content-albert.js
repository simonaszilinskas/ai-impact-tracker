/**
 * AI Impact Tracker - Albert Content Script
 * =====================================
 * This script captures conversation data from the Albert (albert.numerique.gouv.fr) web interface,
 * extracts message content, calculates token usage, energy consumption,
 * and CO2 emissions. It persists data to Chrome storage for the popup UI.
 */

// In-memory storage for conversation logs
const logs = [];
let conversationId = null;
let isExtensionContextValid = true;
let intervalIds = [];
let currentModel = 'small'; // Default to small model, will be updated based on UI

// Constants for EcoLogits methodology
// Albert Small model (based on Llama-like architecture)
const ALBERT_SMALL_PARAMS = 8e9; // 8B parameters
// Albert Large model (based on larger Llama variant)
const ALBERT_LARGE_PARAMS = 70e9; // 70B parameters

const ENERGY_ALPHA = 8.91e-5;  // Energy coefficient for model parameters (Wh/token/B-params)
const ENERGY_BETA = 1.43e-3;   // Base energy per token (Wh/token)
const LATENCY_ALPHA = 8.02e-4; // Latency coefficient for model parameters (s/token/B-params)
const LATENCY_BETA = 2.23e-2;  // Base latency per token (s/token)
const PUE = 1.2;               // Power Usage Effectiveness for modern data centers
const GPU_MEMORY = 80;         // A100 GPU memory in GB
const SERVER_POWER_WITHOUT_GPU = 1; // Server power excluding GPUs (kW)
const INSTALLED_GPUS = 8;      // Typical GPUs per server
const GPU_BITS = 4;            // Quantization level in bits
const FRANCE_EMISSION_FACTOR = 0.056; // French electricity emission factor (kgCO2eq/kWh)

/**
 * Checks if the extension context is still valid
 * @returns {boolean} True if context is valid, false otherwise
 */
function checkExtensionContext() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return true;
    }
  } catch (e) {
    console.warn('Extension context check failed:', e.message);
  }
  return false;
}

/**
 * Saves data to Chrome's local storage
 * @param {Object} data - Data object to store
 */
function saveToStorage(data) {
  try {
    if (!isExtensionContextValid || !checkExtensionContext()) {
      console.warn('Extension context invalidated, skipping storage save');
      return;
    }
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, function() {
        if (chrome.runtime.lastError) {
          console.error("Chrome storage error:", chrome.runtime.lastError);
          if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
            console.warn('Extension context has been invalidated');
            isExtensionContextValid = false;
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
  }
}

/**
 * Detects which model is currently selected (small or large)
 * @returns {string} 'small' or 'large'
 */
function detectCurrentModel() {
  // Look for the model selector button or indicator
  const modelSelector = document.querySelector('#model-selector-0-button');
  if (modelSelector) {
    const modelText = modelSelector.textContent.toLowerCase();
    if (modelText.includes('complexe') || modelText.includes('large')) {
      return 'large';
    }
  }
  
  // Also check for any model indicators in the UI
  const modelIndicators = document.querySelectorAll('[data-model], .model-indicator');
  for (const indicator of modelIndicators) {
    const text = indicator.textContent.toLowerCase();
    if (text.includes('complexe') || text.includes('large')) {
      return 'large';
    }
  }
  
  return 'small'; // Default to small model
}

/**
 * Saves or updates a conversation exchange (for backward compatibility)
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - Albert's response
 */
function saveLog(userMessage, assistantResponse) {
  // Estimate token count if not provided
  const userTokenCount = Math.ceil(userMessage.length / 4);
  const assistantTokenCount = Math.ceil(assistantResponse.length / 4);
  
  saveLogWithTokens(userMessage, assistantResponse, userTokenCount, assistantTokenCount);
}

/**
 * Extracts token information from info button aria-label
 * @param {Element} container - The message container element
 * @returns {Object} Token counts
 */
function extractTokenInfo(container) {
  try {
    // Look for the info button with token information
    const infoButton = container.querySelector('[aria-label*="prompt_tokens"]');
    if (infoButton) {
      const ariaLabel = infoButton.getAttribute('aria-label');
      const promptMatch = ariaLabel.match(/prompt_tokens:\s*(\d+)/);
      const completionMatch = ariaLabel.match(/completion_tokens:\s*(\d+)/);
      const totalMatch = ariaLabel.match(/total_tokens:\s*(\d+)/);
      
      return {
        promptTokens: promptMatch ? parseInt(promptMatch[1]) : 0,
        completionTokens: completionMatch ? parseInt(completionMatch[1]) : 0,
        totalTokens: totalMatch ? parseInt(totalMatch[1]) : 0
      };
    }
  } catch (e) {
    console.error("Error extracting token info:", e);
  }
  
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

/**
 * Scans the DOM for Albert conversation messages
 */
function scanMessages() {
  if (!isExtensionContextValid) {
    return false;
  }
  
  try {
    // Look for user messages with class 'user-message'
    const userMessageElements = document.querySelectorAll('.user-message');
    
    // Look for assistant messages with class 'chat-assistant'
    const assistantContainers = document.querySelectorAll('.chat-assistant');
    
    console.log(`Found ${userMessageElements.length} user messages and ${assistantContainers.length} assistant messages`);
    
    let processedPairs = 0;
    
    // Process each user message
    userMessageElements.forEach((userElement, index) => {
      try {
        // Get user message text
        const userTextElement = userElement.querySelector('.rounded-3xl p');
        const userMessage = userTextElement ? userTextElement.textContent.trim() : '';
        
        if (!userMessage) return;
        
        // Find the corresponding assistant message
        // Look for the next assistant message after this user message
        const userContainer = userElement.closest('.flex.flex-col.justify-between');
        let assistantContainer = userContainer ? userContainer.nextElementSibling : null;
        
        // Keep looking until we find an assistant message
        while (assistantContainer && !assistantContainer.querySelector('.chat-assistant')) {
          assistantContainer = assistantContainer.nextElementSibling;
        }
        
        if (assistantContainer) {
          const assistantTextElement = assistantContainer.querySelector('#response-content-container p');
          const assistantResponse = assistantTextElement ? assistantTextElement.textContent.trim() : '';
          
          if (assistantResponse) {
            // Extract token information from the info button
            const tokenInfo = extractTokenInfo(assistantContainer);
            
            // Use actual token counts if available, otherwise estimate
            const userTokenCount = tokenInfo.promptTokens > 0 ? tokenInfo.promptTokens : Math.ceil(userMessage.length / 4);
            const assistantTokenCount = tokenInfo.completionTokens > 0 ? tokenInfo.completionTokens : Math.ceil(assistantResponse.length / 4);
            
            console.log(`Processing message pair ${index + 1}: User tokens=${userTokenCount}, Assistant tokens=${assistantTokenCount}`);
            
            // Save the log with actual token counts
            saveLogWithTokens(userMessage, assistantResponse, userTokenCount, assistantTokenCount);
            processedPairs++;
          }
        }
      } catch (messageError) {
        console.error("Error processing message pair:", messageError);
      }
    });
    
    console.log(`Processed ${processedPairs} message pairs`);
    return processedPairs > 0;
  } catch (e) {
    console.error("Error scanning messages:", e);
    return false;
  }
}

/**
 * Saves or updates a conversation exchange with specific token counts
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - Albert's response
 * @param {number} userTokenCount - Actual user token count
 * @param {number} assistantTokenCount - Actual assistant token count
 */
function saveLogWithTokens(userMessage, assistantResponse, userTokenCount, assistantTokenCount) {
  const userMessageKey = userMessage.substring(0, 100);
  
  // Detect current model
  currentModel = detectCurrentModel();
  
  // Calculate environmental impact using actual token counts
  const energyData = calculateEnergyAndEmissions(assistantTokenCount, currentModel);
  const energyUsage = energyData.totalEnergy;
  const co2Emissions = energyData.co2Emissions;
  
  // Check if we already have a log with this user message
  const existingLogIndex = logs.findIndex(log => 
    log.userMessage.substring(0, 100) === userMessageKey
  );
  
  if (existingLogIndex !== -1) {
    const existingLog = logs[existingLogIndex];
    
    if (assistantResponse.length > existingLog.assistantResponse.length || 
        (assistantResponse.length > 0 && existingLog.assistantResponse.length === 0)) {
      
      logs[existingLogIndex] = {
        ...existingLog,
        assistantResponse: assistantResponse,
        assistantTokenCount: assistantTokenCount,
        userTokenCount: userTokenCount,
        energyUsage: energyData.totalEnergy,
        co2Emissions: energyData.co2Emissions,
        model: currentModel,
        lastUpdated: Date.now()
      };
      
      saveToStorage({ albertLogs: logs });
    }
  } else {
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
      co2Emissions: co2Emissions,
      model: currentModel,
      platform: 'albert'
    };
    
    logs.push(logEntry);
    saveToStorage({ albertLogs: logs });
  }
  
  if (!document.getElementById('ai-impact-notification')) {
    createUsageNotification();
  } else {
    updateUsageNotification();
  }
}

/**
 * Sets up a MutationObserver to detect when new messages are added to the DOM
 */
function setupObserver() {
  let lastUpdateTime = 0;
  
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a message-related element or contains relevant classes
            const nodeString = node.outerHTML || '';
            if (node.classList && (
                node.classList.contains('user-message') ||
                node.classList.contains('chat-assistant') ||
                node.classList.contains('markdown-prose') ||
                node.querySelector('.user-message') ||
                node.querySelector('.chat-assistant') ||
                nodeString.includes('response-content-container')
            )) {
              shouldScan = true;
              break;
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        // Check if the text change is within a message container
        const targetElement = mutation.target.parentElement;
        if (targetElement && (
            targetElement.closest('.chat-assistant') ||
            targetElement.closest('.user-message')
        )) {
          shouldScan = true;
        }
      }
      
      if (shouldScan) break;
    }
    
    if (shouldScan) {
      const now = Date.now();
      
      if (now - lastUpdateTime > 300) {
        lastUpdateTime = now;
        scanMessages();
        updateUsageNotification();
      }
      
      // Also do a delayed scan to catch completed responses and token info
      setTimeout(() => {
        scanMessages();
        updateUsageNotification();
      }, 1500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

/**
 * Creates and inserts the usage notification element
 */
function createUsageNotification() {
  if (document.getElementById('ai-impact-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'ai-impact-notification';
  notification.className = 'ai-impact-notification';
  
  const styles = document.createElement('style');
  styles.textContent = `
    .ai-impact-notification {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      touch-action: none;
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
      transition: all 0.3s ease;
      cursor: move;
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
    
    .ai-impact-model {
      font-size: 10px;
      color: #666;
      margin-left: 8px;
      padding-left: 8px;
      border-left: 1px solid #ddd;
    }
    
    /* Dark mode support */
    html[theme="dark"] .ai-impact-notification {
      background-color: #343541;
      color: #ECECF1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    
    html[theme="dark"] .ai-impact-model {
      color: #999;
      border-left-color: #555;
    }
    
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
  
  notification.innerHTML = `
    <div class="ai-impact-content">
      <div id="ai-impact-message" class="ai-impact-message">AI models have an environmental impact</div>
    </div>
  `;
  
  // Make the notification draggable
  let isDragging = false;
  let offsetX, offsetY;
  
  notification.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', endDrag);
  
  notification.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    e.clientX = touch.clientX;
    e.clientY = touch.clientY;
    startDrag(e);
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    e.clientX = touch.clientX;
    e.clientY = touch.clientY;
    moveDrag(e);
  });
  
  document.addEventListener('touchend', endDrag);
  
  function startDrag(e) {
    isDragging = true;
    const rect = notification.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    notification.style.cursor = 'grabbing';
    e.preventDefault();
  }
  
  function moveDrag(e) {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    const notifWidth = notification.offsetWidth;
    const notifHeight = notification.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const boundedX = Math.max(0, Math.min(x, windowWidth - notifWidth));
    const boundedY = Math.max(0, Math.min(y, windowHeight - notifHeight));
    notification.style.left = boundedX + 'px';
    notification.style.top = boundedY + 'px';
    notification.style.transform = 'none';
    e.preventDefault();
  }
  
  function endDrag() {
    if (isDragging) {
      isDragging = false;
      notification.style.cursor = 'move';
      
      try {
        const rect = notification.getBoundingClientRect();
        const position = {
          x: rect.left,
          y: rect.top
        };
        localStorage.setItem('aiImpactNotificationPositionAlbert', JSON.stringify(position));
      } catch (e) {
        console.error("Error saving notification position:", e);
      }
    }
  }
  
  notification.addEventListener('dblclick', () => {
    try {
      chrome.runtime.sendMessage({ action: "openPopup" });
    } catch (e) {
      console.error("Failed to open popup:", e);
    }
  });
  
  try {
    if (document.head) {
      document.head.appendChild(styles);
    } else {
      setTimeout(() => {
        if (document.head) {
          document.head.appendChild(styles);
        }
      }, 500);
    }
  } catch (e) {
    console.error("Error appending styles:", e);
  }
  
  try {
    if (document.body) {
      document.body.appendChild(notification);
    }
  } catch (e) {
    console.error("Error inserting notification:", e);
  }
  
  try {
    const savedPosition = localStorage.getItem('aiImpactNotificationPositionAlbert');
    if (savedPosition) {
      const position = JSON.parse(savedPosition);
      notification.style.left = position.x + 'px';
      notification.style.top = position.y + 'px';
      notification.style.transform = 'none';
    }
  } catch (e) {
    console.error("Error restoring notification position:", e);
  }
  
  console.log("AI Impact notification added to Albert page");
  updateUsageNotification();
}

/**
 * Updates the notification with the current user's usage level
 */
function updateUsageNotification() {
  try {
    const messageElement = document.getElementById('ai-impact-message');
    
    if (!messageElement) {
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayLogs = [];
    let todayEnergyUsage = 0;
    let todayMessages = 0;
    
    try {
      if (Array.isArray(logs)) {
        todayLogs = logs.filter(log => {
          try {
            return log && log.timestamp && new Date(log.timestamp) >= today;
          } catch (dateError) {
            return false;
          }
        });
        
        todayMessages = todayLogs.length;
        
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
    }
    
    const formattedEnergy = todayEnergyUsage.toFixed(1);
    const modelName = currentModel === 'large' ? 'Large' : 'Small';
    
    let message = `<span class="ai-impact-emoji">⚡️</span> <span class="ai-impact-energy">${formattedEnergy} Wh consumed today</span><span class="ai-impact-model">Albert ${modelName}</span>`;
    
    const updateTime = new Date().toLocaleTimeString();
    console.log(`[${updateTime}] Updating Albert energy notification: ${formattedEnergy} Wh (${modelName} model)`);
    
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
 * Calculates energy usage and CO2 emissions for Albert models
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @param {string} model - 'small' or 'large'
 * @returns {Object} Energy usage and emissions data
 */
function calculateEnergyAndEmissions(outputTokens, model = 'small') {
  // Select parameters based on model
  const totalParams = model === 'large' ? ALBERT_LARGE_PARAMS : ALBERT_SMALL_PARAMS;
  const activeParams = totalParams; // Albert models are not MoE
  const activeParamsBillions = activeParams / 1e9;
  
  // Energy consumption per token
  const energyPerToken = ENERGY_ALPHA * activeParamsBillions + ENERGY_BETA;
  
  // Calculate GPU memory requirements
  const memoryRequired = 1.2 * totalParams * GPU_BITS / 8;
  const numGPUs = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  
  // Calculate inference latency
  const latencyPerToken = LATENCY_ALPHA * activeParamsBillions + LATENCY_BETA;
  const totalLatency = outputTokens * latencyPerToken;
  
  // Calculate GPU energy consumption
  const gpuEnergy = outputTokens * energyPerToken * numGPUs;
  
  // Calculate server energy excluding GPUs
  const serverEnergyWithoutGPU = totalLatency * SERVER_POWER_WITHOUT_GPU * numGPUs / INSTALLED_GPUS / 3600 * 1000;
  
  // Total server energy
  const serverEnergy = serverEnergyWithoutGPU + gpuEnergy;
  
  // Apply data center overhead
  const totalEnergy = PUE * serverEnergy;
  
  // Ensure minimum energy value
  const minEnergy = 0.01;
  const normalizedEnergy = Math.max(totalEnergy, minEnergy);
  
  // Calculate CO2 emissions using French emission factor
  const co2Emissions = normalizedEnergy * FRANCE_EMISSION_FACTOR;
  
  return {
    numGPUs,
    totalEnergy: normalizedEnergy,
    co2Emissions,
    modelDetails: {
      totalParams: totalParams / 1e9,
      activeParams: activeParams / 1e9,
      modelType: model
    }
  };
}

/**
 * Validates and repairs storage if needed
 */
function validateAndRepairStorage() {
  if (!isExtensionContextValid || !checkExtensionContext()) {
    console.log('Extension context invalidated, skipping storage validation');
    return;
  }
  
  console.log("Running storage validation check for Albert...");
  
  try {
    chrome.storage.local.get(['albertLogs', 'extensionVersion'], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error checking storage:", chrome.runtime.lastError);
        return;
      }
      
      let needsRepair = false;
      
      if (!result.albertLogs || !Array.isArray(result.albertLogs)) {
        console.warn("Invalid Albert logs format in storage, needs repair");
        needsRepair = true;
      }
      
      if (!result.extensionVersion) {
        console.warn("Missing extension version in storage, will repair");
        needsRepair = true;
      }
      
      if (needsRepair) {
        if (logs && Array.isArray(logs) && logs.length > 0) {
          console.log("Repairing storage with in-memory Albert logs");
          chrome.storage.local.set({ 
            albertLogs: logs,
            extensionVersion: chrome.runtime.getManifest().version
          });
        } else {
          console.log("Initializing fresh Albert logs in storage");
          chrome.storage.local.set({ 
            albertLogs: [],
            extensionVersion: chrome.runtime.getManifest().version
          });
        }
      } else {
        console.log("Albert storage validation passed - data is healthy");
      }
    });
  } catch (e) {
    console.error('Error accessing Chrome storage:', e);
    if (e.message && e.message.includes('Extension context invalidated')) {
      isExtensionContextValid = false;
      intervalIds.forEach(id => clearInterval(id));
      intervalIds = [];
    }
  }
}

/**
 * Initializes the extension functionality with retry mechanism
 */
function initializeWithRetry(retryCount = 3) {
  console.log(`Initializing Albert tracker with ${retryCount} retries remaining`);
  try {
    chrome.storage.local.get(['albertLogs', 'extensionVersion'], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading Albert logs:", chrome.runtime.lastError);
        
        if (chrome.runtime.lastError.message && 
            chrome.runtime.lastError.message.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated during initialization');
          isExtensionContextValid = false;
          intervalIds.forEach(id => clearInterval(id));
          intervalIds = [];
          return;
        }
        
        if (retryCount > 0) {
          console.log(`Retrying in 1 second (${retryCount} attempts left)...`);
          setTimeout(() => initializeWithRetry(retryCount - 1), 1000);
          return;
        }
      }
      
      const currentVersion = chrome.runtime.getManifest().version;
      const storedVersion = result.extensionVersion || '0.0';
      console.log(`Extension version: Current=${currentVersion}, Stored=${storedVersion}`);
      
      if (result && result.albertLogs && Array.isArray(result.albertLogs)) {
        try {
          logs.length = 0;
          logs.push(...result.albertLogs);
          console.log(`Loaded ${result.albertLogs.length} Albert conversation logs`);
        } catch (arrayError) {
          console.error("Error adding logs to array:", arrayError);
          logs.length = 0;
        }
      } else {
        console.log("No existing Albert logs found or invalid format, starting fresh");
        logs.length = 0;
      }
      
      setTimeout(createUsageNotification, 500);
    });
  } catch (e) {
    console.error("Critical initialization error:", e);
    
    if (e.message && e.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated during initialization');
      isExtensionContextValid = false;
      intervalIds.forEach(id => clearInterval(id));
      intervalIds = [];
      return;
    }
    
    if (retryCount > 0) {
      console.log(`Retrying in 1 second (${retryCount} attempts left)...`);
      setTimeout(() => initializeWithRetry(retryCount - 1), 1000);
    } else {
      logs.length = 0;
      setTimeout(createUsageNotification, 500);
    }
  }
}

/**
 * Initializes the extension functionality
 */
function initialize() {
  // Load existing logs from storage
  initializeWithRetry(3);
  
  // Setup periodic storage validation
  setInterval(validateAndRepairStorage, 5 * 60 * 1000);
  
  // Setup when DOM is ready
  const setupUI = () => {
    setupObserver();
    scanMessages();
    
    if (!document.getElementById('ai-impact-notification')) {
      createUsageNotification();
    }
    
    // Monitor for model changes
    setInterval(() => {
      const newModel = detectCurrentModel();
      if (newModel !== currentModel) {
        currentModel = newModel;
        updateUsageNotification();
      }
    }, 2000);
  };
  
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(setupUI, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(setupUI, 1000);
    });
  }
  
  // Monitor URL changes
  let lastUrl = window.location.href;
  const urlMonitorInterval = setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      
      try {
        const match = window.location.href.match(/\/c\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          conversationId = match[1];
        }
      } catch {
        // Ignore URL parsing errors
      }
      
      setTimeout(scanMessages, 1000);
    }
  }, 1000);
  intervalIds.push(urlMonitorInterval);
  
  // Setup periodic notification updates
  const notificationInterval = setInterval(() => {
    if (document.getElementById('ai-impact-notification')) {
      updateUsageNotification();
    } else {
      createUsageNotification();
    }
  }, 2 * 60 * 1000);
  intervalIds.push(notificationInterval);
}

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "updateNotification") {
        if (message.enabled) {
          if (!document.getElementById('ai-impact-notification')) {
            createUsageNotification();
          }
        } else {
          const notification = document.getElementById('ai-impact-notification');
          if (notification) {
            notification.parentNode.removeChild(notification);
          }
        }
        return true;
      }
    });
  } catch (e) {
    console.warn('Failed to add message listener:', e);
  }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  intervalIds.forEach(id => clearInterval(id));
  intervalIds = [];
});

// Start the extension
initialize();