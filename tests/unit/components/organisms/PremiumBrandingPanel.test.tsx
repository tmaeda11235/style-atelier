import { PremiumBrandingPanel } from "@/components/organisms/PremiumBrandingPanel"
import type { UserSettings } from "@/shared/lib/db-schema"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("PremiumBrandingPanel", () => {
  const defaultProps = {
    isPremium: true,
    userSettings: {
      userId: "user-1",
      isPro: true,
      unlockedSkins: [],
      branding: {
        enabled: true,
        customLogo: "data:image/png;base64,123",
        twitter: "my_twitter",
        etsy: "my_etsy",
        socialDisplayType: "text" as const
      }
    } as UserSettings,
    onUpdateBranding: vi.fn(),
    onUpgrade: vi.fn()
  }

  const noLogoProps = {
    ...defaultProps,
    userSettings: {
      ...defaultProps.userSettings,
      branding: {
        ...defaultProps.userSettings.branding,
        customLogo: undefined
      }
    } as UserSettings
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders upgrade banner when not premium", () => {
    render(<PremiumBrandingPanel {...defaultProps} isPremium={false} />)
    expect(screen.getByText("Premium Custom Branding (Pro Only)")).toBeDefined()

    const banner = screen.getByTestId("premium-branding-upgrade-banner")
    fireEvent.click(banner)
    expect(defaultProps.onUpgrade).toHaveBeenCalled()
  })

  it("renders customization controls when premium", () => {
    render(<PremiumBrandingPanel {...defaultProps} />)
    expect(screen.getByText("Branding Options")).toBeDefined()
    expect(screen.getByDisplayValue("my_twitter")).toBeDefined()
    expect(screen.getByDisplayValue("my_etsy")).toBeDefined()
    expect(screen.getByDisplayValue("Show as Text")).toBeDefined()
  })

  it("handles updating social inputs", () => {
    render(<PremiumBrandingPanel {...defaultProps} />)

    const twitterInput = screen.getByTestId("twitter-input")
    fireEvent.change(twitterInput, { target: { value: "new_twitter" } })
    expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
      twitter: "new_twitter"
    })

    const etsyInput = screen.getByTestId("etsy-input")
    fireEvent.change(etsyInput, { target: { value: "new_etsy" } })
    expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
      etsy: "new_etsy"
    })
  })

  it("handles updating social display select", () => {
    render(<PremiumBrandingPanel {...defaultProps} />)

    const select = screen.getByTestId("social-display-select")
    fireEvent.change(select, { target: { value: "qr" } })
    expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
      socialDisplayType: "qr"
    })
  })

  it("handles image upload on dragover, dragleave and drop", () => {
    render(<PremiumBrandingPanel {...noLogoProps} />)

    const dropZone = screen.getByTestId("logo-dropzone")

    // Drag Over
    fireEvent.dragOver(dropZone)
    expect(dropZone.className).toContain("border-blue-500")

    // Drag Leave
    fireEvent.dragLeave(dropZone)
    expect(dropZone.className).not.toContain("border-blue-500")

    // Drop file
    const file = new File(["dummy"], "logo.png", { type: "image/png" })

    // Mock FileReader
    const dummyDataUrl = "data:image/png;base64,dummy"
    const readAsDataURLMock = vi.fn()
    const originalFileReader = global.FileReader

    class MockFileReader {
      onload: any = null
      result = dummyDataUrl
      readAsDataURL(f: any) {
        readAsDataURLMock(f)
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: this.result } })
          }
        }, 0)
      }
    }
    global.FileReader = MockFileReader as any

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    })

    // Wait for onload
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(readAsDataURLMock).toHaveBeenCalledWith(file)
        expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
          customLogo: dummyDataUrl
        })
        global.FileReader = originalFileReader
        resolve()
      }, 50)
    })
  })

  it("handles file input change", () => {
    render(<PremiumBrandingPanel {...noLogoProps} />)
    const fileInput = screen.getByTestId("logo-file-input")
    const file = new File(["dummy"], "logo.png", { type: "image/png" })

    const dummyDataUrl = "data:image/png;base64,dummy"
    const readAsDataURLMock = vi.fn()
    const originalFileReader = global.FileReader

    class MockFileReader {
      onload: any = null
      result = dummyDataUrl
      readAsDataURL(f: any) {
        readAsDataURLMock(f)
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: this.result } })
          }
        }, 0)
      }
    }
    global.FileReader = MockFileReader as any

    fireEvent.change(fileInput, { target: { files: [file] } })

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(readAsDataURLMock).toHaveBeenCalledWith(file)
        expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
          customLogo: dummyDataUrl
        })
        global.FileReader = originalFileReader
        resolve()
      }, 50)
    })
  })

  it("handles logo removal", () => {
    render(<PremiumBrandingPanel {...defaultProps} />)
    const removeBtn = screen.getByTestId("delete-custom-logo-button")
    fireEvent.click(removeBtn)
    expect(defaultProps.onUpdateBranding).toHaveBeenCalledWith({
      customLogo: undefined
    })
  })

  it("does not crash on drop or change with empty files", () => {
    render(<PremiumBrandingPanel {...noLogoProps} />)
    const dropZone = screen.getByTestId("logo-dropzone")
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [] }
    })

    const fileInput = screen.getByTestId("logo-file-input")
    fireEvent.change(fileInput, { target: { files: [] } })

    expect(defaultProps.onUpdateBranding).not.toHaveBeenCalled()
  })

  it("rejects logos larger than 1MB", () => {
    render(<PremiumBrandingPanel {...noLogoProps} />)
    const dropZone = screen.getByTestId("logo-dropzone")

    const largeFile = new File(
      [new ArrayBuffer(1024 * 1024 + 10)],
      "large.png",
      { type: "image/png" }
    )

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [largeFile] }
    })

    expect(largeFile).toBeDefined() // to satisfy unused var check
    expect(alertSpy).toHaveBeenCalledWith("Image size must be less than 1MB.")
    alertSpy.mockRestore()
  })
})
