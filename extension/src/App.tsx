// src/App.tsx
import { useEffect, useState } from 'react';
import './App.css';

function App() {

  // let workspaces = [
  //   {
  //     id: "workspace1",
  //     name: "Placement",
  //     folders: ["folder1", "folder2"]
  //   }
  // ]

  // let folders = [
  //   {
  //     id: "folder1",
  //     workspaceId: "workspace1",
  //     name: "DSA",
  //     tabs: ["tab1", "tab2"]
  //   },
  //   {
  //     id: "folder2",
  //     workspaceId: "workspace1",
  //     name: "LLD",
  //     tabs: []
  //   }
  // ]

  // let tabs = [
  //   {
  //     id: "tab1",
  //     title: "LeetCode",
  //     url: "https://leetcode.com",
  //     favIconUrl: "...",
  //     pinned: false
  //   },
  //   {
  //     id: "tab2",
  //     title: "Codeforces",
  //     url: "https://codeforces.com",
  //     favIconUrl: "...",
  //     pinned: false
  //   }
  // ]

  // const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);


const workspaces = [
  {
    id: "w1",
    name: "Placement",
    folders: [
      {
        id: "f1",
        name: "DSA",
        tabs: [
          {
            id: "t1",
            title: "LeetCode",
            url: "https://leetcode.com",
          },
          {
            id: "t2",
            title: "Codeforces",
            url: "https://codeforces.com",
          },
        ],
      },
      {
        id: "f2",
        name: "LLD",
        tabs: [
          {
            id: "t3",
            title: "System Design Playlist",
            url: "https://youtube.com",
          },
        ],
      },
    ],
  },

  {
    id: "w2",
    name: "Machine Learning",
    folders: [
      {
        id: "f3",
        name: "Courses",
        tabs: [
          {
            id: "t4",
            title: "Andrew Ng ML",
            url: "https://coursera.org",
          },
          {
            id: "t5",
            title: "FastAI",
            url: "https://fast.ai",
          },
        ],
      },
      {
        id: "f4",
        name: "Research Papers",
        tabs: [
          {
            id: "t6",
            title: "Attention Is All You Need",
            url: "https://arxiv.org",
          },
        ],
      },
    ],
  },

  {
    id: "w3",
    name: "Personal",
    folders: [
      {
        id: "f5",
        name: "Shopping",
        tabs: [
          {
            id: "t7",
            title: "Amazon",
            url: "https://amazon.in",
          },
          {
            id: "t8",
            title: "Flipkart",
            url: "https://flipkart.com",
          },
        ],
      },
      {
        id: "f6",
        name: "Entertainment",
        tabs: [
          {
            id: "t9",
            title: "Netflix",
            url: "https://netflix.com",
          },
          {
            id: "t10",
            title: "Spotify",
            url: "https://spotify.com",
          },
        ],
      },
    ],
  },
];
  // const tabsList = tabs.map((tab) => (
  //   <li key={tab.id}>{tab.title || tab.url || 'Unnamed Tab'}</li>
  // ));

  // useEffect(() => {
  //   chrome.tabs.query({}, (tabs) => {
  //     setTabs(tabs);
  //   });
  // }, []);

  return (
    <div className="app-shell">
      <h1>Open Tabs</h1>
      <ul>
        {/* {tabsList} */}
        {workspaces.map((workspace)=>{
          return (
            <li key={workspace.id}>
                <h2>{workspace.name}</h2>
              <ul>
                {workspace.folders.map((folder) => (
                  <li key={folder.id}>
                    <h3>{folder.name}</h3>
                    <ul>
                      {folder.tabs.map((tab, index) => (
                        <li key={index}>{tab.title}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}

      
      </ul>
    </div>
  );
}

export default App;