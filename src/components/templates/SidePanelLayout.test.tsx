import React from "react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
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
        onOpenGuide={vi.fn()}
      >
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
        onOpenGuide={vi.fn()}
      >
        <div>Test Child Content</div>
      </SidePanelLayout>
    )

    expect(screen.queryByText("Debug Logs")).not.toBeInTheDocument()
    expect(screen.queryByText("> test-log-item")).not.toBeInTheDocument()
  })
})
