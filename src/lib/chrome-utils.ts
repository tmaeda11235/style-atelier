/**
 * Helper utilities to interact with Chrome Extension APIs safely,
 * preventing uncaught exceptions when the extension context is invalidated.
 */

/**
 * Checks if the Chrome extension context is currently valid and active.
 * Context gets invalidated when the extension is updated or reloaded.
 */
export function isExtensionContextValid(): boolean {
  return (
    typeof chrome !== "undefined" &&
    chrome.runtime !== undefined &&
    chrome.runtime.id !== undefined
  )
}

/**
 * Safely sends a message to the background or other extension pages (e.g. offscreen).
 * Catches "Extension context invalidated" errors and returns a rejected promise or structured error.
 */
export function safeSendMessage<M = any, R = any>(
  message: M,
  responseCallback?: (response: R) => void
): Promise<R> | void {
  if (!isExtensionContextValid()) {
    const err = new Error("Extension context invalidated")
    if (responseCallback) {
      console.warn("safeSendMessage: Extension context invalidated")
      return
    }
    return Promise.reject(err)
  }

  if (responseCallback) {
    try {
      chrome.runtime.sendMessage(message, responseCallback)
      return
    } catch (err: any) {
      console.error("safeSendMessage error:", err)
      return
    }
  }

  try {
    const returnValue = chrome.runtime.sendMessage(message) as any
    if (returnValue && typeof returnValue.then === "function") {
      return returnValue as Promise<R>
    }
  } catch {
    // Fallback to callback if promise-based invocation fails
  }

  return new Promise<R>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(res)
        }
      })
    } catch (err: any) {
      reject(err)
    }
  })
}

/**
 * Safe wrapper for chrome.tabs.sendMessage that checks context validity
 * and catches synchronous/asynchronous errors.
 */
export function safeSendTabMessage<M = any, R = any>(
  tabId: number,
  message: M,
  responseCallback?: (response: R) => void
): Promise<R> | void {
  if (!isExtensionContextValid()) {
    const err = new Error("Extension context invalidated")
    if (responseCallback) {
      console.warn("safeSendTabMessage: Extension context invalidated")
      return
    }
    return Promise.reject(err)
  }

  if (responseCallback) {
    try {
      chrome.tabs.sendMessage(tabId, message, responseCallback)
      return
    } catch (err: any) {
      console.error("safeSendTabMessage error:", err)
      return
    }
  }

  try {
    const returnValue = chrome.tabs.sendMessage(tabId, message) as any
    if (returnValue && typeof returnValue.then === "function") {
      return returnValue as Promise<R>
    }
  } catch {
    // Fallback to callback if promise-based invocation fails
  }

  return new Promise<R>((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(res)
        }
      })
    } catch (err: any) {
      reject(err)
    }
  })
}

/**
 * Safe wrapper for chrome.tabs.query that checks context validity
 * and catches synchronous/asynchronous errors.
 */
export function safeQueryTabs(
  queryInfo: chrome.tabs.QueryInfo,
  callback?: (result: chrome.tabs.Tab[]) => void
): Promise<chrome.tabs.Tab[]> | void {
  if (!isExtensionContextValid()) {
    const err = new Error("Extension context invalidated")
    if (callback) {
      console.warn("safeQueryTabs: Extension context invalidated")
      return
    }
    return Promise.reject(err)
  }

  if (callback) {
    try {
      chrome.tabs.query(queryInfo, callback)
      return
    } catch (err: any) {
      console.error("safeQueryTabs error:", err)
      return
    }
  }

  try {
    const returnValue = chrome.tabs.query(queryInfo) as any
    if (returnValue && typeof returnValue.then === "function") {
      return returnValue as Promise<chrome.tabs.Tab[]>
    }
  } catch {
    // Fallback to callback if promise-based invocation fails
  }

  return new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
    try {
      chrome.tabs.query(queryInfo, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(res)
        }
      })
    } catch (err: any) {
      reject(err)
    }
  })
}
