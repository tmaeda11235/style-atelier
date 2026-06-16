import type { StyleCard } from "../lib/db-schema"

declare global {
  interface Window {
    google: any
  }
}

let accessToken: string | null = null

// Initialize Google Identity Services token client and get access token
function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken)
      return
    }

    if (
      !window.google ||
      !window.google.accounts ||
      !window.google.accounts.oauth2
    ) {
      reject(new Error("Google Identity Services SDK not loaded."))
      return
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "mock-client-id"

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.appdata",
        callback: (response: any) => {
          if (response.error) {
            reject(
              new Error(
                response.error_description || `Auth error: ${response.error}`
              )
            )
          } else if (response.access_token) {
            accessToken = response.access_token
            resolve(response.access_token)
          } else {
            reject(new Error("No access token returned from Google auth."))
          }
        }
      })
      client.requestAccessToken({ prompt: "consent" })
    } catch (err) {
      reject(err)
    }
  })
}

// Search for 'temp_shared_cards.json' in appDataFolder
async function searchTempSharedCardsFile(
  token: string
): Promise<string | null> {
  const query = encodeURIComponent(
    "name = 'temp_shared_cards.json' and trashed = false"
  )
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=appDataFolder`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    throw new Error(`Failed to search temp file: ${res.statusText}`)
  }

  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  return null
}

// Download existing 'temp_shared_cards.json' content
async function downloadTempSharedCards(
  token: string,
  fileId: string
): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    throw new Error(`Failed to download temp file: ${res.statusText}`)
  }

  return await res.json()
}

// Upload/create new file using multipart upload
async function createTempSharedCardsFile(
  token: string,
  content: string
): Promise<void> {
  const boundary = "style_atelier_mobile_sync_boundary"
  const metadata = {
    name: "temp_shared_cards.json",
    parents: ["appDataFolder"],
    mimeType: "application/json"
  }

  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`
  const body =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    content +
    closeDelimiter

  const url =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  })

  if (!res.ok) {
    throw new Error(`Failed to create temp file: ${res.statusText}`)
  }
}

// Update existing file using simple media upload
async function updateTempSharedCardsFile(
  token: string,
  fileId: string,
  content: string
): Promise<void> {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: content
  })

  if (!res.ok) {
    throw new Error(`Failed to update temp file: ${res.statusText}`)
  }
}

// Normalize and complete StyleCard data helper
function normalizeStyleCard(partialCard: Partial<StyleCard>): StyleCard {
  const cardId = partialCard.id || `mobile-card-${Date.now()}`
  const tierValue = partialCard.tier || "Common"
  const tierNormalized = (tierValue.charAt(0).toUpperCase() +
    tierValue.slice(1).toLowerCase()) as StyleCard["tier"]

  return {
    id: cardId,
    name: partialCard.name || "Unnamed Card",
    createdAt: partialCard.createdAt || Date.now(),
    updatedAt: Date.now(),
    promptSegments: partialCard.promptSegments || [],
    parameters: {
      ar: partialCard.parameters?.ar,
      sref: partialCard.parameters?.sref,
      cref: partialCard.parameters?.cref,
      p: partialCard.parameters?.p,
      imagePrompts: partialCard.parameters?.imagePrompts,
      stylize: partialCard.parameters?.stylize,
      chaos: partialCard.parameters?.chaos,
      weird: partialCard.parameters?.weird,
      tile: partialCard.parameters?.tile,
      raw: partialCard.parameters?.raw,
      version: partialCard.parameters?.version,
      niji: partialCard.parameters?.niji
    },
    masking: {
      isSrefHidden: partialCard.masking?.isSrefHidden || false,
      isPHidden: partialCard.masking?.isPHidden || false
    },
    tier: tierNormalized,
    isFavorite: partialCard.isFavorite || false,
    isPinned: partialCard.isPinned || false,
    usageCount: partialCard.usageCount || 0,
    tags: partialCard.tags || [],
    category: partialCard.category,
    dominantColor: partialCard.dominantColor || "#1e293b",
    accentColor: partialCard.accentColor || "#3b82f6",
    thumbnailData:
      partialCard.thumbnailData ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    frameId: partialCard.frameId || "frame-default",
    genealogy: {
      generation: partialCard.genealogy?.generation || 0,
      parentIds: partialCard.genealogy?.parentIds || []
    }
  }
}

// Merge the card into the database dump helper
function mergeCardIntoDump(existingDump: any, card: StyleCard): any {
  if (
    existingDump &&
    existingDump.data &&
    Array.isArray(existingDump.data.styleCards)
  ) {
    const exists = existingDump.data.styleCards.some(
      (c: any) => c.id === card.id
    )
    if (!exists) {
      existingDump.data.styleCards.push(card)
    } else {
      const idx = existingDump.data.styleCards.findIndex(
        (c: any) => c.id === card.id
      )
      existingDump.data.styleCards[idx] = card
    }
    existingDump.exportedAt = Date.now()
    return existingDump
  }
  return {
    version: 1,
    exportedAt: Date.now(),
    data: {
      styleCards: [card],
      categories: [],
      userSettings: [],
      historyItems: [],
      slotHistory: []
    }
  }
}

export async function saveCardToGoogleDrive(
  partialCard: Partial<StyleCard>
): Promise<void> {
  const card = normalizeStyleCard(partialCard)
  const token = await getAuthToken()
  const fileId = await searchTempSharedCardsFile(token)

  if (fileId) {
    const existingDump = await downloadTempSharedCards(token, fileId)
    const mergedDump = mergeCardIntoDump(existingDump, card)
    await updateTempSharedCardsFile(token, fileId, JSON.stringify(mergedDump))
  } else {
    const freshDump = {
      version: 1,
      exportedAt: Date.now(),
      data: {
        styleCards: [card],
        categories: [],
        userSettings: [],
        historyItems: [],
        slotHistory: []
      }
    }
    await createTempSharedCardsFile(token, JSON.stringify(freshDump))
  }
}
