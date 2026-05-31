import { useState, useEffect, useCallback } from 'react'
import { queue } from '../db/indexedDB.js'
import { getSyncEngine } from '../sync/syncEngine.js'
import { useOnlineStatus } from './useOnlineStatus.js'

/**
 * useSyncQueue — exposes sync queue state and manual sync trigger.
 *
 * @returns {object}
 *   pendingCount — number of unsynced mutations
 *   syncing      — true while sync is in progress
 *   isOnline     — current network status
 *   sync         — () => Promise — manually trigger a sync
 *   lastSynced   — timestamp of last successful sync (or null)
 */
export function useSyncQueue() {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const refreshCount = useCallback(async () => {
    const count = await queue.count()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 3000)
    return () => clearInterval(interval)
  }, [refreshCount])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      sync()
    }
  }, [isOnline])

  const sync = useCallback(async () => {
    if (syncing || !isOnline) return
    setSyncing(true)
    try {
      const engine = getSyncEngine()
      engine.onSyncComplete = ({ synced }) => {
        if (synced > 0) setLastSynced(Date.now())
      }
      await engine.flush()
      await refreshCount()
    } finally {
      setSyncing(false)
    }
  }, [syncing, isOnline, refreshCount])

  return { pendingCount, syncing, isOnline, sync, lastSynced }
}
