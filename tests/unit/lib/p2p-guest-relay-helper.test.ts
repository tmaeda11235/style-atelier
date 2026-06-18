import { beforeEach, describe, expect, it, vi } from "vitest"

import { runGuestRelaySync } from "../../../src/lib/p2p-guest-relay-helper"
import { encryptSyncData } from "../../../src/lib/p2p-sync-manager"

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock("../../../src/lib/p2p-sync-manager", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../src/lib/p2p-sync-manager")>()
  return {
    ...original,
    prepareOutgoingSyncData: vi
      .fn()
      .mockResolvedValue(JSON.stringify({ styleCards: [] })),
    scanLocalImages: vi.fn().mockResolvedValue(undefined),
    getLocalImagesMetadata: vi.fn().mockResolvedValue([
      { filePath: "images/cards/card-1.png", hash: "hash-1" },
      { filePath: "images/cards/card-2.png", hash: "hash-2" }
    ]),
    readOpfsFileAsBlob: vi
      .fn()
      .mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])]))
  }
})

vi.mock("../../../src/lib/db/migration-helpers", () => ({
  computeHash: vi.fn().mockResolvedValue("hash-1")
}))

describe("p2p-guest-relay-helper", () => {
  const wsUrl = "ws://localhost/api/sync?roomId=room-123"
  const key = "sync-passphrase"
  const t = {
    relaySending: "Sending db...",
    waitingForHost: "Waiting for host...",
    scanningImages: "Scanning...",
    waitingForDiffs: "Waiting diffs...",
    sendingImages: "Sending...",
    syncSuccess: "Success!"
  }

  let updateState: any
  let handleError: any
  let setIntervalSpy: any
  let intervalCallback: any

  beforeEach(() => {
    vi.clearAllMocks()
    updateState = vi.fn()
    handleError = vi.fn()
    intervalCallback = null

    setIntervalSpy = vi.spyOn(global, "setInterval").mockImplementation(((
      cb: any
    ) => {
      intervalCallback = cb
      return 123 as any
    }) as any)
  })

  it("should cover handleWaitReqList branch (RELAY_REQ_IMAGE_LIST)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true }) // Initial DB POST

    const reqListPayload = await encryptSyncData(
      JSON.stringify({ type: "RELAY_REQ_IMAGE_LIST" }),
      key
    )
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: reqListPayload })
    })
    mockFetch.mockResolvedValueOnce({ ok: true }) // POST images list

    const interval = await runGuestRelaySync(
      wsUrl,
      key,
      t,
      updateState,
      handleError
    )

    expect(interval).toBe(123)
    expect(intervalCallback).not.toBeNull()

    // Trigger the polling callback manually
    await intervalCallback()

    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "relay-syncing",
        statusMessage: "Scanning..."
      })
    )
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "relay-syncing",
        statusMessage: "Waiting diffs..."
      })
    )
  })

  it("should cover handleWaitReqImages branch (RELAY_REQ_IMAGES with files)", async () => {
    const reqListPayload = await encryptSyncData(
      JSON.stringify({ type: "RELAY_REQ_IMAGE_LIST" }),
      key
    )
    const reqImagesPayload = await encryptSyncData(
      JSON.stringify({
        type: "RELAY_REQ_IMAGES",
        missingFiles: ["images/cards/card-1.png", "images/cards/card-2.png"]
      }),
      key
    )

    mockFetch
      .mockResolvedValueOnce({ ok: true }) // DB POST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: reqListPayload })
      }) // Poll 1 (REQ_LIST)
      .mockResolvedValueOnce({ ok: true }) // POST images list response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: reqImagesPayload })
      }) // Poll 2 (REQ_IMAGES)
      .mockResolvedValueOnce({ ok: true }) // POST image 1 file response

    await runGuestRelaySync(wsUrl, key, t, updateState, handleError)

    // Execute Poll 1 -> transitions to WAIT_FOR_REQ_IMAGES
    await intervalCallback()
    // Execute Poll 2 -> transitions to SENDING_IMAGES and sends image 1
    await intervalCallback()

    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "relay-syncing",
        statusMessage: "Sending... (1/2): images/cards/card-1.png"
      })
    )
  })

  it("should cover handleSendingImages branch (RELAY_ACK_IMAGE_FILE and sync completion)", async () => {
    const reqListPayload = await encryptSyncData(
      JSON.stringify({ type: "RELAY_REQ_IMAGE_LIST" }),
      key
    )
    const reqImagesPayload = await encryptSyncData(
      JSON.stringify({
        type: "RELAY_REQ_IMAGES",
        missingFiles: ["images/cards/card-1.png", "images/cards/card-2.png"]
      }),
      key
    )
    const ack1Payload = await encryptSyncData(
      JSON.stringify({
        type: "RELAY_ACK_IMAGE_FILE",
        filePath: "images/cards/card-1.png"
      }),
      key
    )
    const ack2Payload = await encryptSyncData(
      JSON.stringify({
        type: "RELAY_ACK_IMAGE_FILE",
        filePath: "images/cards/card-2.png"
      }),
      key
    )

    mockFetch
      .mockResolvedValueOnce({ ok: true }) // DB POST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: reqListPayload })
      }) // Poll 1 (REQ_LIST)
      .mockResolvedValueOnce({ ok: true }) // POST images list
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: reqImagesPayload })
      }) // Poll 2 (REQ_IMAGES) -> sends file 1
      .mockResolvedValueOnce({ ok: true }) // POST file 1 response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: ack1Payload })
      }) // Poll 3 (ACK file 1) -> sends file 2
      .mockResolvedValueOnce({ ok: true }) // POST file 2 response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: ack2Payload })
      }) // Poll 4 (ACK file 2) -> sends complete
      .mockResolvedValueOnce({ ok: true }) // POST complete

    await runGuestRelaySync(wsUrl, key, t, updateState, handleError)

    await intervalCallback() // Poll 1
    await intervalCallback() // Poll 2
    await intervalCallback() // Poll 3
    await intervalCallback() // Poll 4

    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        statusMessage: "Success!"
      })
    )
  })
})
