/**
 * AI Impact Tracker - Background Script
 * =========================================
 * This script handles extension initialization and background tasks.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Impact Tracker installed successfully.");
  
  // Initialize storage if needed
  chrome.storage.local.get('chatgptLogs', (result) => {
    if (!result.chatgptLogs) {
      chrome.storage.local.set({ chatgptLogs: [] });
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
  }
});