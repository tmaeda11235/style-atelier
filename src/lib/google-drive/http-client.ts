import { authorize, clearCachedToken } from "./auth"
import {
  GDriveQuotaError,
  GDriveRateLimitError,
  GDriveTimeoutError,
  type ReauthContext
} from "./types"

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = 10000, signal, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    signal.addEventListener("abort", () => controller.abort())
    if (signal.aborted) controller.abort()
  }

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal })
  } catch (error: any) {
    if (error.name === "AbortError") {
      if (signal?.aborted) throw error
      throw new GDriveTimeoutError()
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const configureXhr = (
  xhr: XMLHttpRequest,
  options?: { signal?: AbortSignal; timeoutMs?: number },
  onAbort?: () => void
) => {
  const timeoutMs = options?.timeoutMs ?? 10000
  xhr.timeout = timeoutMs

  if (options?.signal) {
    const onAbortTriggered = () => {
      xhr.abort()
      if (onAbort) onAbort()
    }
    options.signal.addEventListener("abort", onAbortTriggered)
    return () => {
      options.signal?.removeEventListener("abort", onAbortTriggered)
    }
  }
  return () => {}
}

/**
 * A wrapper around fetch that automatically handles 401 Unauthorized (invalid/expired token)
 */
export async function fetchWithReauth(
  url: string,
  options: RequestInit & { timeoutMs?: number; signal?: AbortSignal },
  context: ReauthContext,
  onTokenUpdated?: (newToken: string) => void
): Promise<Response> {
  let res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${context.token}`
    }
  })

  if (res.status === 401) {
    console.warn(
      "Google Drive API returned 401. Stale token detected. Clearing cache and retrying silently..."
    )
    await clearCachedToken(context.token)
    try {
      const newToken = await authorize(false) // interactive = false
      context.token = newToken
      if (onTokenUpdated) onTokenUpdated(newToken)

      res = await fetchWithTimeout(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      })
    } catch (reauthErr: any) {
      console.error("Silent re-authorization failed:", reauthErr)
      throw new Error(
        `Google Drive authentication expired: ${reauthErr.message || reauthErr}`,
        { cause: reauthErr }
      )
    }
  }

  return res
}

export function sendResumableXhr(
  uploadUrl: string,
  blob: Blob,
  token: string,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ status: number; responseText: string }> {
  return new Promise<{ status: number; responseText: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", uploadUrl, true)
      xhr.setRequestHeader("Content-Type", "application/json")

      const cleanup = configureXhr(xhr, options, () => {
        reject(new Error("Upload aborted by user"))
      })

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        cleanup()
        resolve({ status: xhr.status, responseText: xhr.responseText })
      }
      xhr.ontimeout = () => {
        cleanup()
        reject(new GDriveTimeoutError())
      }
      xhr.onerror = () => {
        cleanup()
        reject(new Error("Network error during resumable upload."))
      }
      xhr.send(blob)
    }
  )
}

export function sendSimpleXhr(
  method: string,
  url: string,
  contentType: string,
  body: string,
  token: string,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ status: number; responseText: string }> {
  return new Promise<{ status: number; responseText: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(method, url, true)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.setRequestHeader("Content-Type", contentType)

      const cleanup = configureXhr(xhr, options, () => {
        reject(new Error("Upload aborted by user"))
      })

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        cleanup()
        resolve({ status: xhr.status, responseText: xhr.responseText })
      }
      xhr.ontimeout = () => {
        cleanup()
        reject(new GDriveTimeoutError())
      }
      xhr.onerror = () => {
        cleanup()
        reject(
          new Error(
            `Network error during simple ${method === "PATCH" ? "update" : "creation"}.`
          )
        )
      }
      xhr.send(body)
    }
  )
}

function parseXhr403Error(responseText: string): Error | null {
  try {
    const errorData = JSON.parse(responseText)
    const errors = errorData?.error?.errors
    if (!Array.isArray(errors)) return null

    for (const err of errors) {
      if (
        err.reason === "rateLimitExceeded" ||
        err.reason === "userRateLimitExceeded"
      ) {
        return new GDriveRateLimitError(
          err.message || "Google Drive API rate limit exceeded."
        )
      }
      if (
        err.reason === "quotaExceeded" ||
        err.reason === "storageQuotaExceeded"
      ) {
        return new GDriveQuotaError(
          err.message || "Google Drive storage quota exceeded."
        )
      }
    }
  } catch {
    // ignore JSON parse error
  }
  return null
}

export function parseXhrErrorStatus(
  status: number,
  defaultMessage = "Upload failed",
  responseText?: string
): Error {
  if (status === 429) {
    return new GDriveRateLimitError("Google Drive API rate limit exceeded.")
  }
  if (status === 507) {
    return new GDriveQuotaError("Google Drive storage quota exceeded.")
  }
  if (status === 403 && responseText) {
    const parsed = parseXhr403Error(responseText)
    if (parsed) return parsed
  }
  return new Error(`${defaultMessage}: status ${status}`)
}

export async function handleResponseError(
  res: Response,
  defaultMessage: string
): Promise<never> {
  const status = res.status
  let errorData: any = null
  try {
    errorData = await res.json()
  } catch {
    // ignore JSON parse error
  }

  if (status === 429) {
    throw new GDriveRateLimitError("Google Drive API rate limit exceeded.")
  }
  if (status === 507) {
    throw new GDriveQuotaError("Google Drive storage quota exceeded.")
  }

  if (status === 403 && errorData?.error?.errors) {
    for (const err of errorData.error.errors) {
      if (
        err.reason === "rateLimitExceeded" ||
        err.reason === "userRateLimitExceeded"
      ) {
        throw new GDriveRateLimitError(
          err.message || "Google Drive API rate limit exceeded."
        )
      }
      if (
        err.reason === "quotaExceeded" ||
        err.reason === "storageQuotaExceeded"
      ) {
        throw new GDriveQuotaError(
          err.message || "Google Drive storage quota exceeded."
        )
      }
    }
  }

  throw new Error(`${defaultMessage}: ${status} ${res.statusText}`)
}
