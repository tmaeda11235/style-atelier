/* eslint-disable max-lines-per-function */
import { useCallback, useEffect, useState } from "react"

import { isExtensionContextValid, safeQueryTabs } from "../lib/chrome-utils"

const TARGET_DOMAINS = [
  "midjourney.com",
  "discord.com",
  "discordapp.com",
  "discordapp.net"
]

function isDomainTarget(url: string | undefined): boolean {
  if (!url) return false
  return TARGET_DOMAINS.some((domain) => url.includes(domain))
}

function useTabUrlListener(onTrigger: () => void) {
  useEffect(() => {
    if (!isExtensionContextValid()) {
      return
    }

    const handleActivated = () => onTrigger()
    const handleUpdated = (_tabId: number, changeInfo: any) => {
      if (changeInfo.status === "complete" || changeInfo.url) {
        onTrigger()
      }
    }
    const handleWindowFocus = () => onTrigger()

    try {
      chrome.tabs.onActivated?.addListener(handleActivated)
      chrome.tabs.onUpdated?.addListener(handleUpdated)
      chrome.windows?.onFocusChanged?.addListener(handleWindowFocus)
    } catch (e) {
      console.warn("Failed to add tab listeners:", e)
    }

    return () => {
      try {
        chrome.tabs?.onActivated?.removeListener(handleActivated)
        chrome.tabs?.onUpdated?.removeListener(handleUpdated)
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocus)
      } catch {
        // ignore
      }
    }
  }, [onTrigger])
}

export function useActiveTabUrl() {
  const [isTargetSite, setIsTargetSite] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkActiveTab = useCallback(async () => {
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

    if (!isExtensionContextValid()) {
      setIsTargetSite(true)
      setIsLoading(false)
      return
    }

    try {
      const tabs = await safeQueryTabs({
        active: true,
        currentWindow: true
      })
      const activeTab = tabs?.[0]
      if (!activeTab) {
        setIsTargetSite(false)
        return
      }

      const url = activeTab.url || activeTab.pendingUrl
      setIsTargetSite(isDomainTarget(url))
    } catch (error) {
      console.error("Error checking active tab URL:", error)
      setIsTargetSite(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkActiveTab()
  }, [checkActiveTab])

  useTabUrlListener(checkActiveTab)

  return { isTargetSite, isLoading }
}
