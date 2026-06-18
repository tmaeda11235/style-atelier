import { beforeEach, describe, expect, it, vi } from "vitest"

import { runHostRelayPolling } from "../../../src/lib/p2p-host-relay-helper"

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock("../../../src/lib/p2p-sync-manager", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../src/lib/p2p-sync-manager")>()
  return {
    ...original,
    decryptSyncData: vi
      .fn()
      .mockResolvedValue(JSON.stringify({ type: "TEST_MSG" })),
    encryptSyncData: vi.fn().mockResolvedValue("encrypted-payload"),
    mergeIncomingSyncData: vi.fn().mockResolvedValue({ success: true }),
    scanLocalImages: vi.fn().mockResolvedValue(undefined),
    getLocalImagesMetadata: vi.fn().mockResolvedValue([]),
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

  beforeEach(() => {
    vi.clearAllMocks()
    updateState = vi.fn()
    handleError = vi.fn()
    onSuccess = vi.fn()
  })

  it("should successfully trigger the polling loop", async () => {
    vi.useFakeTimers()
    const interval = runHostRelayPolling(
      getUrl,
      key,
      t,
      updateState,
      handleError,
      onSuccess
    )

    expect(interval).not.toBeNull()

    if (interval) clearInterval(interval)
    vi.useRealTimers()
  })

  it("should handle fetch error in interval and trigger handleError and onSuccess", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))

    vi.useFakeTimers()
    const interval = runHostRelayPolling(
      getUrl,
      key,
      t,
      updateState,
      handleError,
      onSuccess
    )

    await vi.advanceTimersByTimeAsync(2000)

    expect(handleError).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()

    vi.useRealTimers()
  })
})
