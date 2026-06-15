import { useEffect, useState } from "react"

let cachedHasWebGpu: boolean | null = null

/**
 * Hook to check if WebGPU is supported in the current environment.
 * Detects whether the navigator.gpu API is available and if an adapter can be successfully requested.
 */
export function useWebGpuCheck() {
  const [hasWebGpu, setHasWebGpu] = useState<boolean | null>(cachedHasWebGpu)

  useEffect(() => {
    // If mock configuration is active, bypass real check to allow testing WebGPU fallback vs success paths
    if (typeof window !== "undefined" && (window as any).mockWebLlmConfig) {
      const mockConfig = (window as any).mockWebLlmConfig
      const isSupported = mockConfig.supportWebGpu !== false
      setHasWebGpu(isSupported)
      return
    }

    if (cachedHasWebGpu !== null) {
      setHasWebGpu(cachedHasWebGpu)
      return
    }

    let active = true

    async function checkWebGpu() {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        cachedHasWebGpu = false
        if (active) setHasWebGpu(false)
        return
      }
      try {
        const adapter = await navigator.gpu.requestAdapter()
        const isSupported = !!adapter
        cachedHasWebGpu = isSupported
        if (active) setHasWebGpu(isSupported)
      } catch (e) {
        cachedHasWebGpu = false
        if (active) setHasWebGpu(false)
      }
    }

    checkWebGpu()

    return () => {
      active = false
    }
  }, [])

  return {
    hasWebGpu,
    isChecking: hasWebGpu === null
  }
}
