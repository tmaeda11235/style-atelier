import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  readBlobFromOpfs,
  saveBase64ToOpfs
} from "../../src/lib/db/migration-helpers"
import {
  clearWebImageCache,
  resolveWebCardImage
} from "../../src/web-app/image"

vi.mock("../../src/lib/db/migration-helpers", () => ({
  readBlobFromOpfs: vi.fn(),
  saveBase64ToOpfs: vi.fn()
}))

describe("web-app resolveWebCardImage", () => {
  let objectUrlCounter = 0
  const createdUrls = new Set<string>()

  beforeEach(() => {
    objectUrlCounter = 0
    createdUrls.clear()
    clearWebImageCache()
    vi.mocked(readBlobFromOpfs).mockReset()
    vi.mocked(saveBase64ToOpfs).mockReset()

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        objectUrlCounter++
        const url = `blob:mock-url-${objectUrlCounter}`
        createdUrls.add(url)
        return url
      }),
      revokeObjectURL: vi.fn((url) => {
        createdUrls.delete(url)
      })
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should return fallback when cardId is not provided", async () => {
    const res = await resolveWebCardImage(undefined, undefined, undefined)
    expect(res).toBe("./cyber_samurai.png")

    const res2 = await resolveWebCardImage(
      undefined,
      undefined,
      "data:image/png;base64,foo"
    )
    expect(res2).toBe("data:image/png;base64,foo")
  })

  it("should return thumbnailData if OPFS is not supported", async () => {
    vi.stubGlobal("navigator", {})
    const res = await resolveWebCardImage(
      "card1",
      undefined,
      "data:image/png;base64,foo"
    )
    expect(res).toBe("data:image/png;base64,foo")
    expect(readBlobFromOpfs).not.toHaveBeenCalled()
  })

  it("should read from OPFS if OPFS is supported and has file", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: vi.fn()
      }
    })
    const mockBlob = new Blob(["test"], { type: "image/png" })
    vi.mocked(readBlobFromOpfs).mockResolvedValue(mockBlob)

    const res = await resolveWebCardImage(
      "card1",
      "images/cards/card1.png",
      "data:image/png;base64,foo"
    )
    expect(res).toBe("blob:mock-url-1")
    expect(readBlobFromOpfs).toHaveBeenCalledWith("images/cards/card1.png")
    expect(saveBase64ToOpfs).not.toHaveBeenCalled()
  })

  it("should save base64 to OPFS if file is missing in OPFS", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: vi.fn()
      }
    })
    vi.mocked(readBlobFromOpfs)
      .mockRejectedValueOnce(new Error("NotFoundError"))
      .mockResolvedValueOnce(new Blob(["test"], { type: "image/png" }))

    vi.mocked(saveBase64ToOpfs).mockResolvedValue(undefined)

    const res = await resolveWebCardImage(
      "card1",
      "images/cards/card1.png",
      "data:image/png;base64,foo"
    )
    expect(res).toBe("blob:mock-url-1")
    expect(saveBase64ToOpfs).toHaveBeenCalledWith(
      "images/cards/card1.png",
      "data:image/png;base64,foo"
    )
    expect(readBlobFromOpfs).toHaveBeenCalledTimes(2)
  })

  it("should return cached URL and not read OPFS again if cached in-memory", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: vi.fn()
      }
    })
    const mockBlob = new Blob(["test"], { type: "image/png" })
    vi.mocked(readBlobFromOpfs).mockResolvedValue(mockBlob)

    const res1 = await resolveWebCardImage(
      "card1",
      "images/cards/card1.png",
      "data:image/png;base64,foo"
    )
    expect(res1).toBe("blob:mock-url-1")

    const res2 = await resolveWebCardImage(
      "card1",
      "images/cards/card1.png",
      "data:image/png;base64,foo"
    )
    expect(res2).toBe("blob:mock-url-1")
    expect(readBlobFromOpfs).toHaveBeenCalledTimes(1)
  })
})
