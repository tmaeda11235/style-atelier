import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useP2PSync } from "../../../src/lib/use-p2p-sync"

// Mock submodules
vi.mock("../../../src/lib/qr-utils", () => ({
  generateQRCodeUrl: vi.fn().mockResolvedValue("data:image/png;base64,mock-qr")
}))

vi.mock("jsqr", () => ({
  default: vi.fn()
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

vi.mock("../../../src/lib/p2p-sync-manager", () => ({
  decryptSyncData: vi.fn().mockImplementation(async (data) => {
    if (data === "enc-image-list") {
      return JSON.stringify({ type: "RELAY_IMAGE_LIST", files: [] })
    }
    if (data === "enc-sync-complete") {
      return JSON.stringify({ type: "RELAY_SYNC_COMPLETE" })
    }
    if (data === "enc-req-image-list") {
      return JSON.stringify({ type: "RELAY_REQ_IMAGE_LIST" })
    }
    if (data === "enc-req-images") {
      return JSON.stringify({ type: "RELAY_REQ_IMAGES", missingFiles: [] })
    }
    return JSON.stringify({ cards: [], categories: [] })
  }),
  mergeIncomingSyncData: vi
    .fn()
    .mockResolvedValue({ success: true, cardsCount: 5, categoriesCount: 2 }),
  prepareOutgoingSyncData: vi
    .fn()
    .mockResolvedValue(JSON.stringify({ cards: [], categories: [] })),
  encryptSyncData: vi.fn().mockImplementation(async (data) => {
    if (data.includes("RELAY_REQ_IMAGE_LIST")) return "enc-req-image-list"
    if (data.includes("RELAY_IMAGE_LIST")) return "enc-image-list"
    if (data.includes("RELAY_REQ_IMAGES")) return "enc-req-images"
    if (data.includes("RELAY_SYNC_COMPLETE")) return "enc-sync-complete"
    return "mock-encrypted-payload"
  }),
  scanLocalImages: vi.fn().mockResolvedValue(undefined),
  getLocalImagesMetadata: vi.fn().mockResolvedValue([]),
  saveIncomingImage: vi.fn().mockResolvedValue(undefined),
  readOpfsFileAsBlob: vi.fn().mockResolvedValue(new Blob())
}))

vi.mock("../../../src/lib/db/migration-helpers", () => ({
  computeHash: vi.fn().mockResolvedValue("mock-hash"),
  listOpfsFiles: vi.fn().mockResolvedValue([])
}))

// Mock navigator.storage
if (typeof global.navigator === "undefined") {
  ;(global as any).navigator = {}
}
const mockGetDirectory = vi.fn().mockResolvedValue({
  getDirectoryHandle: vi.fn().mockResolvedValue({
    getFileHandle: vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      }),
      getFile: vi.fn().mockResolvedValue(new Blob())
    })
  })
})
Object.defineProperty(global.navigator, "storage", {
  value: { getDirectory: mockGetDirectory },
  writable: true,
  configurable: true
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

    expect(result.current.status).toBe("relay-connecting")
  })

  it("should handle host onMessageReceived and merge successfully", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      await result.current.startHost()
    })

    const params = (global as any).__lastP2PConnectionParams
    expect(params).toBeDefined()

    await act(async () => {
      await params.onMessageReceived("mock-encrypted-data")
    })

    expect(result.current.status).toBe("syncing")

    await act(async () => {
      await params.onMessageReceived(JSON.stringify({ type: "SYNC_COMPLETE" }))
    })

    expect(result.current.status).toBe("success")
    expect(result.current.processedCount.cards).toBe(5)
    expect(result.current.processedCount.categories).toBe(2)
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
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver%3FroomId%3Droom1"
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

  it("should handle guest datachannel-open and encrypt/send local data successfully", async () => {
    const { getLocalImagesMetadata } =
      await import("../../../src/lib/p2p-sync-manager")
    vi.mocked(getLocalImagesMetadata).mockResolvedValueOnce([
      { filePath: "test-image.png", hash: "mock-hash-123" }
    ])

    const { result } = renderHook(() => useP2PSync(mockT))

    act(() => {
      result.current.setScanInputUrl(
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver%3FroomId%3Droom1"
      )
    })
    act(() => {
      result.current.handleManualUrlSubmit({ preventDefault: vi.fn() } as any)
    })

    const params = (global as any).__lastP2PConnectionParams
    expect(params).toBeDefined()

    await act(async () => {
      await params.onStatusChange("datachannel-open")
    })

    expect(result.current.status).toBe("syncing")

    await act(async () => {
      await params.onMessageReceived(
        JSON.stringify({
          type: "DIFF_CHECK_RESPONSE",
          missingFiles: []
        })
      )
    })

    expect(result.current.status).toBe("success")
  })

  it("should handle error in guest connection flow", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"))
    global.fetch = fetchMock

    const { result } = renderHook(() => useP2PSync(mockT))

    act(() => {
      result.current.setScanInputUrl(
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver%3FroomId%3Droom1"
      )
    })
    act(() => {
      result.current.handleManualUrlSubmit({ preventDefault: vi.fn() } as any)
    })

    const params = (global as any).__lastP2PConnectionParams
    expect(params).toBeDefined()

    // Trigger failure and wait for async fallback to execute and fail fetch
    await act(async () => {
      params.onStatusChange("connection-state-failed")
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(result.current.status).toBe("error")
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

  it("should handle camera access denied errors", async () => {
    // Mock navigator.mediaDevices.getUserMedia to throw an error
    const mockGetUserMedia = vi
      .fn()
      .mockRejectedValue(new Error("Camera blocked"))
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      result.current.startGuestScan()
    })

    expect(result.current.isScanning).toBe(false)
  })

  it("should handle QR url parsing errors on manual submission", async () => {
    const { result } = renderHook(() => useP2PSync(mockT))

    act(() => {
      result.current.setScanInputUrl("invalid-url-not-a-link")
    })
    act(() => {
      result.current.handleManualUrlSubmit({ preventDefault: vi.fn() } as any)
    })

    expect(result.current.status).toBe("error")
    expect(result.current.errorMessage).toContain("Failed to parse QR Code")
  })

  it("should scan QR frame and decode URL successfully using fake timers", async () => {
    vi.useFakeTimers()

    // Mock jsqr return value
    const mockJsQR = (await import("jsqr")).default as any
    mockJsQR.mockReturnValue({
      data: "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver%3FroomId%3Droom1"
    })

    // Mock getUserMedia
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => []
    })
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useP2PSync(mockT))

    // Assign mock video and canvas elements to refs
    const mockVideo = {
      readyState: 4, // HAVE_ENOUGH_DATA
      HAVE_ENOUGH_DATA: 4,
      videoWidth: 100,
      videoHeight: 100,
      setAttribute: vi.fn(),
      play: vi.fn()
    }
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(40000),
          width: 100,
          height: 100
        })
      }),
      width: 0,
      height: 0
    }

    Object.defineProperty(result.current.videoRef, "current", {
      value: mockVideo,
      writable: true
    })
    Object.defineProperty(result.current.canvasRef, "current", {
      value: mockCanvas,
      writable: true
    })

    await act(async () => {
      result.current.startGuestScan()
    })

    expect(result.current.isScanning).toBe(true)

    // Trigger setInterval callback via timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(result.current.status).toBe("connecting")

    vi.useRealTimers()
  })

  it("should fallback to relay-connecting and then relay-syncing on WebRTC timeout for host", async () => {
    vi.useFakeTimers()
    let getCount = 0
    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (!init || init.method === "GET") {
        getCount++
        if (getCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: "mock-encrypted-payload" })
          })
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: "enc-image-list" })
          })
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })
    global.fetch = fetchMock

    const { result } = renderHook(() => useP2PSync(mockT))

    await act(async () => {
      await result.current.startHost()
    })

    expect(result.current.status).toBe("connecting")

    // Fast-forward 10 seconds to trigger timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(result.current.status).toBe("relay-connecting")

    // Fast-forward 2 seconds to trigger first polling fetch (DB data)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    // Fast-forward 2 seconds to trigger second polling fetch (image list)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(result.current.status).toBe("success")

    vi.useRealTimers()
  })

  it("should fallback to relay-syncing and POST data on WebRTC timeout for guest", async () => {
    vi.useFakeTimers()
    let getCount = 0
    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (!init || init.method === "GET") {
        getCount++
        if (getCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: "enc-req-image-list" })
          })
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: "enc-req-images" })
          })
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    })
    global.fetch = fetchMock

    const { result } = renderHook(() => useP2PSync(mockT))

    act(() => {
      result.current.setScanInputUrl(
        "http://localhost?p2proom=room1&p2pkey=key1&p2pserver=ws%3A%2F%2Fserver%3FroomId%3Droom1"
      )
    })
    act(() => {
      result.current.handleManualUrlSubmit({ preventDefault: vi.fn() } as any)
    })

    expect(result.current.status).toBe("connecting")

    // Fast-forward 10 seconds to trigger timeout & first POST
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    // Fast-forward 2 seconds to trigger first polling (wait for image list request)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    // Fast-forward 2 seconds to trigger second polling (wait for missing images list)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(result.current.status).toBe("success")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/sync/room1"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ data: "mock-encrypted-payload" })
      })
    )

    vi.useRealTimers()
  })
})
