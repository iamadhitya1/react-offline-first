# react-offline-first

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-iamadhitya1-blue?logo=github)](https://github.com/iamadhitya1)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Zero Dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

> React + Vite template for apps that work fully offline and sync when connected.

**IndexedDB · Service Worker · Sync Queue · Conflict Resolution**

Clone this. Build your app. It works offline on day one.

---

## What's included

| File | What it does |
|------|-------------|
| `src/db/indexedDB.js` | Clean async wrapper over browser IndexedDB |
| `src/sync/syncEngine.js` | Flush queue to your API, resolve conflicts |
| `src/hooks/useOfflineData.js` | CRUD hook backed by IndexedDB + auto-sync |
| `src/hooks/useOnlineStatus.js` | Tracks online/offline state |
| `src/hooks/useSyncQueue.js` | Exposes queue count, sync trigger, last-synced |
| `public/sw.js` | Service worker — caches app shell for full offline |
| `src/App.jsx` | Working example: offline-first todo list |

---

## Get started

```bash
git clone https://github.com/iamadhitya1/react-offline-first
cd react-offline-first
npm install
npm run dev
```

---

## Core hook — `useOfflineData`

```jsx
import { useOfflineData } from './hooks/useOfflineData'

function TodoList() {
  const { records, loading, add, update, remove } = useOfflineData('todos')

  const handleAdd = async () => {
    await add({ text: 'Buy milk', done: false })
    // Saved to IndexedDB instantly.
    // Queued for cloud sync. Synced when online.
  }

  return records.map(todo => <div key={todo.id}>{todo.text}</div>)
}
```

Every `add`, `update`, `remove`:
1. Writes to **IndexedDB** immediately — no waiting
2. Pushes to **sync queue**
3. Flushes to your API if online — silently queues if not
4. Auto-flushes when connection is restored

---

## Sync Engine

```js
import { configureSyncEngine } from './sync/syncEngine'

configureSyncEngine({
  apiBase: 'https://your-api.com/api',
  conflictStrategy: 'newer-wins',   // 'client-wins' | 'server-wins' | 'newer-wins' | fn
  getHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }),
  onSyncComplete: ({ synced, failed }) => {
    console.log(`Synced ${synced}, failed ${failed}`)
  },
  onConflict: ({ local, server, resolved }) => {
    console.log('Conflict resolved:', resolved)
  },
})
```

### Conflict strategies

| Strategy | Behaviour |
|----------|-----------|
| `newer-wins` | Whichever record has the higher `updatedAt` wins *(default)* |
| `client-wins` | Local change always overwrites server |
| `server-wins` | Server version replaces local on conflict |
| `(local, server) => record` | Custom function — full control |

---

## Sync status UI

```jsx
import { useSyncQueue } from './hooks/useSyncQueue'

function SyncBadge() {
  const { isOnline, pendingCount, syncing, sync } = useSyncQueue()

  return (
    <div>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
      {pendingCount > 0 && ` · ${pendingCount} unsynced`}
      {isOnline && pendingCount > 0 && (
        <button onClick={sync}>{syncing ? 'Syncing…' : 'Sync now'}</button>
      )}
    </div>
  )
}
```

---

## API contract

The sync engine expects your API to follow this pattern:

```
GET    /api/{collection}/{id}   → 200 { ...record } | 404
POST   /api/{collection}        → 201 { ...record }
PUT    /api/{collection}/{id}   → 200 { ...record }
DELETE /api/{collection}/{id}   → 204
```

Works with any backend — Express, FastAPI, Supabase Edge Functions, etc.

---

## Service Worker

The included `sw.js` caches the app shell (HTML, JS, CSS) so the app loads instantly even with no network. API calls are never cached — only the static app shell.

Registered automatically in `App.jsx`:
```js
navigator.serviceWorker.register('/sw.js')
```

---

## License

MIT © 2025 [M Adhitya](https://github.com/iamadhitya1)

Built at [Rewrite Labs](https://rewritelabs.vercel.app)
