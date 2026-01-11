import React from "react"
import { useDecks } from "../../hooks/useDecks"

interface DecksTabProps {
  addLog: (msg: string) => void
}

export function DecksTab({ addLog }: DecksTabProps) {
  const { decks, newDeckName, setNewDeckName, handleCreateDeck } = useDecks(addLog)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder="New deck name..."
          className="flex-grow p-2 border rounded-md text-sm"
        />
        <button
          onClick={handleCreateDeck}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium"
        >
          Create
        </button>
      </div>
      {decks?.map((deck) => (
        <div key={deck.id} className="bg-white p-3 border rounded-lg shadow-sm">
          <h3 className="font-bold text-slate-800">{deck.name}</h3>
          <p className="text-xs text-slate-500 mt-1">{deck.cardIds.length} cards</p>
        </div>
      ))}
    </div>
  )
}