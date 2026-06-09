import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { SearchField } from "./SearchField"

describe("SearchField", () => {
  it("renders input field", () => {
    render(<SearchField placeholder="Search here" />)
    expect(screen.getByPlaceholderText("Search here")).toBeInTheDocument()
  })

  it("shows dropdown on focus", () => {
    const options = ["apple", "banana"]
    render(
      <SearchField placeholder="Search here" options={options} value="ap" />
    )

    const input = screen.getByPlaceholderText("Search here")
    expect(screen.queryByText("apple")).toBeNull()

    fireEvent.focus(input)
    expect(screen.getByText("apple")).toBeInTheDocument()
  })

  it("handles dropdown option selection", () => {
    const options = ["apple", "banana"]
    const handleChange = vi.fn()

    render(
      <SearchField
        placeholder="Search here"
        options={options}
        value="ap"
        onChange={handleChange}
      />
    )

    const input = screen.getByPlaceholderText("Search here")
    fireEvent.focus(input)

    const option = screen.getByText("apple")
    fireEvent.click(option)

    expect(handleChange).toHaveBeenCalled()
    const syntheticEvent = handleChange.mock.calls[0][0]
    expect(syntheticEvent.target.value).toBe("apple")
  })
})
