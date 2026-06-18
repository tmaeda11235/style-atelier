import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useP2PSync } from "../../../src/lib/use-p2p-sync"

// Mock submodules
vi.mock("../../../src/lib/qr-utils", () => ({
  generateQRCodeUrl: vi.fn().mockResolvedValue("data:image/png;base64,mock-qr")
}))

vi.mock("../../../src/lib/p2p-connection", () => {
  return {
    P2PConnection: class {
      close = vi.fn()
      send = vi.fn()
      constructor(params: any) {
        // Expose callbacks to simulation
        ;(global as any).__lastP2PConnectionParams = params
      }
    }
  }
})

describe("useP2PSync hook", () => {
  const mockT = {
    hostInit: "Initializing...",
    hostWaiting: "Waiting...",
    connected: "Connected",
    receiving: "Receiving...",
    sending: "Sending...",
    syncSuccess: "Success!"
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete (global as any).__lastP2PConnectionParams
  })

  it("should initialize with default states", () => {
    const { result } = renderHook(() => useP2PSync(mockT))
    expect(result.current.role).toBe("idle")
    expect(result.current.status).toBe("setup")
  })

  it("should support startHost flow", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      await result.current.startHost()
    })

    expect(result.current.role).toBe("host")
    expect(result.current.status).toBe("connecting")
    expect(result.current.qrCodeDataUrl).toBe("data:image/png;base64,mock-qr")

    // Simulate connection status change via the mock
    const params = (global as any).__lastP2PConnectionParams
    expect(params).toBeDefined()

    act(() => {
      params.onStatusChange("datachannel-open")
    })
    expect(result.current.status).toBe("connected")
    expect(result.current.statusMessage).toBe("Connected")
  })

  it("should handle host P2P Connection errors", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      await result.current.startHost()
    })

    const params = (global as any).__lastP2PConnectionParams
    act(() => {
      params.onStatusChange("connection-state-failed")
    })

    expect(result.current.status).toBe("error")
    expect(result.current.errorMessage).toBe("P2P Connection failed")
  })

  it("should support startGuestScan flow and manual URL submission", async () => {
    // Mock navigator.mediaDevices.getUserMedia
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => []
    })
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      result.current.startGuestScan()
    })

    expect(result.current.role).toBe("guest")
    expect(result.current.status).toBe("setup")
    expect(result.current.isScanning).toBe(true)

    // Simulate manual submit
    const mockPreventDefault = vi.fn()
    act(() => {
      result.current.setScanInputUrl(
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver"
      )
    })
    act(() => {
      result.current.handleManualUrlSubmit({
        preventDefault: mockPreventDefault
      } as any)
    })

    expect(mockPreventDefault).toHaveBeenCalled()
    expect(result.current.status).toBe("connecting")
  })

  it("should handle error in guest connection flow", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    act(() => {
      result.current.setScanInputUrl(
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver"
      )
    })
    act(() => {
      result.current.handleManualUrlSubmit({ preventDefault: vi.fn() } as any)
    })

    const params = (global as any).__lastP2PConnectionParams
    expect(params).toBeDefined()

    // Trigger failure
    act(() => {
      params.onStatusChange("connection-state-failed")
    })

    expect(result.current.status).toBe("error")
    expect(result.current.errorMessage).toBe(
      "P2P connection failed to establish"
    )
  })

  it("should allow resetting state", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      await result.current.startHost()
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.role).toBe("idle")
    expect(result.current.status).toBe("setup")
    expect(result.current.qrCodeDataUrl).toBeNull()
  })
})
