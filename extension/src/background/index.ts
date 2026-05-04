// src/background/index.ts
console.log("Background service worker initialized!");

// This tells Chrome to open your Side Panel when the user clicks the extension icon in the toolbar
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));

// Example listener: Fired when a tab is closed (We'll use this later for RAM optimization)
chrome.tabs.onRemoved.addListener((tabId) => {
    console.log(`Tab ${tabId} was closed.`);
});