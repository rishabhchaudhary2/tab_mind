import { type Folder, type TabItem } from "../state";

export  function getFolders(rawFolders: Record<string, TabItem[]>
): Folder[] {
    return Object.entries(rawFolders).map(([domain, tabs]) => ({
        id: crypto.randomUUID(),
        name: domain,
        tabs: tabs.map(({ title, url, favIconUrl, pinned }) => ({
            title,
            url,
            favIconUrl,
            pinned,
        })),
    }));
}