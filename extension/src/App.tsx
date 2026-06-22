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

  const [folders,setFolders] = useState<GroupedTabs>({});

 useEffect(() => {
    chrome.runtime.sendMessage(
      { type: "GET_GROUPED_TABS" },
      (response: GroupedTabs) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
 console.log("Response from background:", response);
        setFolders(response);
      }
    );
  }, []);
  console.log("Folders: ", folders);
  // const tabsList = tabs.map((tab) => (
  //   <li key={tab.id}>{tab.title || tab.url || 'Unnamed Tab'}</li>
  // ));

  // useEffect(() => {
  //   chrome.tabs.query({}, (tabs) => {
  //     setTabs(tabs);
  //   });
  // }, []);

  // return (
  //   <div className="app-shell">
  //     <h1>Open Tabs</h1>
  //     <ul>
  //       {/* {tabsList} */}
  //       {workspaces.map((workspace)=>{
  //         return (
  //           <li key={workspace.id}>
  //               <h2>{workspace.name}</h2>
  //             <ul>
  //               {workspace.folders.map((folder) => (
  //                 <li key={folder.id}>
  //                   <h3>{folder.name}</h3>
  //                   <ul>
  //                     {folder.tabs.map((tab, index) => (
  //                       <li key={index}>{tab.title}</li>
  //                     ))}
  //                   </ul>
  //                 </li>
  //               ))}
  //             </ul>
  //           </li>
  //         )
  //       })}

      
  //     </ul>
  //   </div>
  // );
  return (
   <div className="app-shell">
      <h1>Workspace</h1>

      {Object.entries(folders).map(([domain, tabs]) => (
        <div
          key={domain}
          style={{
            marginBottom: "20px",
            border: "1px solid gray",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          <h3>{domain}</h3>

          {tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
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

              <span>{tab.title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;