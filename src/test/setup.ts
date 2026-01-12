import "@testing-library/jest-dom"

// Mock IndexedDB to prevent errors in tests that rely on it
// This is a minimal mock to prevent `MissingAPIError IndexedDB API missing.`
// For tests that need actual IndexedDB functionality, a more sophisticated mock
// or in-memory IndexedDB library (e.g., 'fake-indexeddb') would be required.
Object.defineProperty(window, "indexedDB", {
  writable: true,
  value: {
    open: () => ({
      // Minimal EventTarget mock for addEventListener
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  },
})