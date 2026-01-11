import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { Deck } from "../lib/db-schema"

export function useDecks(addLog: (msg: string) => void) {
  const [newDeckName, setNewDeckName] = useState("")
  const decks = useLiveQuery(() => db.decks.orderBy("lastUsedAt").reverse().toArray())

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: newDeckName.trim(),
      cardIds: [],
      lastUsedAt: Date.now(),
    }
    try {
      await db.decks.put(newDeck)
      addLog(`Deck "${newDeck.name}" created.`)
      setNewDeckName("")
    } catch (err) {
      console.error("Failed to create deck:", err)
      addLog("Error: Failed to create deck.")
    }
  }

  return {
    decks,
    newDeckName,
    setNewDeckName,
    handleCreateDeck,
  }
}