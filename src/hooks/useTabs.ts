import { useState } from "react"

type Tab = "history" | "library" | "decks"

export function useTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("history")

  return {
    activeTab,
    setActiveTab,
  }
}