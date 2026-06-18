import { opfsImageCache, useOpfsImage } from "@/hooks/useOpfsImage"
import { readBlobFromOpfs } from "@/shared/lib/db/migration-helpers"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/shared/lib/db/migration-helpers", () => ({
  readBlobFromOpfs: vi.fn()
}))

describe("useOpfsImage hook", () => {
  let objectUrlCounter = 0
  const createdUrls = new Set<string>()

  beforeEach(() => {
    objectUrlCounter = 0
    createdUrls.clear()
    opfsImageCache.clear()
    vi.mocked(readBlobFromOpfs).mockReset()

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

  it("should return undefined if filePath is not provided", () => {
    const { result } = renderHook(() => useOpfsImage(undefined))
    expect(result.current.imageUrl).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("should load image from OPFS and return object URL", async () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    vi.mocked(readBlobFromOpfs).mockResolvedValue(mockBlob)

    const { result } = renderHook(() => useOpfsImage("path/to/img.png"))
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.imageUrl).toBe("blob:mock-url-1")
    expect(result.current.error).toBeNull()
    expect(readBlobFromOpfs).toHaveBeenCalledWith("path/to/img.png")
  })

  it("should return cached URL and not call readBlobFromOpfs if cached", async () => {
    opfsImageCache.set("path/to/cached.png", "blob:cached-url")
    const { result } = renderHook(() => useOpfsImage("path/to/cached.png"))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.imageUrl).toBe("blob:cached-url")
    expect(readBlobFromOpfs).not.toHaveBeenCalled()
  })

  it("should share pending loads for the same filePath", async () => {
    let resolveLoad: (blob: Blob) => void = () => {}
    const promise = new Promise<Blob>((resolve) => {
      resolveLoad = resolve
    })
    vi.mocked(readBlobFromOpfs).mockReturnValue(promise)

    const { result: res1 } = renderHook(() => useOpfsImage("path/shared.png"))
    const { result: res2 } = renderHook(() => useOpfsImage("path/shared.png"))

    await act(async () => {
      resolveLoad(new Blob(["test"]))
      await promise
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(res1.current.imageUrl).toBe("blob:mock-url-1")
    expect(res2.current.imageUrl).toBe("blob:mock-url-1")
    expect(readBlobFromOpfs).toHaveBeenCalledTimes(1)
  })

  it("should evict oldest cache entry when size exceeds limit", async () => {
    // Fill cache to limit
    for (let i = 0; i < 100; i++) {
      opfsImageCache.set(`img-${i}.png`, `blob:url-${i}`)
    }
    expect(createdUrls.size).toBe(0) // Not created via createObjectURL mock here

    // This set should evict img-0.png
    opfsImageCache.set("new-img.png", "blob:new-url")
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:url-0")
  })

  it("should handle OPFS loading error", async () => {
    const mockError = new Error("OPFS Read Error")
    vi.mocked(readBlobFromOpfs).mockRejectedValue(mockError)

    const { result } = renderHook(() => useOpfsImage("path/error.png"))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.imageUrl).toBeUndefined()
    expect(result.current.error).toBe(mockError)
  })
})
