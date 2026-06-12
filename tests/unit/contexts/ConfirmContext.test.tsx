import { ConfirmProvider, useConfirm } from "@/contexts/ConfirmContext"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

// Create a test component to consume the hook
const TestComponent = ({
  options,
  onResult
}: {
  options: any
  onResult: (val: boolean) => void
}) => {
  const confirm = useConfirm()
  const handleClick = async () => {
    const result = await confirm(options)
    onResult(result)
  }
  return <button onClick={handleClick}>Trigger Confirm</button>
}

describe("ConfirmContext & useConfirm hook", () => {
  it("should throw error when useConfirm is used outside ConfirmProvider", () => {
    const BrokenComponent = () => {
      useConfirm()
      return null
    }

    // Suppress console.error output for the expected throw
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<BrokenComponent />)).toThrow(
      "useConfirm must be used within a ConfirmProvider"
    )
    consoleSpy.mockRestore()
  })

  it("should open confirmation dialog and resolve true on confirm", async () => {
    const handleResult = vi.fn()
    render(
      <ConfirmProvider>
        <TestComponent
          options={{
            title: "Are you sure?",
            message: "This is a test message.",
            confirmText: "Yes",
            cancelText: "No",
            variant: "danger"
          }}
          onResult={handleResult}
        />
      </ConfirmProvider>
    )

    // Trigger dialog
    const btn = screen.getByText("Trigger Confirm")
    act(() => {
      btn.click()
    })

    // Dialog contents should render (ConfirmationDialog uses portals or standard render depending on structure)
    expect(screen.getByText("Are you sure?")).toBeDefined()
    expect(screen.getByText("This is a test message.")).toBeDefined()

    const confirmBtn = screen.getByText("Yes")
    await act(async () => {
      confirmBtn.click()
    })

    expect(handleResult).toHaveBeenCalledWith(true)
  })

  it("should resolve false on cancel", async () => {
    const handleResult = vi.fn()
    render(
      <ConfirmProvider>
        <TestComponent
          options={{
            title: "Cancel test",
            message: "Cancel message",
            confirmText: "Yes",
            cancelText: "No"
          }}
          onResult={handleResult}
        />
      </ConfirmProvider>
    )

    const btn = screen.getByText("Trigger Confirm")
    act(() => {
      btn.click()
    })

    const cancelBtn = screen.getByText("No")
    await act(async () => {
      cancelBtn.click()
    })

    expect(handleResult).toHaveBeenCalledWith(false)
  })
})
