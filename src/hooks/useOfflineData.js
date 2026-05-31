import { useState, useEffect, useCallback } from 'react'
import { db, queue } from '../db/indexedDB.js'
import { getSyncEngine } from '../sync/syncEngine.js'

/**
 * useOfflineData — full CRUD for a collection backed by IndexedDB.
 * Changes are saved locally instantly and queued for cloud sync.
 *
 * @param {string} collection - Name of the data collection (e.g. 'todos')
 *
 * @returns {object}
 *   records  — array of all records in the collection
 *   loading  — true while initial load is happening
 *   add      — (record) => Promise — create a record
 *   update   — (record) => Promise — update a record
 *   remove   — (id) => Promise     — delete a record
 *   reload   — () => Promise       — manually refresh from IndexedDB
 */
export function useOfflineData(collection) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const all = await db.getAll(collection)
    setRecords(all.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)))
  }, [collection])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  // Attempt sync when component mounts (if online)
  useEffect(() => {
    if (navigator.onLine) {
      getSyncEngine().flush().then(reload).catch(() => {})
    }
  }, [reload])

  const add = useCallback(async (data) => {
    const record = {
      id: data.id ?? crypto.randomUUID(),
      collection,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.put(record)
    await queue.push({ type: 'PUT', collection, record })
    await reload()
    if (navigator.onLine) getSyncEngine().flush().catch(() => {})
    return record
  }, [collection, reload])

  const update = useCallback(async (data) => {
    const existing = await db.get(data.id)
    const record = { ...existing, ...data, collection, updatedAt: Date.now() }
    await db.put(record)
    await queue.push({ type: 'PUT', collection, record })
    await reload()
    if (navigator.onLine) getSyncEngine().flush().catch(() => {})
    return record
  }, [collection, reload])

  const remove = useCallback(async (id) => {
    const record = await db.get(id)
    await db.delete(id)
    await queue.push({ type: 'DELETE', collection, record: { id } })
    await reload()
    if (navigator.onLine) getSyncEngine().flush().catch(() => {})
  }, [collection, reload])

  return { records, loading, add, update, remove, reload }
}
