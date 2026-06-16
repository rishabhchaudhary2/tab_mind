// src/App.tsx
import { useEffect, useState } from 'react';

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);

  const tabsList = tabs.map((tab) => (
    <li key={tab.id}>{tab.title || tab.url || 'Unnamed Tab'}</li>
  ));

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      setTabs(tabs);
    });
  }, []);

  return (
    <div>
      <h1>Open Tabs</h1>
      <ul>
        {tabsList}
      </ul>
    </div>
  );
}

export default App;