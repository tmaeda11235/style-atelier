import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  checkAvailableStorage,
  verifyCacheIntegrity,
  verifyOpfsIntegrity
} from "../../src/lib/storage-utils"

// Mock storage-utils functions
vi.mock("../../src/lib/storage-utils", () => ({
  checkAvailableStorage: vi.fn(),
  verifyCacheIntegrity: vi.fn(),
  verifyOpfsIntegrity: vi.fn()
}))

// Mock Worker class to capture instances
let lastWorkerInstance: any = null

class MockWorker {
  postMessage = vi.fn()
  onmessage: ((event: any) => void) | null = null
  constructor(_url: string | URL, _options?: any) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastWorkerInstance = this
  }
}

describe("offscreen.ts", () => {
  let sendMessageMock: any
  let messageListeners: any[] = []
  let removeEntryMock: any
  let getDirectoryMock: any

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    lastWorkerInstance = null
    messageListeners = []
    global.Worker = MockWorker as any

    sendMessageMock = vi.fn()

    // Setup global chrome mock
    global.chrome = {
      runtime: {
        sendMessage: sendMessageMock,
        onMessage: {
          addListener: vi.fn((fn) => messageListeners.push(fn))
        }
      }
    } as any

    // Mock navigator.storage
    removeEntryMock = vi.fn().mockResolvedValue(undefined)
    getDirectoryMock = vi.fn().mockResolvedValue({
      removeEntry: removeEntryMock
    })

    Object.defineProperty(global.navigator, "storage", {
      value: {
        getDirectory: getDirectoryMock
      },
      configurable: true,
      writable: true
    })

    // Mock caches
    global.caches = {
      delete: vi.fn().mockResolvedValue(true)
    } as any
  })

  const importOffscreen = async () => {
    await import("../../src/offscreen")
  }

  it("should ignore messages that are not targeted to offscreen", async () => {
    await importOffscreen()

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    const result = onMessageCallback(
      { target: "background", action: "check-quota" },
      {},
      sendResponse
    )

    expect(result).toBeUndefined()
    expect(sendResponse).not.toHaveBeenCalled()
  })

  it("should handle check-quota message correctly", async () => {
    await importOffscreen()
    vi.mocked(checkAvailableStorage).mockResolvedValue(true)

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    // 1. Success case - sufficient storage
    const result = onMessageCallback(
      { target: "offscreen", action: "check-quota", requiredBytes: 1000 },
      {},
      sendResponse
    )

    expect(result).toBe(true) // Async response

    await vi.waitFor(() => {
      expect(checkAvailableStorage).toHaveBeenCalledWith(1000)
      expect(sendResponse).toHaveBeenCalledWith({
        status: "success",
        isSufficient: true
      })
    })

    // 2. Error case
    vi.mocked(checkAvailableStorage).mockRejectedValue(
      new Error("Quota failed")
    )
    sendResponse.mockClear()

    onMessageCallback(
      { target: "offscreen", action: "check-quota", requiredBytes: 1000 },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        status: "error",
        error: "Quota failed"
      })
    })
  })

  it("should handle verify-integrity message correctly", async () => {
    await importOffscreen()
    vi.mocked(verifyOpfsIntegrity).mockResolvedValue(true)
    vi.mocked(verifyCacheIntegrity).mockResolvedValue(false)

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    onMessageCallback(
      { target: "offscreen", action: "verify-integrity" },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(verifyOpfsIntegrity).toHaveBeenCalled()
      expect(verifyCacheIntegrity).toHaveBeenCalled()
      expect(sendResponse).toHaveBeenCalledWith({
        status: "success",
        integrityPassed: true // True because opfsValid is true
      })
    })
  })

  it("should handle init-worker and message forwarding from worker", async () => {
    await importOffscreen()

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    onMessageCallback(
      { target: "offscreen", action: "init-worker" },
      {},
      sendResponse
    )

    expect(sendResponse).toHaveBeenCalledWith({
      status: "success",
      message: "Worker initialized"
    })
    expect(lastWorkerInstance).not.toBeNull()

    // Simulate message from worker
    const mockEventData = { status: "downloading", progress: 40 }
    lastWorkerInstance.onmessage({ data: mockEventData })

    // It should forward the message to background script
    expect(sendMessageMock).toHaveBeenCalledWith({
      source: "offscreen-worker",
      payload: mockEventData
    })
  })

  it("should handle start-download message by posting to worker", async () => {
    await importOffscreen()

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    onMessageCallback(
      { target: "offscreen", action: "start-download" },
      {},
      sendResponse
    )

    expect(sendResponse).toHaveBeenCalledWith({
      status: "success",
      message: "Download started"
    })
    expect(lastWorkerInstance.postMessage).toHaveBeenCalledWith({
      action: "start-download"
    })
  })

  it("should handle purge-cache message by deleting OPFS and Cache API storage", async () => {
    await importOffscreen()

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    onMessageCallback(
      { target: "offscreen", action: "purge-cache" },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(removeEntryMock).toHaveBeenCalledWith("webllm_models", {
        recursive: true
      })
      expect(global.caches.delete).toHaveBeenCalledWith("webllm/model_cache")
      expect(sendResponse).toHaveBeenCalledWith({ status: "success" })
    })
  })

  it("should handle run-inference message, post to worker, and respond when worker returns result", async () => {
    await importOffscreen()

    const onMessageCallback = messageListeners[0]
    const sendResponse = vi.fn()

    // Trigger run-inference
    const result = onMessageCallback(
      {
        target: "offscreen",
        action: "run-inference",
        requestId: "req-123",
        prompt: "Test prompt",
        systemPrompt: "Sys prompt",
        temperature: 0.7
      },
      {},
      sendResponse
    )

    expect(result).toBe(true) // Async response

    // Verify it posts to worker
    expect(lastWorkerInstance.postMessage).toHaveBeenCalledWith({
      action: "run-inference",
      requestId: "req-123",
      prompt: "Test prompt",
      systemPrompt: "Sys prompt",
      temperature: 0.7
    })

    // Simulate worker returning result
    lastWorkerInstance.onmessage({
      data: {
        status: "inference-result",
        requestId: "req-123",
        result: "Mocked generated text"
      }
    })

    // Expect the sendResponse callback of the message listener to have been called with the result
    expect(sendResponse).toHaveBeenCalledWith({
      status: "success",
      result: "Mocked generated text"
    })
  })
})
