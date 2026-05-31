import { useState, useEffect } from 'react'
import { useOfflineData } from './hooks/useOfflineData.js'
import { useSyncQueue } from './hooks/useSyncQueue.js'
import { configureSyncEngine } from './sync/syncEngine.js'

// Configure sync engine once — point to your API
configureSyncEngine({
  apiBase: '/api',                              // ← replace with your API URL
  conflictStrategy: 'newer-wins',
  getHeaders: () => ({ 'Content-Type': 'application/json' }),
  onSyncComplete: ({ synced }) => {
    if (synced > 0) console.log(`[sync] ${synced} changes synced`)
  },
})

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// ── Status Bar ─────────────────────────────────────────────────────────────────
function SyncStatus() {
  const { isOnline, pendingCount, syncing, sync, lastSynced } = useSyncQueue()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: isOnline ? '#0d1a0d' : '#1a0d0d',
      borderBottom: `1px solid ${isOnline ? '#1a3a1a' : '#3a1a1a'}`,
      fontSize: 12,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: isOnline ? '#52B788' : '#f06060',
        flexShrink: 0,
      }} />
      <span style={{ color: isOnline ? '#52B788' : '#f06060' }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {pendingCount > 0 && (
        <span style={{ color: '#F0B429', marginLeft: 4 }}>
          · {pendingCount} unsynced {syncing ? '(syncing…)' : ''}
        </span>
      )}
      {isOnline && pendingCount > 0 && !syncing && (
        <button onClick={sync} style={{
          marginLeft: 'auto', fontSize: 11, color: '#52B788',
          background: 'none', border: '1px solid #1a3a1a',
          borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
        }}>
          Sync now
        </button>
      )}
      {lastSynced && pendingCount === 0 && (
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)' }}>
          Last synced {new Date(lastSynced).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

// ── Example App: Offline Todo List ─────────────────────────────────────────────
export default function App() {
  const { records: todos, loading, add, update, remove } = useOfflineData('todos')
  const [input, setInput] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    await add({ text: input.trim(), done: false })
    setInput('')
  }

  const toggleDone = (todo) => update({ ...todo, done: !todo.done })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f0a', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <SyncStatus />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Offline-First Todo</h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 24 }}>
          Works offline. Syncs when connected. Built with react-offline-first.
        </p>

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a task…"
            style={{
              flex: 1, background: '#111a11', border: '1px solid #1e3a1e',
              borderRadius: 10, padding: '10px 14px', color: '#fff',
              fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" style={{
            background: '#52B788', color: '#000', fontWeight: 600,
            border: 'none', borderRadius: 10, padding: '10px 18px',
            cursor: 'pointer', fontSize: 14,
          }}>
            Add
          </button>
        </form>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Loading…</p>
        ) : todos.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 32 }}>No tasks yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todos.map(todo => (
              <div key={todo.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#111a11', border: '1px solid #1e3a1e',
                borderRadius: 12, padding: '12px 16px',
              }}>
                <button onClick={() => toggleDone(todo)} style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: '2px solid', flexShrink: 0, cursor: 'pointer',
                  borderColor: todo.done ? '#52B788' : '#2a4a2a',
                  background: todo.done ? '#52B788' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {todo.done && <span style={{ color: '#000', fontSize: 11 }}>✓</span>}
                </button>
                <span style={{
                  flex: 1, fontSize: 14,
                  color: todo.done ? 'rgba(255,255,255,0.3)' : '#fff',
                  textDecoration: todo.done ? 'line-through' : 'none',
                }}>
                  {todo.text}
                </span>
                <button onClick={() => remove(todo.id)} style={{
                  background: 'none', border: 'none', color: '#2a4a2a',
                  cursor: 'pointer', fontSize: 16, padding: 4,
                }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
