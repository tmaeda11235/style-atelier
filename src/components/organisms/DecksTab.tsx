import React from "react"
import { useDecks } from "../../hooks/useDecks"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { DeckCard } from "../molecules/DeckCard"

interface DecksTabProps {
  addLog: (msg: string) => void
}

export function DecksTab({ addLog }: DecksTabProps) {
  const { decks, newDeckName, setNewDeckName, handleCreateDeck } = useDecks(addLog)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder="New deck name..."
          className="flex-grow"
        />
        <Button onClick={handleCreateDeck}>Create</Button>
      </div>
      {decks?.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  )
}