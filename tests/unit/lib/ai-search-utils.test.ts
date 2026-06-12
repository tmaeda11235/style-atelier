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
})
