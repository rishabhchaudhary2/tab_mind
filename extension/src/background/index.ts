import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
} from "../services/workspace/ workspace.service";
import { activateTab, closeTab, pinTab } from "./actions";
import { tabListeners } from "./listener";
import { getGroupedTabs } from "./tabs";

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

// chrome.tabs.query({}, (tabs) => {
//     console.log("Current open tabs: \n", tabs);
//     tabs.map((tab)=>{
//         console.log(`Tab ID: ${tab.id}, Title: ${tab.title}, URL: ${tab.url}`);
//     })
// });

tabListeners();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "GET_GROUPED_TABS":
      console.log("Request received!");

      getGroupedTabs().then((groupedTabs) => {
        sendResponse(groupedTabs);
      });

      return true;

    case "ACTIVATE_TAB":
      activateTab(message.payload.tabId);
      break;
    case "CLOSE_TAB":
      closeTab(message.payload.tabId);
      break;

    case "PIN_TAB":
      pinTab(message.payload.tabId);
      break;
    case "CREATE_WORKSPACE":
      createWorkspace(message.payload.name).then((workspace) => {
        sendResponse(workspace);
      });

      return true;
    case "GET_WORKSPACES":
      getWorkspace().then((workspaces) => {
        sendResponse(workspaces);
      });

      return true;
    case "DELETE_WORKSPACE":
      deleteWorkspace(message.payload.id).then(() => {
        sendResponse({
          success: true,
        });
      });

      return true;
  }
});
