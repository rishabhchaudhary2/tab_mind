# Repo Snapshot

This workspace is a Chrome extension app. The actual project lives in `extension/`; the root mostly contains a short template README and this notes file.

## Tech Stack

- React 19 for the UI
- TypeScript for app and build-time typing
- Vite 8 as the dev server and bundler
- `@crxjs/vite-plugin` for Chrome Extension Manifest V3 support
- Tailwind CSS 4 for utility styling
- ESLint with React and TypeScript rules
- Chrome Extension APIs for the background worker and side panel
- Zustand is installed, but not yet used in the current source files

## Initial Structure

```text
tab_workspace/
├─ README.md
├─ initial_doc.md
└─ extension/
	├─ package.json
	├─ vite.config.ts
	├─ manifest.config.ts
	├─ eslint.config.js
	├─ tsconfig.json
	├─ tsconfig.app.json
	├─ tsconfig.node.json
	├─ index.html
	├─ public/
	│  ├─ favicon.svg
	│  └─ icons.svg
	└─ src/
		├─ main.tsx
		├─ App.tsx
		├─ App.css
		├─ index.css
		├─ assets/
		└─ background/
			└─ index.ts
```

## File Roles

- `extension/package.json`: project scripts and dependencies.
- `extension/vite.config.ts`: Vite setup; wires React, Tailwind, and CRXJS.
- `extension/manifest.config.ts`: Chrome MV3 manifest definition, permissions, side panel, and background worker entry.
- `extension/index.html`: HTML shell used by Vite to mount the React app.
- `extension/src/main.tsx`: React entry point that mounts `App` into `#root`.
- `extension/src/App.tsx`: current side panel UI; still the default Vite starter screen.
- `extension/src/App.css`: component-level styles for the starter UI.
- `extension/src/index.css`: global styles; imports Tailwind.
- `extension/src/background/index.ts`: Chrome extension service worker; enables side panel on toolbar click and logs tab closes.
- `extension/public/favicon.svg`: tab icon.
- `extension/public/icons.svg`: shared SVG sprite used by the starter UI.
- `extension/eslint.config.js`: lint rules and ignored output folder.
- `extension/tsconfig.json`: TypeScript project references.
- `extension/tsconfig.app.json`: TypeScript settings for the browser app source.
- `extension/tsconfig.node.json`: TypeScript settings for Vite config files.
- `extension/pnpm-lock.yaml`: pnpm lockfile for dependency resolution.
- `extension/package-lock.json`: npm lockfile created by the recent install.

## Notes

- The app is currently a starter template, not the final tab workspace UI.
- `extension/dist/` is build output and should be treated as generated files.
- `README.md` is still the generic Vite starter README and does not describe the app yet.
