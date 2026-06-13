import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { ModelIdleOverlay } from "../../../../src/components/molecules/ModelIdleOverlay"

describe("ModelIdleOverlay", () => {
  const mockStartDownload = vi.fn()
  const mockT = {
    aiAdviceModelNotReady:
      "Local AI model is not loaded. Download it to activate recipe advice.",
    webLlmDownloadBtn: "Download Model",
    webLlmDownloadConfirmTitle: "Confirm Download",
    webLlmDownloadConfirmDesc:
      "This will download a ~2.0 GB model file. High data usage will occur.",
    webLlmDownloadSize: "Download Size: ~2.0 GB",
    webLlmDiskSpaceWarning: "Required space: ~2.5 GB",
    webLlmCancelBtn: "Cancel",
    webLlmDownloadConfirmBtn: "Download"
  }

  it("renders initial default view correctly", () => {
    render(<ModelIdleOverlay startDownload={mockStartDownload} t={mockT} />)

    expect(screen.getByText(/Local AI model is not loaded/i)).toBeDefined()
    expect(screen.getByText(/Download Size: ~2\.0 GB/i)).toBeDefined()
    expect(
      screen.getByRole("button", { name: /Download Model/i })
    ).toBeDefined()
  })

  it("transitions to confirmation view on download button click", () => {
    render(<ModelIdleOverlay startDownload={mockStartDownload} t={mockT} />)

    const downloadBtn = screen.getByRole("button", { name: /Download Model/i })
    fireEvent.click(downloadBtn)

    expect(screen.getByText("Confirm Download")).toBeDefined()
    expect(
      screen.getByText(/This will download a ~2\.0 GB model file/i)
    ).toBeDefined()
    expect(screen.getByText("Required space: ~2.5 GB")).toBeDefined()

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Start Download" })).toBeDefined()
  })

  it("reverts to default view on cancel button click", () => {
    render(<ModelIdleOverlay startDownload={mockStartDownload} t={mockT} />)

    fireEvent.click(screen.getByRole("button", { name: /Download Model/i }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(
      screen.getByRole("button", { name: /Download Model/i })
    ).toBeDefined()
    expect(screen.queryByText("Confirm Download")).toBeNull()
  })

  it("calls startDownload on confirm download button click", () => {
    render(<ModelIdleOverlay startDownload={mockStartDownload} t={mockT} />)

    fireEvent.click(screen.getByRole("button", { name: /Download Model/i }))
    fireEvent.click(screen.getByRole("button", { name: "Start Download" }))

    expect(mockStartDownload).toHaveBeenCalledTimes(1)
  })
})
