import { StyleCard } from "../../shared/lib/db-schema"
import {
  buildPromptString,
  buildSegmentString
} from "../../shared/lib/prompt-utils"

export interface NotionClientCredentials {
  apiKey: string
  databaseId: string
}

/**
 * Retrieves Notion Integration credentials (apiKey and databaseId) from chrome.storage.local
 */
export async function getNotionCredentials(): Promise<NotionClientCredentials | null> {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    return null
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(["notionApiKey", "notionDatabaseId"], (items) => {
      if (items.notionApiKey && items.notionDatabaseId) {
        resolve({
          apiKey: items.notionApiKey,
          databaseId: items.notionDatabaseId
        })
      } else {
        resolve(null)
      }
    })
  })
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

  const response = await fetch("https://api.notion.com/v1/pages", {
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
