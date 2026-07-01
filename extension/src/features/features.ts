type FolderRecord = {
  id: string;
  name: string;
  tabs: unknown[];
};

export function createFolder(name: string) {
  chrome.storage.local.get(["folders"], (data) => {
    const folders = (data.folders as FolderRecord[] | undefined) ?? [];

    folders.push({
      id: Date.now().toString(),
      name,
      tabs: [],
    });

    chrome.storage.local.set({ folders }, loadFolders);
  });
}

export function loadFolders() {
  chrome.storage.local.get(["folders"], (data) => {
    void data.folders;
  });
}