import { useEffect, useRef } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"

interface UseChromeTabConnectionOptions {
  workbenchCardsDependency: string
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

async function queryActiveTab(
  addLog: (msg: string) => void
): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
    return null
  }
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const activeTab = tabs[0]
  if (!activeTab) {
    addLog("Check Connection: No active tab returned from query.")
    return null
  }
  if (!activeTab.id) {
    addLog(`Check Connection: Active tab has no ID. URL: ${activeTab.url}`)
    return null
  }
  return activeTab
}

async function pingTab(
  tabId: number,
  addLog: (msg: string) => void
): Promise<boolean> {
  addLog(`Checking connection to Tab ${tabId}...`)
  const response = await chrome.tabs.sendMessage(tabId, { type: "PING" })
  addLog(
    `Check Connection: Success! Ping response: ${JSON.stringify(response)}`
  )
  return true
}

function useConnectionMonitor(
  workbenchCardsDependency: string,
  addLogRef: React.MutableRefObject<((msg: string) => void) | undefined>,
  setAlertTypeRef: React.MutableRefObject<(type: AlertType | null) => void>
) {
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    let timerId: any = null
    let isCancelled = false

    const checkConnection = async () => {
      if (isCancelled) return
      try {
        const log = (msg: string) => addLogRef.current?.(msg)
        const activeTab = await queryActiveTab(log)
        if (!activeTab || isCancelled) return

        if (activeTab.status !== "complete") {
          log(
            `Check Connection: Tab is still loading (status: ${activeTab.status}). Retrying in 1s...`
          )
          timerId = setTimeout(checkConnection, 1000)
          return
        }

        await pingTab(activeTab.id!, log)
        if (isCancelled) return
        setAlertTypeRef.current(null)
      } catch (err: any) {
        if (isCancelled) return
        console.log("Connection check failed:", err)
        addLogRef.current?.(
          `Connection check failed (attempt ${retryCount + 1}/${maxRetries}): ${err?.message || JSON.stringify(err)}`
        )

        if (retryCount < maxRetries) {
          retryCount++
          timerId = setTimeout(checkConnection, 1500)
        } else {
          setAlertTypeRef.current("disconnected")
        }
      }
    }

    checkConnection()

    return () => {
      isCancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }, [workbenchCardsDependency, addLogRef, setAlertTypeRef])
}

export function useChromeTabConnection({
  workbenchCardsDependency,
  setAlertType,
  addLog
}: UseChromeTabConnectionOptions) {
  const addLogRef = useRef(addLog)
  const setAlertTypeRef = useRef(setAlertType)

  useEffect(() => {
    addLogRef.current = addLog
    setAlertTypeRef.current = setAlertType
  }, [addLog, setAlertType])

  useConnectionMonitor(workbenchCardsDependency, addLogRef, setAlertTypeRef)
}
