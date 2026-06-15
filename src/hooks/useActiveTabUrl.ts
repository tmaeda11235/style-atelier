/* eslint-disable max-lines-per-function */
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
    const hasNonTargetParam = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get("nonTarget") === "true") return true
        if (window.parent && window.parent !== window) {
          const parentParams = new URLSearchParams(
            window.parent.location.search
          )
          if (parentParams.get("nonTarget") === "true") return true
        }
      } catch {
        /* ignore */
      }
      return false
    }

    if (hasNonTargetParam()) {
      setIsTargetSite(false)
      setIsLoading(false)
      return
    }

    if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) {
      setIsTargetSite(true)
      setIsLoading(false)
      return
    }

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
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
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      _tab: chrome.tabs.Tab
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
