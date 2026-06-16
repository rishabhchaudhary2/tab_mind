
function createFolder(name) {
  chrome.storage.local.get(["folders"], (data) => {
    let folders = data.folders || [];
    folders.push({
      id: Date.now().toString(),
      name: name,
      tabs: []
    });
    chrome.storage.local.set({ folders }, loadFolders);
  });
}