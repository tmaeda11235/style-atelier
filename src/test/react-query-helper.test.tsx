import { useQuery } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"

import { createTestQueryClient, QueryTestProvider } from "./react-query-helper"

describe("react-query-helper", () => {
  it("should create a test QueryClient with retries disabled", () => {
    const client = createTestQueryClient()
    expect(client.getDefaultOptions().queries?.retry).toBe(false)
    expect(client.getDefaultOptions().queries?.gcTime).toBe(0)
    expect(client.getDefaultOptions().queries?.staleTime).toBe(0)
    expect(client.getDefaultOptions().mutations?.retry).toBe(false)
  })

  it("should provide QueryClient context to child hooks", async () => {
    const TestComponent = () => {
      const { data, isLoading } = useQuery({
        queryKey: ["test"],
        queryFn: () => Promise.resolve("test-data")
      })
      if (isLoading) return <div>loading</div>
      return <div>{data}</div>
    }

    const { findByText } = render(
      <QueryTestProvider>
        <TestComponent />
      </QueryTestProvider>
    )

    expect(await findByText("test-data")).toBeInTheDocument()
  })
})
