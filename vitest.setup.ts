import "@testing-library/jest-dom"
import "vitest-canvas-mock"
import "fake-indexeddb/auto"

import { vi } from "vitest"

// ==========================================
// 1. IndexedDB Mock
// ==========================================
// fake-indexeddb/auto handles this automatically

// ==========================================
// 2. URL Object URL Mock
// ==========================================
if (typeof URL.createObjectURL === "undefined") {
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:http://localhost/mock-uuid")
  })
} else {
  URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-uuid")
}

if (typeof URL.revokeObjectURL === "undefined") {
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn()
  })
} else {
  URL.revokeObjectURL = vi.fn()
}

// ==========================================
// 3. navigator.storage & navigator.language Mock
// ==========================================
Object.defineProperty(window.navigator, "storage", {
  value: {
    estimate: vi.fn().mockResolvedValue({
      usage: 1024 * 1024 * 5, // 5 MB
      quota: 1024 * 1024 * 100 // 100 MB
    })
  },
  configurable: true,
  writable: true
})

Object.defineProperty(window.navigator, "language", {
  value: "en-US",
  configurable: true,
  writable: true
})

// ==========================================
// 4. window.confirm Mock
// ==========================================
window.confirm = vi.fn().mockReturnValue(true)

// ==========================================
// 5. Chrome API Mock
// ==========================================
const chromeListeners = new Map<string, any[]>()
const addChromeListener = (event: string, fn: any) => {
  if (!chromeListeners.has(event)) {
    chromeListeners.set(event, [])
  }
  chromeListeners.get(event)!.push(fn)
}

const chromeMock = {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: vi.fn().mockResolvedValue({ status: "success" }),
    reload: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    onActivated: {
      addListener: vi.fn((fn) => addChromeListener("tabs.onActivated", fn)),
      removeListener: vi.fn((fn) => {
        const list = chromeListeners.get("tabs.onActivated") || []
        chromeListeners.set(
          "tabs.onActivated",
          list.filter((item) => item !== fn)
        )
      })
    },
    onUpdated: {
      addListener: vi.fn((fn) => addChromeListener("tabs.onUpdated", fn)),
      removeListener: vi.fn((fn) => {
        const list = chromeListeners.get("tabs.onUpdated") || []
        chromeListeners.set(
          "tabs.onUpdated",
          list.filter((item) => item !== fn)
        )
      })
    }
  },
  windows: {
    onFocusChanged: {
      addListener: vi.fn((fn) =>
        addChromeListener("windows.onFocusChanged", fn)
      ),
      removeListener: vi.fn((fn) => {
        const list = chromeListeners.get("windows.onFocusChanged") || []
        chromeListeners.set(
          "windows.onFocusChanged",
          list.filter((item) => item !== fn)
        )
      })
    }
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    lastError: undefined,
    onMessage: {
      addListener: vi.fn((fn) => addChromeListener("runtime.onMessage", fn)),
      removeListener: vi.fn((fn) => {
        const list = chromeListeners.get("runtime.onMessage") || []
        chromeListeners.set(
          "runtime.onMessage",
          list.filter((item) => item !== fn)
        )
      })
    }
  },
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn()
  }
}

global.chrome = chromeMock as any

// Helper to trigger events in tests
Object.defineProperty(global, "triggerChromeEvent", {
  value: (event: string, ...args: any[]) => {
    const list = chromeListeners.get(event) || []
    list.forEach((fn) => fn(...args))
  },
  writable: true,
  configurable: true
})

// ==========================================
// 6. Global Database Mock
// ==========================================
vi.mock("./src/lib/db", async () => {
  const { db } = await import("./tests/mocks/db")
  return { db }
})
