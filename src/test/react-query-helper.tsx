import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

/**
 * Creates a QueryClient configured for testing (with retries disabled to avoid test delays)
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

interface QueryTestProviderProps {
  children: React.ReactNode
  client?: QueryClient
}

/**
 * A test wrapper component that provides a clean QueryClient instance to its children.
 */
export function QueryTestProvider({
  children,
  client
}: QueryTestProviderProps) {
  const queryClient = client || createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
