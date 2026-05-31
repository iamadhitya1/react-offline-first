/**
 * SyncEngine — processes the sync queue when the app comes online.
 *
 * Flow:
 *   1. User makes a change → saved to IndexedDB + pushed to queue
 *   2. App goes online → SyncEngine flushes queue to your API
 *   3. Conflicts resolved via configured strategy
 */

import { db, queue } from '../db/indexedDB.js'

/**
 * Conflict resolution strategies:
 *
 * 'client-wins'  — local change always overwrites server
 * 'server-wins'  — server version replaces local on conflict
 * 'newer-wins'   — whichever has the higher updatedAt timestamp wins
 * custom fn      — (localRecord, serverRecord) => resolvedRecord
 */

export class SyncEngine {
  /**
   * @param {object}          options
   * @param {string}          options.apiBase          - Base URL for your sync API
   * @param {string}          options.conflictStrategy - 'client-wins' | 'server-wins' | 'newer-wins' | fn
   * @param {function}        options.getHeaders       - Returns headers for API calls (e.g. auth)
   * @param {function}        options.onSyncStart      - Called when sync begins
   * @param {function}        options.onSyncComplete   - Called when sync finishes ({ synced, failed })
   * @param {function}        options.onConflict       - Called when a conflict is detected
   */
  constructor({
    apiBase = '',
    conflictStrategy = 'newer-wins',
    getHeaders = () => ({ 'Content-Type': 'application/json' }),
    onSyncStart = () => {},
    onSyncComplete = () => {},
    onConflict = () => {},
  } = {}) {
    this.apiBase = apiBase
    this.conflictStrategy = conflictStrategy
    this.getHeaders = getHeaders
    this.onSyncStart = onSyncStart
    this.onSyncComplete = onSyncComplete
    this.onConflict = onConflict
    this._syncing = false
  }

  /** Flush all pending queue items to the server */
  async flush() {
    if (this._syncing || !navigator.onLine) return
    this._syncing = true
    this.onSyncStart()

    const pending = await queue.getAll()
    let synced = 0, failed = 0

    for (const mutation of pending) {
      try {
        await this._processMutation(mutation)
        await queue.remove(mutation.queueId)
        synced++
      } catch (err) {
        console.warn('[sync] Failed to sync mutation:', mutation, err)
        failed++
      }
    }

    this._syncing = false
    this.onSyncComplete({ synced, failed })
    return { synced, failed }
  }

  async _processMutation(mutation) {
    const { type, collection, record } = mutation

    if (type === 'DELETE') {
      await fetch(`${this.apiBase}/${collection}/${record.id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
      return
    }

    // PUT or POST — check for conflicts
    const serverRes = await fetch(`${this.apiBase}/${collection}/${record.id}`, {
      headers: this.getHeaders(),
    })

    if (serverRes.ok) {
      const serverRecord = await serverRes.json()
      const resolved = this._resolveConflict(record, serverRecord)

      if (resolved !== record) {
        // Server wins or newer-wins chose server — update local
        this.onConflict({ local: record, server: serverRecord, resolved })
        await db.put({ ...resolved, collection })
      }

      await fetch(`${this.apiBase}/${collection}/${record.id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(resolved),
      })
    } else {
      // Record doesn't exist on server yet — create it
      await fetch(`${this.apiBase}/${collection}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(record),
      })
    }
  }

  _resolveConflict(local, server) {
    if (typeof this.conflictStrategy === 'function') {
      return this.conflictStrategy(local, server)
    }
    switch (this.conflictStrategy) {
      case 'client-wins': return local
      case 'server-wins': return server
      case 'newer-wins':
      default:
        return (local.updatedAt ?? 0) >= (server.updatedAt ?? 0) ? local : server
    }
  }
}

// Singleton instance — configure once, use everywhere
let _engine = null

export function configureSyncEngine(options) {
  _engine = new SyncEngine(options)
  return _engine
}

export function getSyncEngine() {
  if (!_engine) _engine = new SyncEngine()
  return _engine
}
