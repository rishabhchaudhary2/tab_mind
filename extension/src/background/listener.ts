import { updateFolders } from "./tabs";
import {
    cleanupClosedTab,
    enforceRam,
    recordTab,
} from "./lru";

export function tabListeners() {

    void enforceRam();

    chrome.tabs.onCreated.addListener((tab) => {
        if (typeof tab.id === "number") {
            void recordTab(tab.id);
        }

        updateFolders();
        console.log("Tab Created:", tab);
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
        void recordTab(activeInfo.tabId);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
        void cleanupClosedTab(tabId);
        updateFolders();
        console.log("Tab Removed:", tabId);
    });
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        updateFolders();
        console.log("Tab Updated:", tabId, changeInfo);
    });
    
    chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
        updateFolders();
        console.log("Tab Moved:", tabId, moveInfo);
    });

}