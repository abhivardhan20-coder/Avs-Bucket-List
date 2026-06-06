---
name: react-window Vite cache after version change
description: Vite pre-bundles deps; changing react-window version without clearing cache serves stale exports
---

## Rule
After installing a different version of react-window (or any pre-bundled dep), always run `rm -rf artifacts/<app>/node_modules/.vite` and restart the workflow, or Vite will keep serving the old cached bundle.

**Why:** Vite's `optimizeDeps` pre-bundles packages into `node_modules/.vite/deps/`. When you install a new version of a package without clearing this cache, Vite continues serving the old bundle — causing "does not provide an export named X" runtime errors even though the correct package is installed.

**How to apply:** Any time a package is swapped or its version changed significantly, clear `node_modules/.vite` in the artifact directory before restarting the dev server.
