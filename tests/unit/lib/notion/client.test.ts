import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as notionClient from "../../../../src/lib/notion/client"
import {
  getNotionCredentials,
  sendCardToNotion,
  updateCardInNotion
} from "../../../../src/lib/notion/client"
import type { StyleCard } from "../../../../src/shared/lib/db-schema"

describe("Notion API Client", () => {
  const originalChrome = (global as any).chrome

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(global, "fetch").mockImplementation(vi.fn() as any)
    notionClient.retryConfig.recordedDelays = []
  })

  afterEach(() => {
    ;(global as any).chrome = originalChrome
  })

  describe("getNotionCredentials", () => {
    it("should return credentials if they exist in chrome.storage.local", async () => {
      const mockGet = vi.fn().mockImplementation((keys, callback) => {
        callback({
          notionApiKey: "secret-key",
          notionDatabaseId: "db-id"
        })
      })
      ;(global as any).chrome = {
        storage: {
          local: {
            get: mockGet
          }
        }
      }

      const creds = await getNotionCredentials()
      expect(creds).toEqual({
        apiKey: "secret-key",
        databaseId: "db-id"
      })
      expect(mockGet).toHaveBeenCalledWith(
        ["notionApiKey", "notionDatabaseId"],
        expect.any(Function)
      )
    })

    it("should return null if credentials are missing in chrome.storage.local", async () => {
      const mockGet = vi.fn().mockImplementation((keys, callback) => {
        callback({})
      })
      ;(global as any).chrome = {
        storage: {
          local: {
            get: mockGet
          }
        }
      }

      const creds = await getNotionCredentials()
      expect(creds).toBeNull()
    })

    it("should return null if chrome storage API is not available", async () => {
      ;(global as any).chrome = undefined
      const creds = await getNotionCredentials()
      expect(creds).toBeNull()
    })
  })

  describe("sendCardToNotion", () => {
    const mockCard: StyleCard = {
      id: "card-123",
      name: "Cyber Punk Cat",
      createdAt: 123456,
      updatedAt: 123456,
      promptSegments: [
        { type: "text", value: "a cool cat" },
        { type: "text", value: "neon lights" }
      ],
      parameters: {
        ar: "16:9",
        stylize: 250
      },
      masking: {
        isSrefHidden: false,
        isPHidden: false
      },
      tier: "Rare",
      isFavorite: false,
      usageCount: 0,
      tags: ["cyberpunk", "animal"],
      frameId: "default",
      dominantColor: "#000000",
      genealogy: {
        generation: 1,
        parentIds: [],
        mutationNote: "First Gen"
      },
      thumbnailPath: "images/cards/card-123.png",
      images: ["https://example.com/image.png"]
    }

    const mockCredentials = {
      apiKey: "secret-key",
      databaseId: "db-id"
    }

    it("should successfully send card to Notion database with credentials", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "page-789" })
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer secret-key",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: expect.any(String)
        })
      )

      const requestBody = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]!.body as string
      )
      expect(requestBody.parent.database_id).toBe("db-id")
      expect(requestBody.properties.Name.title[0].text.content).toBe(
        "Cyber Punk Cat"
      )
      expect(requestBody.properties.Prompt.rich_text[0].text.content).toBe(
        "a cool cat, neon lights"
      )
      expect(
        requestBody.properties["Raw Prompt"].rich_text[0].text.content
      ).toBe("a cool cat, neon lights --ar 16:9 --s 250")
      expect(requestBody.properties.Parameters.rich_text[0].text.content).toBe(
        JSON.stringify(mockCard.parameters)
      )
      expect(requestBody.properties.Tags.multi_select).toEqual([
        { name: "cyberpunk" },
        { name: "animal" }
      ])
      expect(
        requestBody.properties["Style Analysis"].rich_text[0].text.content
      ).toBe("First Gen")
      expect(
        requestBody.properties["Thumbnail Path"].rich_text[0].text.content
      ).toBe("images/cards/card-123.png")
      expect(
        requestBody.properties["Image URLs"].rich_text[0].text.content
      ).toBe("https://example.com/image.png")
    })

    it("should use storage credentials if none are passed in", async () => {
      const mockGet = vi.fn().mockImplementation((keys, callback) => {
        callback({
          notionApiKey: "storage-key",
          notionDatabaseId: "storage-db-id"
        })
      })
      ;(global as any).chrome = {
        storage: {
          local: {
            get: mockGet
          }
        }
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "page-789" })
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await sendCardToNotion(mockCard)
      expect(result).toEqual({ pageId: "page-789" })

      const requestBody = JSON.parse(
        vi.mocked(global.fetch).mock.calls[0][1]!.body as string
      )
      expect(requestBody.parent.database_id).toBe("storage-db-id")
    })

    it("should throw error if credentials are not found", async () => {
      ;(global as any).chrome = undefined // no storage

      await expect(sendCardToNotion(mockCard)).rejects.toThrow(
        "Missing Notion API credentials"
      )
    })

    it("should throw error if fetch response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request")
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await expect(sendCardToNotion(mockCard, mockCredentials)).rejects.toThrow(
        "Notion API error (400): Bad Request"
      )
    })

    it("should throw error and report 429 status code if rate limited", async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue("Rate limit exceeded")
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await expect(sendCardToNotion(mockCard, mockCredentials)).rejects.toThrow(
        "Notion API error (429): Rate limit exceeded"
      )
    })

    it("should propagate network connection errors on fetch rejection", async () => {
      vi.mocked(global.fetch).mockRejectedValue(
        new TypeError("Failed to fetch")
      )

      await expect(sendCardToNotion(mockCard, mockCredentials)).rejects.toThrow(
        "Failed to fetch"
      )
    })

    it("should throw error if response json is missing page ID", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({})
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await expect(sendCardToNotion(mockCard, mockCredentials)).rejects.toThrow(
        "Notion API response is missing page ID"
      )
    })
  })

  describe("updateCardInNotion", () => {
    const mockCard: StyleCard = {
      id: "card-123",
      name: "Cyber Punk Cat",
      createdAt: 123456,
      updatedAt: 123456,
      promptSegments: [
        { type: "text", value: "a cool cat" },
        { type: "text", value: "neon lights" }
      ],
      parameters: {
        ar: "16:9",
        stylize: 250
      },
      masking: {
        isSrefHidden: false,
        isPHidden: false
      },
      tier: "Rare",
      isFavorite: false,
      usageCount: 0,
      tags: ["cyberpunk", "animal"],
      frameId: "default",
      dominantColor: "#000000",
      genealogy: {
        generation: 1,
        parentIds: [],
        mutationNote: "First Gen"
      },
      thumbnailPath: "images/cards/card-123.png",
      images: ["https://example.com/image.png"]
    }

    const mockCredentials = {
      apiKey: "secret-key",
      databaseId: "db-id"
    }

    it("should successfully update existing card in Notion database via PATCH", async () => {
      const mockResponse = {
        ok: true
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await expect(
        updateCardInNotion("page-789", mockCard, mockCredentials)
      ).resolves.toBeUndefined()

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages/page-789",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Bearer secret-key",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: expect.any(String)
        })
      )
    })

    it("should throw error if update fetch response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request")
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await expect(
        updateCardInNotion("page-789", mockCard, mockCredentials)
      ).rejects.toThrow("Notion API error (400): Bad Request")
    })
  })

  describe("Retry Resilience", () => {
    const mockCard: StyleCard = {
      id: "card-123",
      name: "Cyber Punk Cat",
      createdAt: 123456,
      updatedAt: 123456,
      promptSegments: [
        { type: "text", value: "a cool cat" },
        { type: "text", value: "neon lights" }
      ],
      parameters: {
        ar: "16:9",
        stylize: 250
      },
      masking: {
        isSrefHidden: false,
        isPHidden: false
      },
      tier: "Rare",
      isFavorite: false,
      usageCount: 0,
      tags: ["cyberpunk", "animal"],
      frameId: "default",
      dominantColor: "#000000",
      genealogy: {
        generation: 1,
        parentIds: [],
        mutationNote: "First Gen"
      },
      thumbnailPath: "images/cards/card-123.png",
      images: ["https://example.com/image.png"]
    }

    const mockCredentials = {
      apiKey: "secret-key",
      databaseId: "db-id"
    }

    it("should retry with exponential backoff on 429 if Retry-After header is missing", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: vi.fn().mockResolvedValue("Rate limit exceeded")
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: vi.fn().mockResolvedValue("Rate limit exceeded")
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "page-789" })
        } as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })
      expect(global.fetch).toHaveBeenCalledTimes(3)

      expect(notionClient.retryConfig.recordedDelays).toEqual([1000, 2000])
    })

    it("should retry using Retry-After header seconds on 429", async () => {
      const headers = new Headers()
      headers.set("Retry-After", "3")

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers,
          text: vi.fn().mockResolvedValue("Rate limit exceeded")
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "page-789" })
        } as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })
      expect(global.fetch).toHaveBeenCalledTimes(2)

      expect(notionClient.retryConfig.recordedDelays).toEqual([3000])
    })

    it("should retry using Retry-After header HTTP-date on 429", async () => {
      const futureDate = new Date(Date.now() + 5000)
      const headers = new Headers()
      headers.set("Retry-After", futureDate.toUTCString())

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers,
          text: vi.fn().mockResolvedValue("Rate limit exceeded")
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "page-789" })
        } as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })
      expect(global.fetch).toHaveBeenCalledTimes(2)

      expect(notionClient.retryConfig.recordedDelays.length).toBe(1)
      const sleepArg = notionClient.retryConfig.recordedDelays[0]
      expect(sleepArg).toBeGreaterThanOrEqual(4000)
      expect(sleepArg).toBeLessThanOrEqual(6000)
    })

    it("should retry on 5xx temporary server errors", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: vi.fn().mockResolvedValue("Service Unavailable")
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "page-789" })
        } as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(notionClient.retryConfig.recordedDelays).toEqual([1000])
    })

    it("should retry on network type errors", async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "page-789" })
        } as any)

      const result = await sendCardToNotion(mockCard, mockCredentials)
      expect(result).toEqual({ pageId: "page-789" })
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(notionClient.retryConfig.recordedDelays).toEqual([1000])
    })

    it("should throw error if retry count exceeds max limit", async () => {
      for (let i = 0; i < 6; i++) {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: vi.fn().mockResolvedValue("Rate limit exceeded")
        } as any)
      }

      await expect(sendCardToNotion(mockCard, mockCredentials)).rejects.toThrow(
        "Notion API error (429): Rate limit exceeded"
      )
      expect(global.fetch).toHaveBeenCalledTimes(6)
    })
  })
})
