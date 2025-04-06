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
  