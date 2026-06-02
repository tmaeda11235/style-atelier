import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"

export function useHistory() {
  const [limit, setLimit] = useState(50)

  const historyItems = useLiveQuery(
    () => db.historyItems.orderBy("timestamp").reverse().limit(limit).toArray(),
    [limit]
  )

  const hasMore = useLiveQuery(
    async () => {
      const count = await db.historyItems.count()
      return count > limit
    },
    [limit]
  )

  const loadMore = () => {
    setLimit((prev) => prev + 50)
  }

  return {
    historyItems,
    loadMore,
    hasMore: !!hasMore,
  }
}