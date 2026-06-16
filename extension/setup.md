# Create a Chrome Extension From Zero

This guide walks you through creating a Chrome Manifest V3 extension with React, TypeScript, Vite, Tailwind CSS, and CRXJS.

## Stack Overview

- **React 19**: UI framework.
- **TypeScript**: type-safe code.
- **Vite 8**: dev server and bundler.
- **@crxjs/vite-plugin**: makes Vite output a Chrome extension.
- **Tailwind CSS 4**: utility styles.
- **Chrome Extension APIs**: background worker, side panel, tabs.

## Complete Setup From Zero

### Step 1: Create a Vite React + TypeScript project

```bash
npm create vite@latest my-extension -- --template react-ts
cd my-extension
```

### Step 2: Install required packages

```bash
npm i
```

Then add CRXJS for Chrome extension support:

```bash
npm i --save-dev @crxjs/vite-plugin @types/chrome
```

Optional: add Tailwind for styling:

```bash
npm i -D @tailwindcss/vite tailwindcss
```

### Step 3: Create the manifest file

Create `manifest.config.ts` in the project root with this content:

```typescript
import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

const { version } = packageJson;

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name: "My Extension",
  version: version,
  description: "My Chrome extension",
  permissions: ["tabs", "storage", "sidePanel"],
  host_permissions: ["<all_urls>"],
  action: {
    default_title: "Click to open side panel"
  },
  side_panel: {
    default_path: "index.html"
  },
  background: {
    service_worker: "src/background.ts",
    type: "module"
  }
}));
```

**Manifest explained:**
- `manifest_version: 3`: Chrome Manifest V3 (required).
- `permissions`: allows access to tabs, storage, and the side panel.
- `host_permissions`: gives access to all websites.
- `action`: toolbar icon behavior.
- `side_panel`: defines the UI entry point.
- `background.service_worker`: the background script that runs when the extension loads.

### Step 4: Update `vite.config.ts`

Replace the existing `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
});
```

### Step 5: Create the background service worker

Create `src/background.ts`:

```typescript
// Background service worker for the Chrome extension
console.log("Background service worker initialized!");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`Tab ${tabId} was closed.`);
});
```

### Step 6: Set up Tailwind (optional)

If you added Tailwind, update `src/index.css`:

```css
@import "tailwindcss";
```

Then update your `src/App.tsx` to use Tailwind classes.

### Step 7: Run the dev server

```bash
npm run dev
```

This starts Vite. Vite will output the extension build to `dist/`.

### Step 8: Load the extension in Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the `dist/` folder from your project.

Chrome now loads your extension. Click the extension icon in the toolbar to open the side panel.

### Step 9: Build for production

When ready to release, run:

```bash
npm run build
```

This creates an optimized build in `dist/`. You can now zip `dist/` and submit it to the Chrome Web Store.

## File Structure After Setup

```
my-extension/
├─ src/
│  ├─ main.tsx       (React entry)
│  ├─ App.tsx        (Side panel UI)
│  ├─ App.css        (Component styles)
│  ├─ index.css      (Global styles, Tailwind)
│  ├─ background.ts  (Service worker)
│  └─ assets/        (Images, icons)
├─ public/
│  └─ favicon.svg
├─ index.html        (HTML shell)
├─ manifest.config.ts (Chrome extension manifest)
├─ vite.config.ts    (Vite + CRXJS setup)
├─ package.json      (Scripts and dependencies)
└─ dist/             (Build output, load this in Chrome)
```

## Key Points

- **`manifest.config.ts`**: defines permissions, UI entry, and background worker.
- **`src/background.ts`**: runs when the extension loads; controls background behavior.
- **`src/App.tsx`**: the visible side panel UI.
- **`vite.config.ts`**: wires CRXJS so Vite outputs a Chrome extension.
- **`dist/`**: the built extension ready for Chrome.

## Quick Commands

```bash
npm i                 # Install dependencies
npm run dev           # Start dev server
npm run build         # Build for production
npm run lint          # Check for errors
```

## Load in Chrome Summary

1. Run `npm run dev`.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `dist/`.
6. Extension is now installed.
