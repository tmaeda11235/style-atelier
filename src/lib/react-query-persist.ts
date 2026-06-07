import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false // Prevents aggressive refetching in SidePanel
    }
  }
})

export const chromeAsyncStorage = {
  getItem: async (key: string) => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      const data = await chrome.storage.local.get(key)
      return data[key] ? (data[key] as string) : null
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key)
    }
    return null
  },
  setItem: async (key: string, value: string) => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      await chrome.storage.local.set({ [key]: value })
    } else if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem: async (key: string) => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      await chrome.storage.local.remove(key)
    } else if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key)
    }
  }
}

export const chromeStoragePersister = createAsyncStoragePersister({
  storage: chromeAsyncStorage
})
