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
  Pin,
  X,
  Monitor,
} from "lucide-react";
import { InputGroup } from './components/ui/input-group';
import { MagnifyingGlass } from '@phosphor-icons/react';

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
  // const [storageLoaded, setStorageLoaded] = useState(false);

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



  // return (
  //   <div className="app-shell">
  //     <h1>Workspace</h1>

  //     <Button
  //     onClick={() => {
  //       chrome.tabs.create({
  //         url: chrome.runtime.getURL("fullscreen.html"),
  //       })
  //     }}>
  //       FullScreen
  //     </Button>
  //     {Object.entries(folders).map(([domain, tabs]) => (
  //       <div
  //         key={domain}
  //         style={{
  //           marginBottom: "20px",
  //           border: "1px solid gray",
  //           borderRadius: "10px",
  //           padding: "14px",
  //         }}
  //       >
  //         <div
  //           onClick={() => toggle(domain)}
  //           style={{
  //             display: "flex",
  //             justifyContent: "space-between",
  //             alignItems: "center",
  //             cursor: "pointer",
  //             marginBottom: "10px",
  //           }}
  //         >
  //           <h3 style={{ margin: 0 }}>
  //             {expandedFolders[domain] ?? false ? "▼" : "▶"}{" "}
  //             {domain} ({tabs.length})
  //           </h3>
  //         </div>

  //         {(expandedFolders[domain] ?? false) && tabs.map((tab) => (
  //           <div
  //             key={tab.id}
  //             onClick={() => {
  //               chrome.runtime.sendMessage({
  //                 type: "ACTIVATE_TAB",
  //                 payload: {
  //                   tabId: tab.id,
  //                 },
  //               });
  //             }}
  //             style={{
  //               display: "flex",
  //               justifyContent: "space-between",
  //               alignItems: "center",
  //               padding: "8px 6px",
  //               marginBottom: "6px",
  //               borderRadius: "6px",
  //               cursor: "pointer",
  //             }}
  //           >
  //             {/* Left Side */}
  //             <div
  //               style={{
  //                 display: "flex",
  //                 alignItems: "center",
  //                 gap: "10px",
  //                 flex: 1,
  //                 overflow: "hidden",
  //               }}
  //             >
  //               {tab.favIconUrl && (
  //                 <img
  //                   src={tab.favIconUrl}
  //                   width={16}
  //                   height={16}
  //                   alt=""
  //                 />
  //               )}

  //               <span
  //                 style={{
  //                   whiteSpace: "nowrap",
  //                   overflow: "hidden",
  //                   textOverflow: "ellipsis",
  //                 }}
  //               >
  //                 {tab.title}
  //               </span>
  //             </div>

  //             {/* Right Side */}
  //             <div
  //               style={{
  //                 display: "flex",
  //                 gap: "8px",
  //                 marginLeft: "10px",
  //               }}
  //             >
  //               {/* Pin */}
  //               <button
  //                 onClick={(e) => {
  //                   e.stopPropagation();

  //                   chrome.runtime.sendMessage({
  //                     type: "PIN_TAB",
  //                     payload: {
  //                       tabId: tab.id,
  //                     },
  //                   });
  //                 }}
  //               >
  //                 📌
  //               </button>

  //               {/* Close */}
  //               <button
  //                 onClick={(e) => {
  //                   e.stopPropagation();

  //                   chrome.runtime.sendMessage({
  //                     type: "CLOSE_TAB",
  //                     payload: {
  //                       tabId: tab.id,
  //                     },
  //                   });
  //                 }}
  //               >
  //                 ❌
  //               </button>
  //             </div>
  //           </div>
  //         ))}
  //       </div>
  //     ))}
  //   </div>
  // );

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