/**
 * AI Impact Tracker - Content Script
 * =====================================
 * This script captures conversation data from the ChatGPT web interface,
 * extracts message content, calculates token usage, energy consumption,
 * and CO2 emissions. It persists data to Chrome storage for the popup UI.
 */

// In-memory storage for conversation logs
const logs = [];
let conversationId = null;

// Constants for EcoLogits methodology
// These constants are derived from academic research on LLM energy consumption
const ENERGY_ALPHA = 8.91e-5;  // Energy coefficient for model parameters (Wh/token/B-params)
const ENERGY_BETA = 1.43e-3;   // Base energy per token (Wh/token)
const LATENCY_ALPHA = 8.02e-4; // Latency coefficient for model parameters (s/token/B-params)
const LATENCY_BETA = 2.23e-2;  // Base latency per token (s/token)
const PUE = 1.2;               // Power Usage Effectiveness for modern data centers
const GPU_MEMORY = 80;         // A100 GPU memory in GB
const SERVER_POWER_WITHOUT_GPU = 1; // Server power excluding GPUs (kW)
const INSTALLED_GPUS = 8;      // Typical GPUs per server in OpenAI's infrastructure
const GPU_BITS = 4;            // Quantization level in bits (4-bit = 4x memory compression)
const WORLD_EMISSION_FACTOR = 0.418; // Global average emission factor (kgCO2eq/kWh)

/**
 * Saves data to Chrome's local storage
 * Handles extension context invalidation gracefully
 * @param {Object} data - Data object to store
 */
function saveToStorage(data) {
  try {
    // Check if Chrome API is still available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, function() {
        // Check for runtime error
        if (chrome.runtime.lastError) {
          console.error("Chrome storage error:", chrome.runtime.lastError);
          // If context is invalidated, we'll retry once after a delay
          if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
            setTimeout(() => {
              console.log("Attempting to reconnect to extension context...");
              // This will either work with the refreshed context or fail silently
              try {
                chrome.storage.local.set(data);
              } catch (innerError) {
                // At this point, we'll just let it go
              }
            }, 1000);
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
function saveLog(userMessage, assistantResponse) {
  // Use message prefix as unique identifier for this exchange
  const userMessageKey = userMessage.substring(0, 100);
  
  // Estimate token count (4 chars ≈ 1 token for English text)
  const userTokenCount = Math.ceil(userMessage.length / 4);
  const assistantTokenCount = Math.ceil(assistantResponse.length / 4);
  
  // Calculate environmental impact
  const energyData = calculateEnergyAndEmissions(assistantTokenCount);
  const energyUsage = energyData.totalEnergy;
  const co2Emissions = energyData.co2Emissions;
  
  // Check if we already have a log with this user message
  const existingLogIndex = logs.findIndex(log => 
    log.userMessage.substring(0, 100) === userMessageKey
  );
  
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
  }
}

/**
 * Scans the DOM for ChatGPT conversation messages
 * Uses data attributes specific to ChatGPT's DOM structure
 * Includes error handling to prevent extension crashes
 */
function scanMessages() {
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
                    saveLog(userMessage, assistantResponse);
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
            saveLog(userMessage, assistantResponse);
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
                
                // Limit buffer size
                if (buffer.length > 100000) {
                  buffer = buffer.substring(buffer.length - 50000);
                }
              }
              
              // Scan after stream completes
              setTimeout(scanMessages, 1000);
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
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    // Check if any assistant messages were added
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
      }
      
      if (shouldScan) break;
    }
    
    // Scan on relevant changes
    if (shouldScan) {
      // Immediate scan for partial responses
      scanMessages();
      
      // Delayed scans for completed responses
      setTimeout(scanMessages, 1000);
      setTimeout(scanMessages, 3000);
    }
  });
  
  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Initializes the extension functionality
 */
function initialize() {
  // Load existing logs from storage with error handling
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('chatgptLogs', (result) => {
        try {
          if (chrome.runtime.lastError) {
            console.error("Error loading logs:", chrome.runtime.lastError);
            return;
          }
          
          if (result && result.chatgptLogs) {
            logs.push(...result.chatgptLogs);
            console.log(`Loaded ${result.chatgptLogs.length} conversation logs`);
          } else {
            console.log("No existing logs found, starting fresh");
          }
        } catch (innerError) {
          console.error("Error processing stored logs:", innerError);
        }
      });
    } else {
      console.warn("Chrome storage API not available for loading logs");
    }
  } catch (e) {
    console.error("Failed to access storage:", e);
  }
  
  // Setup when DOM is ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => {
      setupFetchInterceptor();
      setupObserver();
      scanMessages(); // Initial scan
    }, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        setupFetchInterceptor();
        setupObserver();
        scanMessages(); // Initial scan
      }, 1000);
    });
  }
  
  // Monitor URL changes to detect new conversations
  let lastUrl = window.location.href;
  setInterval(() => {
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
      setTimeout(scanMessages, 1000);
    }
  }, 1000);
}

/**
 * Calculates energy usage and CO2 emissions based on EcoLogits methodology
 * 
 * This implements the energy calculation model from https://arxiv.org/abs/2309.12456
 * with appropriate scaling for different model sizes and token counts.
 * Modified to account for Mixture of Experts (MoE) model architecture.
 * 
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @returns {Object} Energy usage and emissions data
 */
function calculateEnergyAndEmissions(outputTokens) {
  // ChatGPT is a Mixture of Experts (MoE) model with 440B total parameters
  const totalParams = 440e9;
  const activeRatio = 0.125; // 12.5% activation ratio for MoE models
  const activeParams = 55e9; // 55B active parameters
  const activeParamsBillions = activeParams / 1e9; // Convert to billions for calculations
  
  // Energy consumption per token (Wh/token) - based on ACTIVE parameters
  // This is because energy consumption during inference is primarily determined by compute, 
  // which is proportional to active parameters in MoE models
  const energyPerToken = ENERGY_ALPHA * activeParamsBillions + ENERGY_BETA;
  
  // Calculate GPU memory requirements - based on TOTAL parameters
  // Memory footprint is determined by the total model size, not just active parameters
  const memoryRequired = 1.2 * totalParams * GPU_BITS / 8; // in bytes
  const numGPUs = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  
  // Calculate inference latency - based on ACTIVE parameters
  // Latency is determined by compute, which is proportional to active parameters in MoE models
  const latencyPerToken = LATENCY_ALPHA * activeParamsBillions + LATENCY_BETA;
  const totalLatency = outputTokens * latencyPerToken;
  
  // Calculate GPU energy consumption (Wh) - using active parameters for computation
  const gpuEnergy = outputTokens * energyPerToken * numGPUs;
  
  // Calculate server energy excluding GPUs (Wh)
  // Converting kW to Wh by multiplying by hours (latency / 3600)
  const serverEnergyWithoutGPU = totalLatency * SERVER_POWER_WITHOUT_GPU * numGPUs / INSTALLED_GPUS / 3600 * 1000;
  
  // Total server energy (Wh)
  const serverEnergy = serverEnergyWithoutGPU + gpuEnergy;
  
  // Apply data center overhead (PUE)
  const totalEnergy = PUE * serverEnergy;
  
  // Ensure minimum energy value for visibility in UI
  const minEnergy = 0.01; // Minimum 0.01 Wh to ensure visibility
  const normalizedEnergy = Math.max(totalEnergy, minEnergy);
  
  // Calculate CO2 emissions (grams)
  const co2Emissions = normalizedEnergy * WORLD_EMISSION_FACTOR;
  
  return {
    numGPUs,
    totalEnergy: normalizedEnergy,
    co2Emissions,
    modelDetails: {
      totalParams: totalParams / 1e9,
      activeParams: activeParams / 1e9,
      activationRatio: activeRatio
    }
  };
}

// Start the extension
initialize();