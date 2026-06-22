// src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';

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

  

  return (
    <div className="app-shell">
      <h1>Workspace</h1>

      {Object.entries(folders).map(([domain, tabs]) => (
        <div
          key={domain}
          style={{
            marginBottom: "20px",
            border: "1px solid gray",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            onClick={() => toggle(domain)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            <h3 style={{ margin: 0 }}>
              {expandedFolders[domain] ?? false ? "▼" : "▶"}{" "}
              {domain} ({tabs.length})
            </h3>
          </div>

          {(expandedFolders[domain] ?? false) && tabs.map((tab) => (
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 6px",
                marginBottom: "6px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {/* Left Side */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                {tab.favIconUrl && (
                  <img
                    src={tab.favIconUrl}
                    width={16}
                    height={16}
                    alt=""
                  />
                )}

                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tab.title}
                </span>
              </div>

              {/* Right Side */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginLeft: "10px",
                }}
              >
                {/* Pin */}
                <button
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
                  📌
                </button>

                {/* Close */}
                <button
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
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;