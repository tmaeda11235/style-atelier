import { describe, expect, it } from "vitest"

import enJson from "../../src/locales/en/translation.json"
import jaJson from "../../src/locales/ja/translation.json"

function getFlatKeys(obj: any, prefix = ""): string[] {
  let keys: string[] = []
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys = keys.concat(getFlatKeys(obj[key], `${prefix}${key}.`))
    } else {
      keys.push(`${prefix}${key}`)
    }
  }
  return keys.sort()
}

describe("Translation Locales Integrity", () => {
  it("should have identical translation keys in English and Japanese", () => {
    const enKeys = getFlatKeys(enJson)
    const jaKeys = getFlatKeys(jaJson)
    expect(enKeys).toEqual(jaKeys)
  })
})
