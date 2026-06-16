import type { StyleCard } from "../lib/db-schema"

export const isMock =
  new URLSearchParams(window.location.search).get("mock") === "true"
const MOCK_STORAGE_KEY = "mock_gdrive_appdata_temp_shared_cards"

declare const google: any
let tokenClient: any = null

export function initGisClient(
  onTokenReceived: (token: string) => void,
  onError: () => void
) {
  if (isMock) return
  if (typeof google === "undefined") {
    console.warn(
      "Google Identity Services SDK is not loaded yet. Retrying in 1s..."
    )
    setTimeout(() => initGisClient(onTokenReceived, onError), 1000)
    return
  }
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id:
        "81426269486-2pi6vl3bqhdr6l9tn1pddv6vh2mu3u0t.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: async (response: any) => {
        if (response.error) {
          console.error("OAuth error:", response)
          onError()
          return
        }
        if (response.access_token) {
          onTokenReceived(response.access_token)
        } else {
          onError()
        }
      }
    })
  } catch (err) {
    console.error("Failed to initialize GIS client:", err)
    onError()
  }
}

export function requestAccessToken(): boolean {
  if (tokenClient) {
    tokenClient.requestAccessToken()
    return true
  }
  return false
}

export type SaveResult = "success" | "duplicate" | "error"

export async function saveToGoogleDrive(
  token: string,
  card: Partial<StyleCard>
): Promise<SaveResult> {
  try {
    const fileId = await searchTempCardsFile(token)
    let existingCards: any[] = []
    if (fileId) {
      existingCards = await getTempCardsContent(token, fileId)
      if (!Array.isArray(existingCards)) {
        existingCards = []
      }
    }

    const isDuplicate = existingCards.some((existing: any) => {
      if (card.id && existing.id === card.id) return true
      const existingPrompt =
        existing.promptSegments?.map((s: any) => s.text).join("") || ""
      const currentPrompt =
        card.promptSegments?.map((s: any) => s.text).join("") || ""
      return existingPrompt === currentPrompt && existing.name === card.name
    })

    if (isDuplicate) {
      return "duplicate"
    }

    const updatedCards = [...existingCards, card]
    if (fileId) {
      await updateTempCardsFile(token, fileId, updatedCards)
    } else {
      await createTempCardsFile(token, updatedCards)
    }
    return "success"
  } catch (err) {
    console.error("Save to Google Drive failed:", err)
    return "error"
  }
}

async function searchTempCardsFile(token: string): Promise<string | null> {
  if (isMock) {
    return "mock-file-id-123"
  }
  const query = encodeURIComponent(
    "name='temp_shared_cards.json' and 'appDataFolder' in parents"
  )
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  return null
}

async function getTempCardsContent(
  token: string,
  fileId: string
): Promise<any[]> {
  if (isMock) {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`Get content failed: ${res.status} ${res.statusText}`)
  }
  try {
    return await res.json()
  } catch {
    return []
  }
}

async function updateTempCardsFile(
  token: string,
  fileId: string,
  content: any[]
): Promise<void> {
  const jsonData = JSON.stringify(content)
  if (isMock) {
    localStorage.setItem(MOCK_STORAGE_KEY, jsonData)
    return
  }
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: jsonData
  })
  if (!res.ok) {
    throw new Error(`Update file failed: ${res.status} ${res.statusText}`)
  }
}

async function createTempCardsFile(
  token: string,
  content: any[]
): Promise<void> {
  const jsonData = JSON.stringify(content)
  if (isMock) {
    localStorage.setItem(MOCK_STORAGE_KEY, jsonData)
    return
  }
  const boundary = "temp_shared_cards_boundary"
  const metadata = {
    name: "temp_shared_cards.json",
    parents: ["appDataFolder"]
  }
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`
  const multipartBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    jsonData +
    closeDelimiter

  const url =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  })
  if (!res.ok) {
    throw new Error(`Create file failed: ${res.status} ${res.statusText}`)
  }
}
