import { updateFolders } from "./tabs";

export function tabListeners() {

    chrome.tabs.onCreated.addListener((tab) => {
        updateFolders();
        console.log("Tab Created:", tab);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
        updateFolders();
        console.log("Tab Removed:", tabId);
    });
    
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        updateFolders();
        console.log("Tab Updated:", tabId, changeInfo);
    });
    
    chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
        updateFolders();
        console.log("Tab Moved:", tabId, moveInfo);
    });

}