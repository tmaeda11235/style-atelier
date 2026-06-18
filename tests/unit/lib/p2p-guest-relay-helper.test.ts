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
    getLocalImagesMetadata: vi
      .fn()
      .mockResolvedValue([
        { filePath: "images/cards/card-1.png", hash: "hash-1" }
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

  beforeEach(() => {
    vi.clearAllMocks()
    updateState = vi.fn()
    handleError = vi.fn()
  })

  it("should successfully trigger the sync sequence and polling loop", async () => {
    // Mock successful post for sendGuestDbViaRelay
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    vi.useFakeTimers()
    const interval = await runGuestRelaySync(
      wsUrl,
      key,
      t,
      updateState,
      handleError
    )

    expect(interval).not.toBeNull()
    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "relay-syncing",
        statusMessage: "Sending db..."
      })
    )

    if (interval) clearInterval(interval)
    vi.useRealTimers()
  })

  it("should handle error in initial fetch db and trigger handleError", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    })

    const interval = await runGuestRelaySync(
      wsUrl,
      key,
      t,
      updateState,
      handleError
    )

    // We need to wait for the microtasks to settle as fetch is asynchronous
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(interval).toBeNull()
    expect(handleError).toHaveBeenCalled()
  })

  it("should handle network failure in initial DB transmission", async () => {
    mockFetch.mockRejectedValue(new Error("Network Failure"))

    const interval = await runGuestRelaySync(
      wsUrl,
      key,
      t,
      updateState,
      handleError
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(interval).toBeNull()
    expect(handleError).toHaveBeenCalled()
  })
})
