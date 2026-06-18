import { beforeEach, describe, expect, it, vi } from "vitest"

import { runHostRelayPolling } from "../../../src/lib/p2p-host-relay-helper"
import { encryptSyncData } from "../../../src/lib/p2p-sync-manager"

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock("../../../src/lib/p2p-sync-manager", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../src/lib/p2p-sync-manager")>()
  return {
    ...original,
    decryptSyncData: vi
      .fn()
      .mockImplementation(async (data: string, key: string) => data), // passthrough
    encryptSyncData: vi.fn().mockResolvedValue("encrypted-payload"),
    mergeIncomingSyncData: vi.fn().mockResolvedValue({ success: true }),
    scanLocalImages: vi.fn().mockResolvedValue(undefined),
    getLocalImagesMetadata: vi
      .fn()
      .mockResolvedValue([
        { filePath: "images/cards/card-1.png", hash: "hash-1" }
      ]),
    saveIncomingImage: vi.fn().mockResolvedValue(undefined)
  }
})

describe("p2p-host-relay-helper", () => {
  const getUrl = "http://localhost/api/sync/room-123"
  const key = "sync-passphrase"
  const t = {
    receiving: "Receiving...",
    syncSuccess: "Success!"
  }

  let updateState: any
  let handleError: any
  let onSuccess: any
  let setIntervalSpy: any
  let intervalCallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    updateState = vi.fn()
    handleError = vi.fn()
    onSuccess = vi.fn()
    intervalCallback = null

    setIntervalSpy = vi.spyOn(global, "setInterval").mockImplementation(((
      cb: any
    ) => {
      intervalCallback = cb
      return 123 as any
    }) as any)
  })

  it("should cover full host relay sync flow (RECEIVE_DB -> WAIT_IMAGE_LIST -> WAIT_IMAGES -> RELAY_SYNC_COMPLETE)", async () => {
    const rawDb = JSON.stringify({ styleCards: [] })
    const imageListPayload = JSON.stringify({
      type: "RELAY_IMAGE_LIST",
      files: [
        { filePath: "images/cards/card-1.png", hash: "hash-1" }, // exists, identical
        { filePath: "images/cards/card-2.png", hash: "hash-2" } // missing
      ]
    })
    const imageFilePayload = JSON.stringify({
      type: "RELAY_IMAGE_FILE",
      filePath: "images/cards/card-2.png",
      hash: "hash-2",
      data: "bW9jay1kYXRh", // 'mock-data' base64
      remainingCount: 0
    })
    const completePayload = JSON.stringify({ type: "RELAY_SYNC_COMPLETE" })

    mockFetch
      // Poll 1: RECEIVE_DB
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: rawDb }) })
      .mockResolvedValueOnce({ ok: true }) // POST req image list
      // Poll 2: WAIT_IMAGE_LIST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: imageListPayload })
      })
      .mockResolvedValueOnce({ ok: true }) // POST req images
      // Poll 3: WAIT_IMAGES (receive file 2)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: imageFilePayload })
      })
      .mockResolvedValueOnce({ ok: true }) // POST ack file 2
      // Poll 4: WAIT_IMAGES (complete)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: completePayload })
      })

    const interval = runHostRelayPolling(
      getUrl,
      key,
      t,
      updateState,
      handleError,
      onSuccess
    )
    expect(interval).toBe(123)
    expect(intervalCallback).not.toBeNull()

    await intervalCallback() // Poll 1: DB Received -> Request Image List
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        statusMessage: "DB synced. Requesting image list..."
      })
    )

    await intervalCallback() // Poll 2: List Received -> Compare and Request Missing File
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        statusMessage: "Comparing image differences..."
      })
    )

    await intervalCallback() // Poll 3: File Received -> Save Image
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        statusMessage: "Receiving image (1/1): images/cards/card-2.png"
      })
    )

    await intervalCallback() // Poll 4: Sync Complete
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        statusMessage: "Success!"
      })
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("should handle early success when no image difference exists", async () => {
    const rawDb = JSON.stringify({ styleCards: [] })
    const imageListPayload = JSON.stringify({
      type: "RELAY_IMAGE_LIST",
      files: [
        { filePath: "images/cards/card-1.png", hash: "hash-1" } // exact same as local
      ]
    })

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: rawDb }) })
      .mockResolvedValueOnce({ ok: true }) // POST req image list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: imageListPayload })
      })
      .mockResolvedValueOnce({ ok: true }) // POST req images (empty list)

    runHostRelayPolling(getUrl, key, t, updateState, handleError, onSuccess)

    await intervalCallback() // Poll 1: DB Received -> Request List
    await intervalCallback() // Poll 2: List Received -> No diff -> Complete

    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        statusMessage: "Success!"
      })
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("should handle error in polling interval", async () => {
    mockFetch.mockRejectedValue(new Error("Network Failure"))

    runHostRelayPolling(getUrl, key, t, updateState, handleError, onSuccess)

    await intervalCallback()

    expect(handleError).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })
})
