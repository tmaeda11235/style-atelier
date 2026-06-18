import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { P2PSyncProgressTracker } from "../../../src/components/P2PSyncCommonViews"
import { P2PSyncUI } from "../../../src/components/P2PSyncUI"
import { P2PSyncProvider } from "../../../src/contexts/P2PSyncContext"

// Mock submodules
vi.mock("../../../src/lib/qr-utils", () => ({
  generateQRCodeUrl: vi
    .fn()
    .mockResolvedValue("data:image/png;base64,mock-qr-code")
}))

vi.mock("../../../src/lib/p2p-connection", () => {
  return {
    P2PConnection: class {
      close = vi.fn()
      send = vi.fn()
    }
  }
})

describe("P2PSyncUI Component", () => {
  const mockT = {
    title: "Local P2P Sync",
    description: "Securely synchronize cards and custom categories directly.",
    receiveBtn: "Receive on PC",
    receiveDesc: "Show QR to receive cards",
    sendBtn: "Send from Mobile",
    sendDesc: "Scan QR to transmit data",
    receiveTitle: "P2P Sync Receiver Mode",
    sendTitle: "P2P Sync Sender Mode"
  }

  it("should render selection buttons in idle state", () => {
    render(
      <P2PSyncProvider t={mockT}>
        <P2PSyncUI t={mockT} />
      </P2PSyncProvider>
    )

    expect(screen.getByText("Local P2P Sync")).toBeInTheDocument()
    expect(screen.getByText("Receive on PC")).toBeInTheDocument()
    expect(screen.getByText("Send from Mobile")).toBeInTheDocument()
  })

  it("should transition to receiver (host) mode on click", async () => {
    render(
      <P2PSyncProvider t={mockT}>
        <P2PSyncUI t={mockT} />
      </P2PSyncProvider>
    )

    const receiveBtn = screen.getByText("Receive on PC")
    fireEvent.click(receiveBtn)

    expect(screen.getByText("P2P Sync Receiver Mode")).toBeInTheDocument()

    // Check if QR code image is rendered
    await waitFor(() => {
      const qrImg = screen.getByAltText("Sync QR Code")
      expect(qrImg).toBeInTheDocument()
      expect(qrImg.getAttribute("src")).toBe(
        "data:image/png;base64,mock-qr-code"
      )
    })
  })

  it("should transition to sender (guest) mode on click", async () => {
    // Mock getUserMedia to prevent browser prompts during tests
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => []
    })
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: mockGetUserMedia
      },
      writable: true
    })

    render(
      <P2PSyncProvider t={mockT}>
        <P2PSyncUI t={mockT} />
      </P2PSyncProvider>
    )

    const sendBtn = screen.getByText("Send from Mobile")
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText("P2P Sync Sender Mode")).toBeInTheDocument()
    })
  })
})

describe("P2PSyncProgressTracker Component", () => {
  const mockT = {
    phase1: "Phase 1: Syncing database metadata",
    phase2: "Phase 2: Verifying image differences",
    phase3: "Phase 3: Transferring images",
    syncProgress: "Syncing image files: {current}/{total} ({percent}%)",
    closeWarning:
      "Please do not close this panel until the synchronization is complete"
  }

  it("should render close warning and active phase 1", () => {
    const { container } = render(
      <P2PSyncProgressTracker t={mockT} syncProgress={{ phase: 1 }} />
    )
    expect(
      screen.getByText(
        "Please do not close this panel until the synchronization is complete"
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("Phase 1: Syncing database metadata")
    ).toBeInTheDocument()
    // Should render step 1 as active loader, and step 2, 3 as pending
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("should render progress bar and index in phase 3", () => {
    render(
      <P2PSyncProgressTracker
        t={mockT}
        syncProgress={{ phase: 3, currentImageIndex: 2, totalImages: 10 }}
      />
    )
    expect(
      screen.getByText("Syncing image files: 3/10 (30%)")
    ).toBeInTheDocument()
    expect(screen.getByText("30%")).toBeInTheDocument()
  })
})
