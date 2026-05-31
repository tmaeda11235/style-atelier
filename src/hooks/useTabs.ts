import { useState } from "react"

export type Tab = "history" | "library" | "workbench" | "settings"

export function useTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("history")

  return {
    activeTab,
    setActiveTab,
  }
}