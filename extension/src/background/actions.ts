//  applying crud operations on tabs and broadcasting the updated folders to the popup

// activating a tab

export async function activateTab(tabId: number) {
    await chrome.tabs.update(tabId, {
        active: true
    });
}

// closing a tab

export async function closeTab(tabId: number) {
    await chrome.tabs.remove(tabId);
}

// pinning a tab
export async function pinTab(tabId:number){

    await chrome.tabs.update(tabId,{
        pinned:true
    });

}