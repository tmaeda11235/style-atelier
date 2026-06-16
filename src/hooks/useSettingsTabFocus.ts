import React from "react"

export function useSettingsTabFocus(
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const focusSection = (window as any).__focusSettingsSection
    if (!focusSection) return
    ;(window as any).__focusSettingsSection = null

    if (focusSection === "maintenance") {
      setOpenSections((prev) => ({ ...prev, maintenance: true }))
      setTimeout(() => {
        const el = document.getElementById("storage-manager-section-wrapper")
        const button = document.getElementById("settings-accordion-maintenance")
        const target = el || button
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
    } else if (focusSection === "webllm") {
      setOpenSections((prev) => ({ ...prev, webllm: true }))
      setTimeout(() => {
        const el = document.getElementById("webllm-settings-section-wrapper")
        const button = document.getElementById("settings-accordion-webllm")
        const target = el || button
        target?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
    }
  }, [setOpenSections])
}
