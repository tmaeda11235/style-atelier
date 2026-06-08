import { useLiveQuery } from "dexie-react-hooks"

import { getAllStyleCards, getPinnedStyleCards } from "../lib/style-card-store"

export function useStyleCards() {
  return useLiveQuery(getAllStyleCards) ?? []
}

export function usePinnedStyleCards() {
  return useLiveQuery(getPinnedStyleCards) ?? []
}
