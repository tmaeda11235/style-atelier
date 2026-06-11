import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useState } from "react"

import { db } from "../lib/db"
import type { HistoryItem } from "../lib/db-schema"

export function useHistory() {
  const [limit, setLimit] = useState(50)

  const historyItems = useLiveQuery(
    () => db.historyItems.orderBy("timestamp").reverse().limit(limit).toArray(),
    [limit]
  )

  const hasMore = useLiveQuery(async () => {
    const count = await db.historyItems.count()
    return count > limit
  }, [limit])

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + 50)
  }, [])

  const addHistoryItem = useCallback(async (item: HistoryItem) => {
    return await db.historyItems.put(item)
  }, [])

  const clearHistory = useCallback(async () => {
    return await db.historyItems.clear()
  }, [])

  const updateHistoryItem = useCallback(
    async (id: string, changes: Partial<HistoryItem>) => {
      return await db.historyItems.update(id, changes)
    },
    []
  )

  return {
    historyItems: historyItems || [],
    loadMore,
    hasMore: !!hasMore,
    addHistoryItem,
    clearHistory,
    updateHistoryItem
  }
}
