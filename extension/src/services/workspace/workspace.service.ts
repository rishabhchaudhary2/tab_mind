import { getGroupedTabs } from "../../background/tabs";
import { getState, saveState } from "../storage";
import { getFolders } from "./helper";

export async function getWorkspaces() {
  const state = await getState();
  return state.workspaces;
}

export async function createWorkspace(name: string) {
  const state = await getState();

  const rawFolders = await getGroupedTabs();
  const folders = getFolders(rawFolders);

  const workspace = {
    id: crypto.randomUUID(),
    name,
    folders,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  state.workspaces.push(workspace);
  state.currentWorkspaceId = workspace.id;
  await saveState(state);

  return workspace;
}

export async function restoreWorkspace(id: string) {
  const state = await getState();
  const workspace = state.workspaces.find((entry) => entry.id === id);

  if (!workspace) {
    throw new Error(`Workspace not found: ${id}`);
  }

  for (const folder of workspace.folders) {
    for (const tab of folder.tabs) {
      await chrome.tabs.create({
        url: tab.url,
        active: false,
        pinned: tab.pinned,
      });
    }
  }

  state.currentWorkspaceId = workspace.id;
  await saveState(state);

  return workspace;
}

export async function deleteWorkspace(id: string) {
  const state = await getState();

  state.workspaces = state.workspaces.filter((ws) => ws.id !== id);
  if (state.currentWorkspaceId === id) {
    state.currentWorkspaceId = null;
  }

  await saveState(state);
}