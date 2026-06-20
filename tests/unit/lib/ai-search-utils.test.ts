import {
  parseSemanticQuery,
  parseSemanticQueryFallback
} from "@/lib/ai-search-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

let mockSendMessage: any

describe("parseSemanticQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chrome.runtime.sendMessage = vi.fn()
    mockSendMessage = chrome.runtime.sendMessage
  })

  it("should parse query and extract correct filters", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result: JSON.stringify({
              rarity: "Legendary",
              color: "Blue",
              category: "All",
              query: "anime style"
            })
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = await parseSemanticQuery(
      "Legendary blue anime style cards",
      categories
    )

    expect(result).toEqual({
      rarity: "Legendary",
      color: "Blue",
      category: "All",
      query: "anime style"
    })
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        target: "offscreen",
        action: "run-inference",
        requestId: expect.any(String),
        prompt: "Legendary blue anime style cards",
        systemPrompt: expect.stringContaining("Available Rarities"),
        temperature: 0.1
      },
      expect.any(Function)
    )
  })

  it("should handle markdown block JSON response from AI", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result:
              '```json\n{\n  "rarity": "Rare",\n  "color": "Red",\n  "category": "Cyberpunk",\n  "query": "mecha"\n}\n```'
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = await parseSemanticQuery(
      "Rare red Cyberpunk mecha",
      categories
    )

    expect(result).toEqual({
      rarity: "Rare",
      color: "Red",
      category: "Cyberpunk",
      query: "mecha"
    })
  })

  it("should default filters to 'All' or empty string on JSON parse errors or partial properties", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result: "invalid json string"
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    await expect(parseSemanticQuery("something", categories)).rejects.toThrow()
  })

  it("should handle plain markdown block without json language specifier", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result: '```\n{\n  "rarity": "Epic",\n  "color": "Green"\n}\n```'
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = await parseSemanticQuery("Epic green stuff", categories)

    expect(result).toEqual({
      rarity: "Epic",
      color: "Green",
      category: "All",
      query: ""
    })
  })

  it("should handle partial JSON properties and fallback to All", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result: "{}"
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = await parseSemanticQuery("something", categories)

    expect(result).toEqual({
      rarity: "All",
      color: "All",
      category: "All",
      query: ""
    })
  })

  it("should parse Japanese query when language is 'ja'", async () => {
    mockSendMessage.mockImplementation((message, callback) => {
      if (message && message.action === "run-inference") {
        if (callback) {
          callback({
            status: "success",
            result: JSON.stringify({
              rarity: "Legendary",
              color: "Blue",
              category: "All",
              query: "cyberpunk"
            })
          })
        }
      }
    })

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = await parseSemanticQuery(
      "伝説の青い目のサイバーパンク",
      categories,
      "ja"
    )

    expect(result).toEqual({
      rarity: "Legendary",
      color: "Blue",
      category: "All",
      query: "cyberpunk"
    })
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        target: "offscreen",
        action: "run-inference",
        requestId: expect.any(String),
        prompt: "伝説の青い目のサイバーパンク",
        systemPrompt: expect.stringContaining(
          "あなたはスタイル検索クエリの解析器です"
        ),
        temperature: 0.1
      },
      expect.any(Function)
    )
  })
})

describe("parseSemanticQueryFallback", () => {
  it("should extract rarity, color, and category correctly from query in English", () => {
    const categories = [
      { id: "cat-1", name: "Cyberpunk" },
      { id: "cat-2", name: "Anime" }
    ]
    const result = parseSemanticQueryFallback(
      "Uncommon red Cyberpunk card",
      categories
    )
    expect(result).toEqual({
      rarity: "Uncommon",
      color: "Red",
      category: "Cyberpunk",
      query: "card"
    })
  })

  it("should extract rarity, color, and category correctly from query in Japanese", () => {
    const categories = [
      { id: "cat-1", name: "Cyberpunk" },
      { id: "cat-2", name: "Anime" }
    ]
    const result = parseSemanticQueryFallback("伝説の青いAnime風", categories)
    expect(result).toEqual({
      rarity: "Legendary",
      color: "Blue",
      category: "Anime",
      query: "風"
    })
  })

  it("should return All if no matching parameters are found", () => {
    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    const result = parseSemanticQueryFallback("something else", categories)
    expect(result).toEqual({
      rarity: "All",
      color: "All",
      category: "All",
      query: "something else"
    })
  })
})
