import { defaultState } from "./state";
import type { AppState } from "./state";

export async function getState(): Promise<AppState> {
  const result = (await chrome.storage.local.get("appState")) as {
    appState?: AppState;
  };

  return result.appState ?? defaultState;
}

export async function saveState(state: AppState): Promise<void> {
  await chrome.storage.local.set({
    appState: state,
  });
}