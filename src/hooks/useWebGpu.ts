import { useEffect, useState } from "react"

import { checkWebGpuSupport } from "../lib/gpu-utils"

export function useWebGpu() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function checkSupport() {
      const supported = await checkWebGpuSupport()
      if (active) {
        setIsSupported(supported)
      }
    }
    checkSupport()
    return () => {
      active = false
    }
  }, [])

  const openChromeSettings = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: "chrome://settings/system" })
    } else {
      try {
        navigator.clipboard.writeText("chrome://settings/system")
      } catch {
        // Ignore clipboard issues
      }
    }
  }

  return { isSupported, openChromeSettings }
}
