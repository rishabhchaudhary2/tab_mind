import { getGroupedTabs } from "../../background/tabs";
import { getState, saveState } from "../storage";
import { getFolders } from "./helper";

export async function getWorkspace() {
  const state = await getState();
  return state.workspaces;
}

export async function createWorkspace(name: string) {
  const state = await getState();

  const rawFolders = await getGroupedTabs();

  const folders = getFolders(rawFolders);

  const workspace = {
    id: crypto.randomUUID(),
    name: name,
    folders,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.workspaces.push(workspace);
  await saveState(state);
  return workspace;
}

export async function deleteWorkspace(id:string){

    const state = await getState();

    state.workspaces =
        state.workspaces.filter(ws=>ws.id!==id);

    await saveState(state);

}