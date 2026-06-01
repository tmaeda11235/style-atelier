import { useEffect, useState } from "react"

const TARGET_DOMAINS = [
  "midjourney.com",
  "discord.com",
  "discordapp.com",
  "discordapp.net"
]

export function useActiveTabUrl() {
  const [isTargetSite, setIsTargetSite] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkActiveTab = async () => {
    if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
      setIsTargetSite(true)
      setIsLoading(false)
      return
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      const activeTab = tabs[0]
      if (!activeTab) {
        setIsTargetSite(false)
        return
      }

      const url = activeTab.url || activeTab.pendingUrl
      if (!url) {
        setIsTargetSite(false)
        return
      }

      const hasMatch = TARGET_DOMAINS.some((domain) => url.includes(domain))
      setIsTargetSite(hasMatch)
    } catch (error) {
      console.error("Error checking active tab URL:", error)
      setIsTargetSite(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkActiveTab()

    if (typeof chrome === "undefined" || !chrome.tabs) {
      return
    }

    const handleActivated = () => {
      checkActiveTab()
    }

    const handleUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (changeInfo.status === "complete" || changeInfo.url) {
        checkActiveTab()
      }
    }

    const handleWindowFocus = () => {
      checkActiveTab()
    }

    chrome.tabs.onActivated?.addListener(handleActivated)
    chrome.tabs.onUpdated?.addListener(handleUpdated)
    chrome.windows?.onFocusChanged?.addListener(handleWindowFocus)

    return () => {
      if (typeof chrome !== "undefined") {
        chrome.tabs?.onActivated?.removeListener(handleActivated)
        chrome.tabs?.onUpdated?.removeListener(handleUpdated)
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocus)
      }
    }
  }, [])

  return { isTargetSite, isLoading }
}
