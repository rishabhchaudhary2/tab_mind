// src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";



import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  RotateCcw,
  Pin,
  X,
  Monitor,
  Trash2,
} from "lucide-react";
import { InputGroup } from './components/ui/input-group';
import type { Workspace } from "./services/state";

interface TabInfo {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

type GroupedTabs = Record<string, TabInfo[]>;



function App() {

  const [folders, setFolders] = useState<GroupedTabs>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("New Workspace");

  // set the folder exapnsion status to chrome.local.storage  and toggle the expansion status of a folder
  const toggle = (domain: string) => {
    setExpandedFolders((prev) => {
      const updated = {
        ...prev,
        [domain]: !(prev[domain] ?? false),
      };

      chrome.storage.local.set({
        expandedFolders: updated,
      });

      return updated;
    });
  };

  // to get initial data 
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: "GET_GROUPED_TABS" },
      (response: GroupedTabs) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        //  console.log("Response from background:", response);
        setFolders(response);
      }
    );
  }, []);

  const loadWorkspaces = () => {
    chrome.runtime.sendMessage({ type: "GET_WORKSPACES" }, (response: Workspace[]) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }

      setWorkspaces(response ?? []);
    });
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);


  // live update 

  useEffect(() => {

    const listener = (message: any) => {
      if (message.type === "TABS_UPDATED") {
        console.log("Live Update");
        setFolders(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };

  }, []);

  const createWorkspace = () => {
    chrome.runtime.sendMessage(
      {
        type: "CREATE_WORKSPACE",
        payload: {
          name: workspaceName.trim() || "New Workspace",
        },
      },
      () => {
        loadWorkspaces();
      }
    );
  };

  const restoreWorkspace = (id: string) => {
    chrome.runtime.sendMessage(
      {
        type: "RESTORE_WORKSPACE",
        payload: { id },
      },
      () => {
        loadWorkspaces();
      }
    );
  };

  const deleteWorkspace = (id: string) => {
    chrome.runtime.sendMessage(
      {
        type: "DELETE_WORKSPACE",
        payload: { id },
      },
      () => {
        loadWorkspaces();
      }
    );
  };




  // get the folder expansion status from chrome.local.storage

  useEffect(() => {
    chrome.storage.local.get("expandedFolders", (result) => {
      console.log("Loaded:", result.expandedFolders);

      if (result.expandedFolders) {
        setExpandedFolders(
          result.expandedFolders as Record<string, boolean>
        );
      }
    });
  }, []);



  
return (
  <div className="h-screen bg-background text-foreground flex flex-col">
    {/* Header */}
    <div className="border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspace</h1>

        <Button
          onClick={() => {
            chrome.tabs.create({
              url: chrome.runtime.getURL("fullscreen.html"),
            });
          }}
        >
          <Monitor className="mr-2 h-4 w-4" />
          Fullscreen
        </Button>
      </div>



     <InputGroup   className="mt-4 ">

    <Input placeholder="Search tabs..." />
</InputGroup>
    </div>

    <div className="border-b px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Workspace name"
          />
          <Button onClick={createWorkspace}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>

        <div className="grid gap-2">
          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No saved workspaces yet.
            </div>
          ) : (
            workspaces.map((workspace) => (
              <Card className="shadow-none border-border/60" key={workspace.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{workspace.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {workspace.folders.length} folders · Updated {new Date(workspace.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => restoreWorkspace(workspace.id)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWorkspace(workspace.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>

    {/* Body */}
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {Object.entries(folders).map(([domain, tabs]) => (
          <Card className="shadow-none border-border/60" key={domain}>
            <CardContent className="p-4">
              {/* Folder Header */}
              <div
                onClick={() => toggle(domain)}
                className="flex cursor-pointer items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {expandedFolders[domain] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}

                  <span className="font-medium">{domain}</span>

                  <Badge variant="secondary">
                    {tabs.length}
                  </Badge>
                </div>
              </div>

              {/* Tabs */}
              {expandedFolders[domain] &&
                tabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => {
                      chrome.runtime.sendMessage({
                        type: "ACTIVATE_TAB",
                        payload: {
                          tabId: tab.id,
                        },
                      });
                    }}
                    className="
                      mt-3
                      flex
                      cursor-pointer
                      items-center
                      justify-between
                      rounded-lg
                      p-2
                      transition-colors
                      hover:bg-muted
                    "
                  >
                    {/* Left */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="h-4 w-4"
                        />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-muted" />
                      )}

                      <span className="truncate text-sm">
                        {tab.title}
                      </span>
                    </div>

                    {/* Right */}
                    <div className="ml-3 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();

                          chrome.runtime.sendMessage({
                            type: "PIN_TAB",
                            payload: {
                              tabId: tab.id,
                            },
                          });
                        }}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();

                          chrome.runtime.sendMessage({
                            type: "CLOSE_TAB",
                            payload: {
                              tabId: tab.id,
                            },
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  </div>
);

}

export default App;