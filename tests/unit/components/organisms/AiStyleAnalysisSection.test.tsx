import { AiStyleAnalysisSection } from "@/components/organisms/AiStyleAnalysisSection"
import { useAiMetadataGenerator } from "@/hooks/useAiMetadataGenerator"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock useAiMetadataGenerator hook
vi.mock("@/hooks/useAiMetadataGenerator", () => ({
  useAiMetadataGenerator: vi.fn()
}))

// Mock Language Context
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      minting: {
        aiAnalysis: "AI Style Analysis",
        aiAnalysisBtn: "Analyze Style with AI",
        aiAnalysisLoading: "Analyzing style...",
        aiAnalysisError: "Inference failed: {{error}}",
        aiRecommendTags: "AI Recommended Tags",
        aiSummary: "AI Summary Description",
        aiSummaryPlaceholder: "AI summary will appear here...",
        aiUseSummary: "Use as Card Note/Description",
        aiModelNotDownloaded: "Download AI Model to Enable Recommendations"
      },
      settings: {
        webLlmStatusDownloading: "Downloading ({{progress}}%)",
        webLlmDownloadBtn: "Download Model"
      },
      aiStyleAnalysis: {
        genreLabel: "Genre:"
      }
    }
  })
}))

describe("AiStyleAnalysisSection", () => {
  const mockStartDownload = vi.fn()
  const mockGenerateMetadata = vi.fn()
  const mockSetCustomTags = vi.fn()
  const mockSetCustomName = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "idle",
      progress: 0,
      startDownload: mockStartDownload,
      loading: false,
      error: null,
      result: null,
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: false
    } as any)
  })

  it("renders download button when status is idle", () => {
    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    expect(
      screen.getByText("Download AI Model to Enable Recommendations")
    ).toBeDefined()
    const downloadBtn = screen.getByText("Download Model")
    expect(downloadBtn).toBeDefined()

    fireEvent.click(downloadBtn)
    const confirmBtn = screen.getByText("Download")
    expect(confirmBtn).toBeDefined()
    fireEvent.click(confirmBtn)
    expect(mockStartDownload).toHaveBeenCalledTimes(1)
  })

  it("renders progress bar when status is downloading", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "downloading",
      progress: 45,
      startDownload: mockStartDownload,
      loading: false,
      error: null,
      result: null,
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: false
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    expect(screen.getByText("Downloading (45%)")).toBeDefined()
    expect(screen.getByText("45%")).toBeDefined()
  })

  it("renders analysis trigger button when status is ready", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: false,
      error: null,
      result: null,
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    const analyzeBtn = screen.getByText("Analyze Style with AI")
    expect(analyzeBtn).toBeDefined()

    fireEvent.click(analyzeBtn)
    expect(mockGenerateMetadata).toHaveBeenCalledWith("cyberpunk sunset")
  })

  it("renders loading text when analyzing", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: true,
      error: null,
      result: null,
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    expect(screen.getByText("Analyzing style...")).toBeDefined()
  })

  it("renders analysis results and toggles tags and description note", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: false,
      error: null,
      result: {
        genre: "Cyberpunk",
        tags: ["Neon", "Retro"],
        summary: "A cool retro cyberpunk style description."
      },
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={["neon"]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    expect(screen.getByText("Genre:")).toBeDefined()
    expect(screen.getByText("Cyberpunk")).toBeDefined()
    expect(screen.getByText("AI Recommended Tags")).toBeDefined()
    expect(screen.getByText("Neon")).toBeDefined()
    expect(screen.getByText("Retro")).toBeDefined()
    expect(screen.getByText("AI Summary Description")).toBeDefined()
    expect(
      screen.getByText('"A cool retro cyberpunk style description."')
    ).toBeDefined()

    // Test tag toggle (add)
    const retroTagBtn = screen.getByText("Retro")
    fireEvent.click(retroTagBtn)
    expect(mockSetCustomTags).toHaveBeenCalledWith(["neon", "retro"])

    // Test tag toggle (remove)
    const neonTagBtn = screen.getByText("Neon")
    fireEvent.click(neonTagBtn)
    expect(mockSetCustomTags).toHaveBeenCalledWith([])

    // Test use description
    const useSummaryBtn = screen.getByText("Use as Card Note/Description")
    fireEvent.click(useSummaryBtn)
    expect(mockSetCustomName).toHaveBeenCalledWith(
      "A cool retro cyberpunk style description."
    )
  })

  it("calls setMutationNote automatically when result is available", () => {
    const mockSetMutationNote = vi.fn()
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: false,
      error: null,
      result: {
        genre: "Cyberpunk",
        tags: ["Neon"],
        summary: "A cool retro cyberpunk style description."
      },
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
        setMutationNote={mockSetMutationNote}
      />
    )

    expect(mockSetMutationNote).toHaveBeenCalledWith(
      "A cool retro cyberpunk style description."
    )
  })

  it("renders error message when error status is present", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: false,
      error: "Some API Error",
      result: null,
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    expect(screen.getByText("Inference failed: Some API Error")).toBeDefined()
  })

  it("toggles tag when customTags is empty", () => {
    vi.mocked(useAiMetadataGenerator).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: mockStartDownload,
      loading: false,
      result: {
        genre: "Cyberpunk",
        tags: ["Neon"],
        summary: "A cool retro cyberpunk style description."
      },
      setResult: vi.fn(),
      generateMetadata: mockGenerateMetadata,
      isModelReady: true
    } as any)

    render(
      <AiStyleAnalysisSection
        promptText="cyberpunk sunset"
        customTags={[]}
        setCustomTags={mockSetCustomTags}
        setCustomName={mockSetCustomName}
      />
    )

    const neonTagBtn = screen.getByText("Neon")
    fireEvent.click(neonTagBtn)
    expect(mockSetCustomTags).toHaveBeenCalledWith(["neon"])
  })
})
