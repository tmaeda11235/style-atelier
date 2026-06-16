import { checkWebGpuSupport } from "../../lib/gpu-utils"
import { getStorageEstimate } from "../../lib/storage-utils"

export const mockState = {
  webGpuUnsupported: false,
  quotaExceeded: false,
  corrupted: false
}

const originalGpu = navigator.gpu
let originalEstimate: any = null
if (navigator.storage) {
  originalEstimate = navigator.storage.estimate?.bind(navigator.storage)
}

export async function initHarnessCache(
  mswStatus: HTMLElement,
  log: (msg: string, isError?: boolean) => void
) {
  try {
    const { worker } = await import("../../mocks/browser")
    await worker.start({
      serviceWorker: {
        url: "/assets/mockServiceWorker.js",
        options: {
          scope: "/"
        }
      },
      onUnhandledRequest: "bypass"
    })
    mswStatus.textContent = "Active"
    mswStatus.className = "status-badge active"
    log("Mock Service Worker started. Local cache redirect enabled.")
  } catch (err: any) {
    mswStatus.textContent = "Failed"
    mswStatus.className = "status-badge failed"
    log(`Failed to start Mock Service Worker: ${err.message}`, true)
  }
}

function setupWebgpuToggle(
  toggle: HTMLInputElement,
  log: (msg: string, isError?: boolean) => void,
  updateWebGpuStatus: () => void
) {
  toggle.addEventListener("change", (e) => {
    mockState.webGpuUnsupported = (e.target as HTMLInputElement).checked
    if (mockState.webGpuUnsupported) {
      if (navigator.gpu) {
        Object.defineProperty(navigator, "gpu", {
          value: undefined,
          writable: true,
          configurable: true
        })
      }
      log("WebGPU mocked as NOT supported.")
    } else {
      Object.defineProperty(navigator, "gpu", {
        value: originalGpu,
        writable: true,
        configurable: true
      })
      log("WebGPU restored to native support status.")
    }
    updateWebGpuStatus()
  })
}

function setupQuotaToggle(
  toggle: HTMLInputElement,
  log: (msg: string, isError?: boolean) => void,
  updateStorageEstimate: () => void
) {
  toggle.addEventListener("change", (e) => {
    mockState.quotaExceeded = (e.target as HTMLInputElement).checked
    if (mockState.quotaExceeded) {
      if (navigator.storage) {
        Object.defineProperty(navigator.storage, "estimate", {
          value: async () => ({
            usage: 100 * 1024 * 1024 * 1024,
            quota: 100 * 1024 * 1024 * 1024
          }),
          writable: true,
          configurable: true
        })
      }
      log("OPFS Quota mocked as EXCEEDED (Free space: 0 Bytes).")
    } else {
      if (navigator.storage) {
        Object.defineProperty(navigator.storage, "estimate", {
          value: originalEstimate,
          writable: true,
          configurable: true
        })
      }
      log("OPFS Storage Estimate restored.")
    }
    updateStorageEstimate()
  })
}

export function setupMockListeners(
  log: (msg: string, isError?: boolean) => void,
  updateWebGpuStatus: () => void,
  updateStorageEstimate: () => void
) {
  const mockWebgpuToggle = document.getElementById(
    "mock-webgpu-toggle"
  ) as HTMLInputElement
  const mockQuotaToggle = document.getElementById(
    "mock-quota-toggle"
  ) as HTMLInputElement
  const mockCorruptToggle = document.getElementById(
    "mock-corrupt-toggle"
  ) as HTMLInputElement

  if (mockWebgpuToggle) {
    setupWebgpuToggle(mockWebgpuToggle, log, updateWebGpuStatus)
  }
  if (mockQuotaToggle) {
    setupQuotaToggle(mockQuotaToggle, log, updateStorageEstimate)
  }
  if (mockCorruptToggle) {
    mockCorruptToggle.addEventListener("change", (e) => {
      mockState.corrupted = (e.target as HTMLInputElement).checked
      log(
        `Model corruption mock: ${mockState.corrupted ? "ENABLED" : "DISABLED"}`
      )
    })
  }
}
