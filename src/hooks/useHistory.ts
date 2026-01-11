import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"

export function useHistory() {
  const historyItems = useLiveQuery(() => db.historyItems.orderBy("timestamp").reverse().toArray())

  return {
    historyItems,
  }
}