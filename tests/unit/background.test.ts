import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the HTML asset import path to prevent Vitest import failure
vi.mock("url:~src/offscreen.html", () => ({
  default: "mock-offscreen.html"
}))

describe("background.ts", () => {
  let hasDocumentMock: any
  let createDocumentMock: any
  let closeDocumentMock: any
  let setPanelBehaviorMock: any
  let sendMessageMock: any
  let connectListeners: any[] = []
  let messageListeners: any[] = []

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    connectListeners = []
    messageListeners = []

    hasDocumentMock = vi.fn().mockResolvedValue(false)
    createDocumentMock = vi.fn().mockResolvedValue(undefined)
    closeDocumentMock = vi.fn().mockResolvedValue(undefined)
    setPanelBehaviorMock = vi.fn().mockResolvedValue(undefined)
    sendMessageMock = vi.fn().mockImplementation((msg, cb) => {
      if (cb) cb({ status: "success" })
    })

    // Setup global chrome mock
    global.chrome = {
      sidePanel: {
        setPanelBehavior: setPanelBehaviorMock
      },
      offscreen: {
        createDocument: createDocumentMock,
        closeDocument: closeDocumentMock,
        hasDocument: hasDocumentMock,
        Reason: {
          LOCAL_STORAGE: "LOCAL_STORAGE"
        }
      },
      runtime: {
        sendMessage: sendMessageMock,
        onConnect: {
          addListener: vi.fn((fn) => connectListeners.push(fn))
        },
        onMessage: {
          addListener: vi.fn((fn) => messageListeners.push(fn))
        }
      }
    } as any
  })

  const importBackground = async () => {
    await import("../../src/background")
  }

  it("should initialize side panel behavior on load", async () => {
    await importBackground()
    expect(setPanelBehaviorMock).toHaveBeenCalledWith({
      openPanelOnActionClick: true
    })
  })

  it("should handle sidepanel connection and disconnection lifecycle", async () => {
    await importBackground()

    expect(connectListeners.length).toBe(1)
    const connectCallback = connectListeners[0]

    const disconnectListeners: any[] = []
    const mockPort = {
      name: "sidepanel",
      onDisconnect: {
        addListener: vi.fn((fn) => disconnectListeners.push(fn))
      }
    }

    // Connect sidepanel
    connectCallback(mockPort)
    expect(mockPort.onDisconnect.addListener).toHaveBeenCalled()

    // Disconnect sidepanel -> should check lifecycle and close offscreen since nothing else is running
    hasDocumentMock.mockResolvedValue(true)
    const disconnectCallback = disconnectListeners[0]
    await disconnectCallback()

    expect(closeDocumentMock).toHaveBeenCalled()
  })

  it("should set downloading status via set-downloading message", async () => {
    await importBackground()

    expect(messageListeners.length).toBe(1)
    const messageCallback = messageListeners[0]

    const sendResponse = vi.fn()
    const result = messageCallback(
      { target: "background", action: "set-downloading", value: true },
      {},
      sendResponse
    )

    expect(result).toBe(true)
    expect(sendResponse).toHaveBeenCalledWith({ status: "success" })
  })

  it("should forward offscreen target messages and manage offscreen document lifecycle", async () => {
    await importBackground()

    const messageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    // Forwarding run-inference to offscreen
    hasDocumentMock.mockResolvedValue(false)
    const result = messageCallback(
      { target: "offscreen", action: "run-inference", prompt: "Hello" },
      {},
      sendResponse
    )

    expect(result).toBe(true) // Async response

    // Wait for async execution of forwardToOffscreen (setupOffscreen)
    await vi.waitFor(() => {
      expect(createDocumentMock).toHaveBeenCalled()
    })

    await vi.waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        { target: "offscreen", action: "run-inference", prompt: "Hello" },
        expect.any(Function)
      )
    })
  })

  it("should manage downloading status and lifecycle based on offscreen-worker messages", async () => {
    await importBackground()

    const messageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    // 1. Worker status "downloading" -> set downloading flag
    messageCallback(
      { source: "offscreen-worker", payload: { status: "downloading" } },
      {},
      sendResponse
    )

    // 2. Worker status "ready" -> clear downloading and close offscreen if lifecycle conditions met
    hasDocumentMock.mockResolvedValue(true)
    await messageCallback(
      { source: "offscreen-worker", payload: { status: "ready" } },
      {},
      sendResponse
    )

    expect(closeDocumentMock).toHaveBeenCalled()
  })
})
