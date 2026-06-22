export function broadcastTabsUpdated(groupedTabs: any) {
    chrome.runtime.sendMessage({
        type: "TABS_UPDATED",
        payload: groupedTabs,
    });
}