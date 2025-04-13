/**
 * AI Impact Tracker - Background Script
 * =========================================
 * This script handles extension initialization and background tasks.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Impact Tracker installed successfully.");
  
  // Initialize storage if needed
  chrome.storage.local.get(['chatgptLogs', 'notificationEnabled'], (result) => {
    const updates = {};
    
    if (!result.chatgptLogs) {
      updates.chatgptLogs = [];
    }
    
    // Initialize notification setting if it doesn't exist
    // Default to enabled
    if (result.notificationEnabled === undefined) {
      updates.notificationEnabled = true;
    }
    
    // Apply any needed updates
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Handle message from content script to open popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPopup") {
    // Chrome doesn't allow programmatically opening the popup,
    // but we can focus the extension's browser action
    chrome.action.openPopup();
    console.log("Attempted to open popup");
    return true;
  } else if (message.action === "toggleNotification") {
    // Toggle notification setting
    chrome.storage.local.get('notificationEnabled', (result) => {
      const currentValue = result.notificationEnabled !== false;
      chrome.storage.local.set({ notificationEnabled: !currentValue });
      console.log(`Notification setting toggled to: ${!currentValue}`);
    });
    return true;
  }
});