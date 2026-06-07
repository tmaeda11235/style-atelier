import { render, screen } from "@testing-library/react"
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SidePanelLayout } from "./SidePanelLayout"

describe("SidePanelLayout", () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it("should render debug logs when NODE_ENV is development", () => {
    process.env.NODE_ENV = "development"
    render(
      <SidePanelLayout
        activeTab="history"
        onTabChange={vi.fn()}
        isDragging={false}
        logs={["test-log-item"]}
        onClearLogs={vi.fn()}
        onResetDb={vi.fn()}
        droppedItem={null}
        onOpenGuide={vi.fn()}>
        <div>Test Child Content</div>
      </SidePanelLayout>
    )

    expect(screen.getByText("Debug Logs")).toBeInTheDocument()
    expect(screen.getByText("> test-log-item")).toBeInTheDocument()
  })

  it("should not render debug logs when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production"
    render(
      <SidePanelLayout
        activeTab="history"
        onTabChange={vi.fn()}
        isDragging={false}
        logs={["test-log-item"]}
        onClearLogs={vi.fn()}
        onResetDb={vi.fn()}
        droppedItem={null}
        onOpenGuide={vi.fn()}>
        <div>Test Child Content</div>
      </SidePanelLayout>
    )

    expect(screen.queryByText("Debug Logs")).not.toBeInTheDocument()
    expect(screen.queryByText("> test-log-item")).not.toBeInTheDocument()
  })

  it("should render the Guide button when isEasyMode is false or undefined", () => {
    render(
      <SidePanelLayout
        activeTab="history"
        onTabChange={vi.fn()}
        isDragging={false}
        logs={[]}
        onClearLogs={vi.fn()}
        onResetDb={vi.fn()}
        droppedItem={null}
        onOpenGuide={vi.fn()}
        isEasyMode={false}>
        <div>Test Child Content</div>
      </SidePanelLayout>
    )

    expect(screen.getByTitle("Show Guide")).toBeInTheDocument()
  })

  it("should not render the Guide button when isEasyMode is true", () => {
    render(
      <SidePanelLayout
        activeTab="history"
        onTabChange={vi.fn()}
        isDragging={false}
        logs={[]}
        onClearLogs={vi.fn()}
        onResetDb={vi.fn()}
        droppedItem={null}
        onOpenGuide={vi.fn()}
        isEasyMode={true}>
        <div>Test Child Content</div>
      </SidePanelLayout>
    )

    expect(screen.queryByTitle("Show Guide")).not.toBeInTheDocument()
  })
})
