# Contributing to react-offline-first

PRs welcome. Here's how to get started.

## Setup

```bash
git clone https://github.com/iamadhitya1/react-offline-first
cd react-offline-first
npm install
npm run dev
```

## Project structure

```
src/
  db/
    indexedDB.js        # async IndexedDB wrapper
  sync/
    syncEngine.js       # flush queue to API, conflict resolution
  hooks/
    useOfflineData.js   # CRUD hook — IndexedDB + auto-sync
    useOnlineStatus.js  # online/offline detection
    useSyncQueue.js     # queue count, sync trigger, last-synced
  App.jsx               # working example: offline-first todo list
public/
  sw.js                 # service worker — caches app shell
```

## What's in scope

- Bug fixes in the sync engine or IndexedDB wrapper
- New conflict resolution strategies
- Better offline UI patterns (sync status indicators, etc.)
- Support for more backend patterns (GraphQL, tRPC, etc.)
- Documentation improvements

## Guidelines

- **Zero runtime dependencies** — keep it that way
- Don't break the `useOfflineData` / `useSyncQueue` hook API
- New conflict strategies go in `syncEngine.js` alongside the existing ones
- Test offline behaviour by using Chrome DevTools → Network → Offline
- One feature or fix per PR

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature-name`
3. Make your change
4. Open a PR against `main` with a clear title and description of what changed and why

---

MIT © 2025 M Adhitya · [Rewrite Labs](https://rewritelabs.vercel.app)
