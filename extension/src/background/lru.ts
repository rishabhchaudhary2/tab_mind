import { getState, saveState } from "@/services/storage";

const MAX_TABS_RAM = 5;

function isEligible(tab : chrome.tabs.Tab){
    return (
        typeof tab.id == "number" && 
        !tab.active && !tab.pinned && !tab.audible && !tab.discarded && !!tab.url && isDiscardUrl(tab.url)
    );
}

function isDiscardUrl(url : string){
    return (
        !url.startsWith("chrome://") &&
        !url.startsWith("edge://") &&
        !url.startsWith("chrome-extension://") &&
        !url.startsWith("devtools://") &&
        !url.startsWith("about:")

    );
}

export async function recordTab(tabId : number){
    const state = await getState();
    state.metadata.lru[tabId] = Date.now();
    await saveState(state);

    await enforceRam();
}

export async function cleanupClosedTab(tabId : number){
    const state = await getState();
    if(state.metadata.lru[tabId] === undefined) {
        return;
    }

    delete state.metadata.lru[tabId];
    await saveState(state);
}

export async function enforceRam(){
    const state = await getState();
    const tabs = await chrome.tabs.query({});

    const liveTabIds = new Set(
        tabs.map((tab) => tab.id).filter((tabId):tabId is number => typeof tabId === 'number'),
    );

    let stateChanged = false;

    for (const tabId of Object.keys(state.metadata.lru)) {
        const numericTabId = Number(tabId);

        if(!liveTabIds.has(numericTabId)){
            delete state.metadata.lru[numericTabId];
            stateChanged = true;
        }

    
    }

    let eligibleTabs = tabs.filter(isEligible);

    if(stateChanged) {
        await saveState(state);
    }

    if(eligibleTabs.length <= MAX_TABS_RAM) {
        return;
    }

    while(eligibleTabs.length > MAX_TABS_RAM){
        const candi = eligibleTabs.reduce<chrome.tabs.Tab | undefined> (
            (lr, tab) => {
                if(!lr) {
                    return tab;
                }

                const lraccess = state.metadata.lru[lr.id ?? -1] ?? 0;
                const craccess = state.metadata.lru[tab.id ?? -1] ?? 0;

                return craccess < lraccess ? tab : lr;
            },
            undefined,
        );
        if(!candi?.id) break;

        await chrome.tabs.discard(candi.id);

        eligibleTabs = eligibleTabs.filter((tab) => tab.id !== candi.id);
    };
  
}
