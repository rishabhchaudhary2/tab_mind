import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

const { version } = packageJson;

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name: "Tab Workspace Manager",
  version: version,
  action: {
    default_title: "Click to open panel"
  },
  side_panel: {
    default_path: "index.html"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  permissions: [
    "tabs",
    "storage",
    "sidePanel"
  ],
  host_permissions: [
    "<all_urls>"
  ]
}));