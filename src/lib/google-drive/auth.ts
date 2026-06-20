/**
 * Trigger OAuth2 authorization flow using chrome.identity.getAuthToken (Native Chrome Extension flow)
 */
export async function authorize(interactive = true): Promise<string> {
  if (
    typeof chrome === "undefined" ||
    !chrome.identity ||
    !chrome.identity.getAuthToken
  ) {
    throw new Error(
      "Chrome Identity API is not available. This feature only works inside the Chrome Extension environment."
    )
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive
      },
      (token) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message))
        }
        if (token) {
          const actualToken =
            typeof token === "string" ? token : (token as any).token
          resolve(actualToken)
        } else {
          reject(new Error("Authorization failed: empty access token"))
        }
      }
    )
  })
}

/**
 * Remove cached auth token if it expires or becomes invalid
 */
export async function clearCachedToken(token: string): Promise<void> {
  if (
    typeof chrome === "undefined" ||
    !chrome.identity ||
    !chrome.identity.removeCachedAuthToken
  ) {
    return
  }

  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve()
    })
  })
}
