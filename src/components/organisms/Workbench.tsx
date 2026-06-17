import React, { useEffect } from "react"

import { type AlertType } from "../molecules/ConnectionAlert"
import { useWorkbenchCore } from "./useWorkbenchCore"
import { WorkbenchView } from "./WorkbenchView"

interface WorkbenchProps {
  onStartVariationMinting?: (base: any) => void
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const data = useWorkbenchCore(props)
  const { undo, redo } = data

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase()
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          activeEl.getAttribute("contenteditable") === "true"
        ) {
          // Allow Undo/Redo shortcuts for slider inputs (type range) but ignore for text editing inputs
          if ((activeEl as HTMLInputElement).type !== "range") {
            return
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault()
          if (e.shiftKey) {
            redo()
          } else {
            undo()
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [undo, redo])

  return <WorkbenchView {...data} addLog={props.addLog} />
}
