import { useState } from "react"

export type Tab = "history" | "library" | "workbench"

export function useTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("history")

  return {
    activeTab,
    setActiveTab,
  }
}