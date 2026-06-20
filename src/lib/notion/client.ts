import type { StyleCard } from "../../shared/lib/db-schema"
import {
  buildPromptString,
  buildSegmentString
} from "../../shared/lib/prompt-utils"

export const retryConfig = {
  sleep: (ms: number): Promise<void> => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return Promise.resolve()
    }
    return new Promise((resolve) => setTimeout(resolve, ms))
  },
  recordedDelays: [] as number[]
}

function calculateDelay(attempt: number, response?: Response): number {
  const defaultDelay = Math.pow(2, attempt) * 1000

  if (response?.status === 429) {
    const retryAfterHeader = response.headers?.get
      ? response.headers.get("Retry-After")
      : null
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10)
      if (!isNaN(seconds)) {
        return seconds * 1000
      }
      const dateMs = Date.parse(retryAfterHeader)
      if (!isNaN(dateMs)) {
        const diff = dateMs - Date.now()
        return diff > 0 ? diff : 0
      }
    }
  }

  return defaultDelay
}

async function handleRetry(
  attempt: number,
  maxRetries: number,
  errorOrResponse: any,
  isNetworkError: boolean
): Promise<void> {
  const response = isNetworkError ? undefined : (errorOrResponse as Response)
  const delayMs = calculateDelay(attempt, response)

  const errorMsg = isNetworkError
    ? `network error (${errorOrResponse instanceof Error ? errorOrResponse.message : String(errorOrResponse)})`
    : response?.status === 429
      ? "429 Too Many Requests"
      : `server error (${response?.status})`

  console.warn(
    `Notion API ${errorMsg}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`
  )
  retryConfig.recordedDelays.push(delayMs)
  await retryConfig.sleep(delayMs)
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  let attempt = 0
  while (true) {
    try {
      const response = await fetch(input, init)

      if (
        response.status === 429 ||
        (response.status >= 500 && response.status < 600)
      ) {
        if (attempt >= maxRetries) {
          return response
        }
        await handleRetry(attempt, maxRetries, response, false)
        attempt++
        continue
      }

      return response
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error
      }
      await handleRetry(attempt, maxRetries, error, true)
      attempt++
    }
  }
}

export interface NotionClientCredentials {
  apiKey: string
  databaseId: string
}

/**
 * Saves Notion Integration credentials to chrome.storage.local (falls back to localStorage in non-extension environments)
 */
export async function saveNotionCredentials(
  credentials: NotionClientCredentials
): Promise<void> {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    localStorage.setItem("notionApiKey", credentials.apiKey)
    localStorage.setItem("notionDatabaseId", credentials.databaseId)
    return
  }
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        notionApiKey: credentials.apiKey,
        notionDatabaseId: credentials.databaseId
      },
      () => {
        resolve()
      }
    )
  })
}

/**
 * Retrieves Notion Integration credentials (apiKey and databaseId) from chrome.storage.local (falls back to localStorage)
 */
export async function getNotionCredentials(): Promise<NotionClientCredentials | null> {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    const apiKey = localStorage.getItem("notionApiKey")
    const databaseId = localStorage.getItem("notionDatabaseId")
    if (apiKey && databaseId) {
      return { apiKey, databaseId }
    }
    return null
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(["notionApiKey", "notionDatabaseId"], (items) => {
      const apiObj = items as Record<string, unknown>
      if (
        typeof apiObj.notionApiKey === "string" &&
        typeof apiObj.notionDatabaseId === "string"
      ) {
        resolve({
          apiKey: apiObj.notionApiKey,
          databaseId: apiObj.notionDatabaseId
        })
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Validates Notion Integration credentials by making a retrieve database call
 */
export async function validateNotionConnection(
  credentials: NotionClientCredentials
): Promise<boolean> {
  if (!credentials.apiKey || !credentials.databaseId) {
    return false
  }
  try {
    const response = await fetchWithRetry(
      `https://api.notion.com/v1/databases/${credentials.databaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Notion-Version": "2022-06-28"
        }
      }
    )
    return response.ok
  } catch (error) {
    console.error("Notion connection validation failed:", error)
    return false
  }
}

/**
 * Maps a StyleCard object to Notion properties format
 */
export function mapCardToNotionProperties(
  card: StyleCard
): Record<string, any> {
  const fullCommand = buildPromptString(card.promptSegments, card.parameters)
  const cleanPrompt = buildSegmentString(card.promptSegments)

  return {
    Name: {
      title: [{ text: { content: card.name } }]
    },
    Prompt: {
      rich_text: [{ text: { content: cleanPrompt } }]
    },
    "Raw Prompt": {
      rich_text: [{ text: { content: fullCommand } }]
    },
    Parameters: {
      rich_text: [{ text: { content: JSON.stringify(card.parameters) } }]
    },
    Tags: {
      multi_select: (card.tags || [])
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => ({ name: tag }))
    },
    "Style Analysis": {
      rich_text: [{ text: { content: card.genealogy?.mutationNote || "" } }]
    },
    "Thumbnail Path": {
      rich_text: [{ text: { content: card.thumbnailPath || "" } }]
    },
    "Image URLs": {
      rich_text: [{ text: { content: (card.images || []).join(", ") } }]
    }
  }
}

/**
 * Sends a StyleCard to the specified Notion database
 * @param card StyleCard data to sync
 * @param credentials Optional Notion credentials. If omitted, will try to load from chrome.storage.local
 * @returns Object containing the created Notion page ID
 */
export async function sendCardToNotion(
  card: StyleCard,
  credentials?: NotionClientCredentials
): Promise<{ pageId: string }> {
  const creds = credentials || (await getNotionCredentials())
  if (!creds || !creds.apiKey || !creds.databaseId) {
    throw new Error("Missing Notion API credentials")
  }

  const properties = mapCardToNotionProperties(card)

  const response = await fetchWithRetry("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      parent: { database_id: creds.databaseId },
      properties
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Notion API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  if (!data || !data.id) {
    throw new Error("Notion API response is missing page ID")
  }

  return { pageId: data.id }
}

/**
 * Updates an existing StyleCard in Notion database via PATCH
 * @param pageId Notion page ID to update
 * @param card StyleCard data to sync
 * @param credentials Optional Notion credentials. If omitted, will try to load from chrome.storage.local
 */
export async function updateCardInNotion(
  pageId: string,
  card: StyleCard,
  credentials?: NotionClientCredentials
): Promise<void> {
  const creds = credentials || (await getNotionCredentials())
  if (!creds || !creds.apiKey) {
    throw new Error("Missing Notion API credentials")
  }

  const properties = mapCardToNotionProperties(card)

  const response = await fetchWithRetry(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Notion API error (${response.status}): ${errorText}`)
  }
}
