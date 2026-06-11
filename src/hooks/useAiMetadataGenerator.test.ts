import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAiMetadataGenerator } from "./useAiMetadataGenerator"
import { useWebLlm } from "./useWebLlm"

// Mock useWebLlm
vi.mock("./useWebLlm", () => {
  return {
    useWebLlm: vi.fn()
  }
})

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" }
  })
}))

describe("useAiMetadataGenerator", () => {
  const mockRunInference = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWebLlm).mockReturnValue({
      status: "ready",
      progress: 100,
      error: null,
      startDownload: vi.fn(),
      purgeCache: vi.fn(),
      checkCurrentState: vi.fn(),
      runInference: mockRunInference
    })
  })

  it("should return initial state", () => {
    const { result } = renderHook(() => useAiMetadataGenerator())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.isModelReady).toBe(true)
  })

  it("should not trigger inference if prompt is empty", async () => {
    const { result } = renderHook(() => useAiMetadataGenerator())

    const res = await result.current.generateMetadata("")
    expect(res).toBeNull()
    expect(mockRunInference).not.toHaveBeenCalled()
  })

  it("should successfully generate and parse metadata from JSON response", async () => {
    const jsonResponse = JSON.stringify({
      genre: "Cyberpunk",
      tags: ["cyberpunk", "neon", "rain"],
      summary: "A rainy cyberpunk city portrait with neon reflections"
    })
    mockRunInference.mockResolvedValue(jsonResponse)

    const { result } = renderHook(() => useAiMetadataGenerator())

    let res: any
    await act(async () => {
      res = await result.current.generateMetadata("cyberpunk style prompt")
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(res).toEqual({
      genre: "Cyberpunk",
      tags: ["cyberpunk", "neon", "rain"],
      summary: "A rainy cyberpunk city portrait with neon reflections"
    })
    expect(result.current.result).toEqual(res)
    expect(mockRunInference).toHaveBeenCalledTimes(1)
  })

  it("should handle non-JSON responses with fallback parser", async () => {
    const textResponse = `
      Some conversational text before
      "genre": "Anime"
      "tags": ["anime", "ramen"]
      "summary": "Girl eating ramen"
      Some conversational text after
    `
    mockRunInference.mockResolvedValue(textResponse)

    const { result } = renderHook(() => useAiMetadataGenerator())

    let res: any
    await act(async () => {
      res = await result.current.generateMetadata("retro anime ramen prompt")
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(res).toEqual({
      genre: "Anime",
      tags: ["anime", "ramen"],
      summary: "Girl eating ramen"
    })
  })

  it("should handle error states when runInference fails", async () => {
    mockRunInference.mockRejectedValue(new Error("Inference error"))

    const { result } = renderHook(() => useAiMetadataGenerator())

    let res: any
    await act(async () => {
      res = await result.current.generateMetadata("failing prompt")
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Inference error")
    expect(res).toBeNull()
    expect(result.current.result).toBeNull()
  })
})
