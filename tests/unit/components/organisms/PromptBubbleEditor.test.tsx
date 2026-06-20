import { PromptBubbleEditor } from "@/components/organisms/PromptBubbleEditor"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { useAiPromptDeclutter } from "@/hooks/useAiPromptDeclutter"
import type { PromptSegment } from "@/shared/lib/db-schema"
import {
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/useAiPromptDeclutter", () => ({
  useAiPromptDeclutter: vi.fn(() => ({
    status: "idle",
    progress: 0,
    startDownload: vi.fn(),
    loading: false,
    error: null,
    declutterPrompt: vi.fn(),
    isModelReady: false
  }))
}))

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(ui, { wrapper: SettingsProvider, ...options })
}

describe("PromptBubbleEditor", () => {
  const initialSegments: PromptSegment[] = [
    { type: "text", value: "a cute cat" },
    { type: "slot", label: "color", default: "white" }
  ]

  it("renders initial segments", () => {
    render(<PromptBubbleEditor initialSegments={initialSegments} />)
    expect(screen.getByText("a cute cat")).toBeDefined()
    expect(screen.getByText("color")).toBeDefined()
  })

  it("adds a new token on Enter", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "running" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(screen.getByText("running")).toBeDefined()
    expect(onChange).toHaveBeenCalled()

    // 最後の呼び出しの引数を確認
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(3)
    expect(lastCall[2]).toEqual({ type: "text", value: "running" })
  })

  it("adds a new token on comma", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "forest" } })
    fireEvent.keyDown(input, { key: ",", code: "Comma" })

    expect(screen.getByText("forest")).toBeDefined()
    expect(onChange).toHaveBeenCalled()
  })

  it("adds a new token on Japanese delimiters", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")

    // Test with Japanese comma
    fireEvent.change(input, { target: { value: "cat" } })
    fireEvent.keyDown(input, { key: "、", code: "Comma" }) // Some components might check code
    fireEvent.blur(input) // Trigger blur to add token if keydown failed
    expect(screen.getByText("cat")).toBeDefined()

    // Test with Japanese period
    fireEvent.change(input, { target: { value: "running" } })
    fireEvent.keyDown(input, { key: "。", code: "Period" })
    fireEvent.blur(input)
    expect(screen.getByText("running")).toBeDefined()
  })

  it("splits multiple tokens by delimiters", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "red,blue;green:yellow" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(screen.getByText("red")).toBeDefined()
    expect(screen.getByText("blue")).toBeDefined()
    expect(screen.getByText("green")).toBeDefined()
    expect(screen.getByText("yellow")).toBeDefined()
  })

  it("does not split by space", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "running fast" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(screen.getByText("running fast")).toBeDefined()
  })

  it("removes a segment when clicking remove button", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    // PromptBubbleの中のXボタン（LucideのXアイコン）を探す
    // note: PromptBubbleコンポーネントの実装に依存するが、SVGのタイトルなどがない場合はaria-labelなどを付けるのが良いが
    // ここでは単純にbuttonを取得してみる
    const removeButtons = screen.getAllByRole("button")
    fireEvent.click(removeButtons[0]) // 最初のセグメントを削除

    expect(screen.queryByText("a cute cat")).toBeNull()
    expect(onChange).toHaveBeenCalled()

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(1)
    expect(lastCall[0].label).toBe("color")
  })

  it("removes last segment on backspace when input is empty", () => {
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor
        initialSegments={initialSegments}
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText("")
    fireEvent.keyDown(input, { key: "Backspace", code: "Backspace" })

    expect(screen.queryByText("color")).toBeNull()
    expect(onChange).toHaveBeenCalled()
  })

  it("toggles segment between text and slot when clicked", () => {
    const segments: PromptSegment[] = [{ type: "text", value: "test" }]
    const onChange = vi.fn()
    render(
      <PromptBubbleEditor initialSegments={segments} onChange={onChange} />
    )

    const bubble = screen.getByText("test")
    fireEvent.click(bubble)

    expect(onChange).toHaveBeenCalledWith([
      { type: "slot", label: "test", default: "test" }
    ])

    fireEvent.click(screen.getByText("test"))
    expect(onChange).toHaveBeenLastCalledWith([{ type: "text", value: "test" }])
  })

  it("handles initialSegments change from empty to non-empty and vice versa", () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PromptBubbleEditor initialSegments={[]} onChange={onChange} />
    )

    expect(onChange).not.toHaveBeenCalled()

    // 外部から initialSegments が変更された場合
    const newSegments: PromptSegment[] = [{ type: "text", value: "new token" }]
    rerender(
      <PromptBubbleEditor initialSegments={newSegments} onChange={onChange} />
    )

    expect(screen.getByText("new token")).toBeDefined()

    // さらに空配列に戻された場合
    rerender(<PromptBubbleEditor initialSegments={[]} onChange={onChange} />)
    expect(screen.queryByText("new token")).toBeNull()
  })

  it("shows download model button when status is idle", () => {
    vi.mocked(useAiPromptDeclutter).mockReturnValue({
      status: "idle",
      progress: 0,
      startDownload: vi.fn(),
      loading: false,
      error: null,
      declutterPrompt: vi.fn(),
      isModelReady: false
    } as any)

    render(<PromptBubbleEditor initialSegments={[]} />)
    expect(screen.getByText(/Download Model/i)).toBeDefined()
  })

  it("shows progress when downloading model", () => {
    vi.mocked(useAiPromptDeclutter).mockReturnValue({
      status: "downloading",
      progress: 45.6,
      startDownload: vi.fn(),
      loading: false,
      error: null,
      declutterPrompt: vi.fn(),
      isModelReady: false
    } as any)

    render(<PromptBubbleEditor initialSegments={[]} />)
    expect(screen.getByText(/Downloading Model\.\.\. 46%/i)).toBeDefined()
  })

  it("triggers de-clutter and updates segments when status is ready", async () => {
    const mockDeclutter = vi.fn().mockResolvedValue([
      { type: "text", value: "hello" },
      { type: "text", value: "world" }
    ])
    const onChange = vi.fn()

    vi.mocked(useAiPromptDeclutter).mockReturnValue({
      status: "ready",
      progress: 100,
      startDownload: vi.fn(),
      loading: false,
      error: null,
      declutterPrompt: mockDeclutter,
      isModelReady: true
    } as any)

    render(
      <PromptBubbleEditor
        initialSegments={[{ type: "text", value: "hello world" }]}
        onChange={onChange}
      />
    )

    const declutterBtn = screen.getByRole("button", {
      name: /De-clutter with AI/i
    })
    expect(declutterBtn).toBeDefined()

    fireEvent.click(declutterBtn)

    await waitFor(() => {
      expect(mockDeclutter).toHaveBeenCalledWith("hello world")
      expect(onChange).toHaveBeenCalledWith([
        { type: "text", value: "hello" },
        { type: "text", value: "world" }
      ])
    })
  })
})
