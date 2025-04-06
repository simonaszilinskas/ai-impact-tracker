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
 * @param {Object} data - Data object to store
 */
function saveToStorage(data) {
  try {
    chrome.storage.local.set(data);
  } catch (e) {
    console.error("Storage error:", e);
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
 */
function scanMessages() {
  // Find all user and assistant messages by their data attributes
  const userMessages = [...document.querySelectorAll('[data-message-author-role="user"]')];
  const assistantMessages = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
  
  // Process message pairs in order
  for (let i = 0; i < userMessages.length; i++) {
    if (i < assistantMessages.length) {
      const userMessage = userMessages[i].textContent.trim();
      const assistantResponse = assistantMessages[i].textContent.trim();
      
      if (userMessage) {
        // Save any non-empty exchange
        saveLog(userMessage, assistantResponse);
      }
    }
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
  // Load existing logs from storage
  chrome.storage.local.get('chatgptLogs', (result) => {
    if (result.chatgptLogs) {
      logs.push(...result.chatgptLogs);
    }
  });
  
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
 * 
 * @param {number} outputTokens - Number of tokens in the assistant's response
 * @returns {Object} Energy usage and emissions data
 */
function calculateEnergyAndEmissions(outputTokens) {
  // Assuming ChatGPT is a 300B parameter model
  const modelParams = 300e9;
  const activeParams = modelParams / 1e9; // Convert to billions
  
  // Energy consumption per token (Wh/token)
  const energyPerToken = ENERGY_ALPHA * activeParams + ENERGY_BETA;
  
  // Calculate GPU memory requirements
  const memoryRequired = 1.2 * modelParams * GPU_BITS / 8; // in bytes
  const numGPUs = Math.ceil(memoryRequired / (GPU_MEMORY * 1e9));
  
  // Calculate inference latency
  const latencyPerToken = LATENCY_ALPHA * activeParams + LATENCY_BETA;
  const totalLatency = outputTokens * latencyPerToken;
  
  // Calculate GPU energy consumption (Wh)
  const gpuEnergy = outputTokens * energyPerToken * numGPUs;
  
  // Calculate server energy excluding GPUs (Wh)
  // Converting kW to Wh by multiplying by hours (latency / 3600)
  const serverEnergyWithoutGPU = totalLatency * SERVER_POWER_WITHOUT_GPU * numGPUs / INSTALLED_GPUS / 3600 * 1000;
  
  // Total server energy (Wh)
  const serverEnergy = serverEnergyWithoutGPU + gpuEnergy;
  
  // Apply data center overhead (PUE)
  const totalEnergy = PUE * serverEnergy;
  
  // Calculate CO2 emissions (grams)
  const co2Emissions = totalEnergy * WORLD_EMISSION_FACTOR;
  
  return {
    numGPUs,
    totalEnergy,
    co2Emissions
  };
}

// Start the extension
initialize();