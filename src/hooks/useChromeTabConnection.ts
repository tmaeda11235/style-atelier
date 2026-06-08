import { useEffect, useRef } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"

interface UseChromeTabConnectionOptions {
  workbenchCardsDependency: string
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

/**
 * Custom hook to monitor connection with Chrome tabs (Content Script)
 * and trigger alert state or log status.
 */
export function useChromeTabConnection({
  workbenchCardsDependency,
  setAlertType,
  addLog
}: UseChromeTabConnectionOptions) {
  // Use refs to avoid re-triggering the useEffect hook when functions change
  const addLogRef = useRef(addLog)
  const setAlertTypeRef = useRef(setAlertType)

  // Keep refs updated with latest function references
  useEffect(() => {
    addLogRef.current = addLog
    setAlertTypeRef.current = setAlertType
  }, [addLog, setAlertType])

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    let timerId: any = null
    let isCancelled = false

    const checkConnection = async () => {
      if (isCancelled) return
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        const activeTab = tabs[0]
        if (isCancelled) return
        if (!activeTab) {
          addLogRef.current?.(
            "Check Connection: No active tab returned from query."
          )
          return
        }
        if (!activeTab.id) {
          addLogRef.current?.(
            `Check Connection: Active tab has no ID. URL: ${activeTab.url}`
          )
          return
        }

        // If the tab is still loading, wait and retry
        if (activeTab.status !== "complete") {
          addLogRef.current?.(
            `Check Connection: Tab is still loading (status: ${activeTab.status}). Retrying in 1s...`
          )
          timerId = setTimeout(checkConnection, 1000)
          return
        }

        addLogRef.current?.(
          `Checking connection to Tab ${activeTab.id} (${activeTab.url})...`
        )
        // Simple PING to check if content script is alive
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          type: "PING"
        })
        if (isCancelled) return
        addLogRef.current?.(
          `Check Connection: Success! Ping response: ${JSON.stringify(response)}`
        )
        setAlertTypeRef.current(null)
      } catch (err: any) {
        if (isCancelled) return
        console.log("Connection check failed:", err)
        addLogRef.current?.(
          `Connection check failed (attempt ${retryCount + 1}/${maxRetries}): ${err?.message || JSON.stringify(err)}`
        )

        if (retryCount < maxRetries) {
          retryCount++
          timerId = setTimeout(checkConnection, 1500) // Wait 1.5s and retry
        } else {
          setAlertTypeRef.current("disconnected")
        }
      }
    }

    checkConnection()

    return () => {
      isCancelled = true
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [workbenchCardsDependency])
}
