import { useEffect, useState } from "react"

export function useWebGpu() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function checkSupport() {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        if (active) setIsSupported(false)
        return
      }
      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (active) {
          setIsSupported(!!adapter)
        }
      } catch {
        if (active) setIsSupported(false)
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
