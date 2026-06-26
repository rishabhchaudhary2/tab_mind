import type { TabItem } from "../services/state";
import { broadcastTabsUpdated } from "./message";
import { getDomain } from "./utils/domain";

// export interface TabInfo {
//   id: number;
//   title: string;
//   url: string;
//   favIconUrl?: string;
//   pinned: boolean;
// }

function isValidUrl(url: string) {
  return (
    !url.startsWith("chrome://") &&
    !url.startsWith("edge://") &&
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("devtools://") &&
    !url.startsWith("about:")
  );
}

async function getGroupedTabs() {
  const tabs = await chrome.tabs.query({});

  const groupedTabs: Record<string, TabItem[]> = {};

  tabs.forEach((tab) => {
    if (!tab.url || !isValidUrl(tab.url)) return;

    try {
      // const hostname = new URL(tab.url).hostname.replace(/^www\./, "");

      const domain = getDomain(tab.url);

      if (!groupedTabs[domain]) {
        groupedTabs[domain] = [];
      }

      groupedTabs[domain].push({
        id: tab.id!,
        title: tab.title ?? "",
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
      });
    } catch {
      console.log("Invalid URL:", tab.url);
    }
  });

  return groupedTabs;
}

export { getGroupedTabs };

async function updateFolders() {
  const folders = await getGroupedTabs();

  console.log("Broadcasting updated folders");

  broadcastTabsUpdated(folders);
}

export { updateFolders };
