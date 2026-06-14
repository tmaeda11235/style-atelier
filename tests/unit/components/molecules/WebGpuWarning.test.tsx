import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { WebGpuWarning } from "../../../../src/components/molecules/WebGpuWarning"

const mockOpenChromeSettings = vi.fn()
vi.mock("../../../../src/hooks/useWebGpu", () => ({
  useWebGpu: () => ({
    isSupported: false,
    openChromeSettings: mockOpenChromeSettings
  })
}))

describe("WebGpuWarning", () => {
  const mockT = {
    webLlmWebGpuDisabledTitle: "WebGPU is disabled",
    webLlmWebGpuDisabledDesc: "WebGPU is not available",
    webLlmWebGpuTroubleshootingTitle: "Troubleshooting Guide",
    webLlmWebGpuStep1: "Step 1",
    webLlmWebGpuStep2: "Step 2",
    webLlmWebGpuStep3: "Step 3",
    webLlmWebGpuOpenSettingsBtn: "Open Settings"
  }

  it("should render warning title and steps", () => {
    render(<WebGpuWarning t={mockT} />)

    expect(screen.getByText("WebGPU is disabled")).toBeInTheDocument()
    expect(screen.getByText("WebGPU is not available")).toBeInTheDocument()
    expect(screen.getByText("Troubleshooting Guide")).toBeInTheDocument()
    expect(screen.getByText("Step 1")).toBeInTheDocument()
    expect(screen.getByText("Step 2")).toBeInTheDocument()
    expect(screen.getByText("Step 3")).toBeInTheDocument()
  })

  it("should call openChromeSettings when button is clicked", () => {
    render(<WebGpuWarning t={mockT} />)

    const button = screen.getByRole("button", { name: /Open Settings/i })
    fireEvent.click(button)

    expect(mockOpenChromeSettings).toHaveBeenCalled()
  })
})
