export function broadcastTabsUpdated(groupedTabs: any) {
    void chrome.runtime
        .sendMessage({
            type: "TABS_UPDATED",
            payload: groupedTabs,
        })
        .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);

            if (!message.includes("Receiving end does not exist")) {
                console.error("Failed to broadcast tab update:", error);
            }
        });
}