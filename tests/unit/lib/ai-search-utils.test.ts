import { parseSemanticQuery } from "@/lib/ai-search-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("parseSemanticQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chrome.runtime.sendMessage = vi.fn()
  })

  it("should parse query and extract correct filters", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
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
      }
    )

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
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "success",
              result:
                '```json\n{\n  "rarity": "Rare",\n  "color": "Red",\n  "category": "Cyberpunk",\n  "query": "mecha"\n}\n```'
            })
          }
        }
      }
    )

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
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "success",
              result: "invalid json string"
            })
          }
        }
      }
    )

    const categories = [{ id: "cat-1", name: "Cyberpunk" }]
    await expect(parseSemanticQuery("something", categories)).rejects.toThrow()
  })

  it("should handle plain markdown block without json language specifier", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "success",
              result: '```\n{\n  "rarity": "Epic",\n  "color": "Green"\n}\n```'
            })
          }
        }
      }
    )

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
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
        if (message && message.action === "run-inference") {
          if (callback) {
            callback({
              status: "success",
              result: "{}"
            })
          }
        }
      }
    )

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
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (message, callback) => {
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
      }
    )

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
