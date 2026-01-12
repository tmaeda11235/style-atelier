import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PromptBubbleEditor } from "./PromptBubbleEditor"
import type { PromptSegment } from "../../lib/db-schema"

describe("PromptBubbleEditor", () => {
  const initialSegments: PromptSegment[] = [
    { type: "text", value: "a cute cat" },
    { type: "slot", label: "color", default: "white" },
  ]

  it("renders initial segments", () => {
    render(<PromptBubbleEditor initialSegments={initialSegments} />)
    expect(screen.getByText("a cute cat")).toBeDefined()
    expect(screen.getByText("color")).toBeDefined()
  })

  it("adds a new token on Enter", () => {
    const onChange = vi.fn()
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

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
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "forest" } })
    fireEvent.keyDown(input, { key: ",", code: "Comma" })

    expect(screen.getByText("forest")).toBeDefined()
    expect(onChange).toHaveBeenCalled()
  })

  it("adds a new token on Japanese delimiters", () => {
    const onChange = vi.fn()
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

    const input = screen.getByPlaceholderText("")
    
    // Test with Japanese comma
    fireEvent.change(input, { target: { value: "猫" } })
    fireEvent.keyDown(input, { key: "、" })
    expect(screen.getByText("猫")).toBeDefined()

    // Test with Japanese period
    fireEvent.change(input, { target: { value: "走る" } })
    fireEvent.keyDown(input, { key: "。" })
    expect(screen.getByText("走る")).toBeDefined()
  })

  it("splits multiple tokens by delimiters", () => {
    const onChange = vi.fn()
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

    const input = screen.getByPlaceholderText("")
    fireEvent.change(input, { target: { value: "red,blue;green:yellow" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(screen.getByText("red")).toBeDefined()
    expect(screen.getByText("blue")).toBeDefined()
    expect(screen.getByText("green")).toBeDefined()
    expect(screen.getByText("yellow")).toBeDefined()
  })

  it("removes a segment when clicking remove button", () => {
    const onChange = vi.fn()
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

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
    render(<PromptBubbleEditor initialSegments={initialSegments} onChange={onChange} />)

    const input = screen.getByPlaceholderText("")
    fireEvent.keyDown(input, { key: "Backspace", code: "Backspace" })

    expect(screen.queryByText("color")).toBeNull()
    expect(onChange).toHaveBeenCalled()
  })
})