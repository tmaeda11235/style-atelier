import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { P2PSyncUI } from "../../../src/components/P2PSyncUI"

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
    render(<P2PSyncUI t={mockT} />)

    expect(screen.getByText("Local P2P Sync")).toBeInTheDocument()
    expect(screen.getByText("Receive on PC")).toBeInTheDocument()
    expect(screen.getByText("Send from Mobile")).toBeInTheDocument()
  })

  it("should transition to receiver (host) mode on click", async () => {
    render(<P2PSyncUI t={mockT} />)

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

    render(<P2PSyncUI t={mockT} />)

    const sendBtn = screen.getByText("Send from Mobile")
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText("P2P Sync Sender Mode")).toBeInTheDocument()
    })
  })
})
