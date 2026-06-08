import { useLiveQuery } from "dexie-react-hooks"

import { db } from "../lib/db"

export function useCategories() {
  return useLiveQuery(() => db.getAllCategories()) ?? []
}
