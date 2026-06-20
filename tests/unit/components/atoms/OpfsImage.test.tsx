import { OpfsImage } from "@/components/atoms/OpfsImage"
import { useOpfsImage } from "@/hooks/useOpfsImage"
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock useOpfsImage hook
vi.mock("@/hooks/useOpfsImage", () => {
  return {
    useOpfsImage: vi.fn(
      () =>
        ({
          imageUrl: "mocked-opfs-url.jpg",
          isLoading: false
        }) as any
    )
  }
})

// Mock IntersectionObserver
const observeMock = vi.fn()
const disconnectMock = vi.fn()
class MockIntersectionObserver {
  observe = observeMock
  disconnect = disconnectMock
  constructor(callback: any) {
    // Invoke the callback asynchronously to avoid "Cannot access 'observer' before initialization" ReferenceError
    setTimeout(() => callback([{ isIntersecting: true }]), 0)
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)

describe("OpfsImage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOpfsImage).mockReturnValue({
      imageUrl: "mocked-opfs-url.jpg",
      isLoading: false
    } as any)
  })

  it("should render non-OPFS src paths directly", () => {
    render(<OpfsImage src="http://example.com/test.jpg" alt="test image" />)
    const img = screen.getByAltText("test image")
    expect(img.getAttribute("src")).toBe("http://example.com/test.jpg")
  })

  it("should render OPFS src path by resolving it with hook", async () => {
    render(<OpfsImage src="test-opfs-file.jpg" alt="test image" />)
    const img = screen.getByAltText("test image")
    await waitFor(() => {
      expect(img.getAttribute("src")).toBe("mocked-opfs-url.jpg")
    })
    expect(useOpfsImage).toHaveBeenCalledWith("test-opfs-file.jpg")
  })

  it("should render fallback iconUrl when src is empty", () => {
    render(<OpfsImage alt="fallback image" />)
    const img = screen.getByAltText("fallback image")
    expect(img.getAttribute("src")).toBeDefined()
  })

  it("should apply animate-pulse class when loading", async () => {
    vi.mocked(useOpfsImage).mockReturnValue({
      imageUrl: undefined,
      isLoading: true
    } as any)
    render(<OpfsImage src="test-opfs-file.jpg" alt="test image" />)
    const img = screen.getByAltText("test image")
    await waitFor(() => {
      expect(img.className).toContain("animate-pulse")
    })
  })
})
