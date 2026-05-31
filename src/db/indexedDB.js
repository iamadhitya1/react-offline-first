/**
 * IndexedDB wrapper — clean async API over the browser's IndexedDB.
 * No external dependencies. Works in all modern browsers.
 */

const DB_NAME = 'offline-first-db'
const DB_VERSION = 1

// Store names
export const STORES = {
  DATA: 'data',       // your app's actual records
  QUEUE: 'sync_queue' // pending mutations to sync
}

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Main data store — keyed by record id
      if (!db.objectStoreNames.contains(STORES.DATA)) {
        const store = db.createObjectStore(STORES.DATA, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('collection', 'collection', { unique: false })
      }

      // Sync queue store — keyed by auto-increment
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queue = db.createObjectStore(STORES.QUEUE, {
          keyPath: 'queueId',
          autoIncrement: true,
        })
        queue.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = (e) => { _db = e.target.result; resolve(_db) }
    request.onerror = (e) => reject(e.target.error)
  })
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  })
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Data Store ─────────────────────────────────────────────────────────────────

export const db = {
  /** Get all records in a collection */
  async getAll(collection) {
    const store = await tx(STORES.DATA)
    const index = store.index('collection')
    return promisify(index.getAll(collection))
  },

  /** Get a single record by id */
  async get(id) {
    const store = await tx(STORES.DATA)
    return promisify(store.get(id))
  },

  /** Insert or update a record */
  async put(record) {
    const store = await tx(STORES.DATA, 'readwrite')
    const now = Date.now()
    const full = { ...record, updatedAt: record.updatedAt ?? now }
    return promisify(store.put(full))
  },

  /** Delete a record by id */
  async delete(id) {
    const store = await tx(STORES.DATA, 'readwrite')
    return promisify(store.delete(id))
  },

  /** Clear all records in a collection */
  async clearCollection(collection) {
    const all = await db.getAll(collection)
    const store = await tx(STORES.DATA, 'readwrite')
    return Promise.all(all.map(r => promisify(store.delete(r.id))))
  },
}

// ── Sync Queue ─────────────────────────────────────────────────────────────────

export const queue = {
  /** Add a mutation to the sync queue */
  async push(mutation) {
    const store = await tx(STORES.QUEUE, 'readwrite')
    return promisify(store.add({ ...mutation, createdAt: Date.now() }))
  },

  /** Get all pending mutations */
  async getAll() {
    const store = await tx(STORES.QUEUE)
    return promisify(store.getAll())
  },

  /** Remove a mutation from the queue after successful sync */
  async remove(queueId) {
    const store = await tx(STORES.QUEUE, 'readwrite')
    return promisify(store.delete(queueId))
  },

  /** Clear all pending mutations */
  async clear() {
    const store = await tx(STORES.QUEUE, 'readwrite')
    return promisify(store.clear())
  },

  /** Count pending mutations */
  async count() {
    const store = await tx(STORES.QUEUE)
    return promisify(store.count())
  },
}
