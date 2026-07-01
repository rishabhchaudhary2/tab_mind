import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  restoreWorkspace,
} from "../services/workspace/workspace.service.ts";
import { activateTab, closeTab, pinTab } from "./actions";
import { tabListeners } from "./listener";
import { getGroupedTabs } from "./tabs";

type BackgroundMessage =
  | { type: "GET_GROUPED_TABS" }
  | { type: "ACTIVATE_TAB"; payload: { tabId: number } }
  | { type: "CLOSE_TAB"; payload: { tabId: number } }
  | { type: "PIN_TAB"; payload: { tabId: number } }
  | { type: "CREATE_WORKSPACE"; payload: { name: string } }
  | { type: "GET_WORKSPACES" }
  | { type: "RESTORE_WORKSPACE"; payload: { id: string } }
  | { type: "DELETE_WORKSPACE"; payload: { id: string } };

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

chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
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
      getWorkspaces().then((workspaces) => {
        sendResponse(workspaces);
      });

      return true;
    case "RESTORE_WORKSPACE":
      restoreWorkspace(message.payload.id)
        .then((workspace) => {
          sendResponse(workspace);
        })
        .catch((error: unknown) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
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
  },
);
