import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  base64ToUint8Array,
  crc32,
  uint8ArrayToBase64
} from "../../../src/shared/lib/binary-utils"

describe("binary-utils", () => {
  describe("uint8ArrayToBase64 and base64ToUint8Array", () => {
    it("should convert Uint8Array to base64 and back", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const base64 = uint8ArrayToBase64(original)
      expect(base64).toBe("SGVsbG8=")

      const converted = base64ToUint8Array(base64)
      expect(converted).toEqual(original)
    })

    it("should handle empty array", () => {
      const original = new Uint8Array([])
      const base64 = uint8ArrayToBase64(original)
      expect(base64).toBe("")

      const converted = base64ToUint8Array(base64)
      expect(converted).toEqual(original)
    })

    describe("without Buffer global", () => {
      let originalBuffer: any

      beforeEach(() => {
        originalBuffer = globalThis.Buffer
        // @ts-ignore
        delete globalThis.Buffer
      })

      afterEach(() => {
        globalThis.Buffer = originalBuffer
      })

      it("should convert Uint8Array to base64 and back using fallback logic", () => {
        const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
        const base64 = uint8ArrayToBase64(original)
        expect(base64).toBe("SGVsbG8=")

        const converted = base64ToUint8Array(base64)
        expect(converted).toEqual(original)
      })
    })
  })

  describe("crc32", () => {
    it("should calculate correct CRC32 for various inputs", () => {
      // Test cases from known CRC32 values
      // "Hello World" -> 0x4a17b156
      const helloWorld = new Uint8Array([
        72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100
      ])
      expect(crc32(helloWorld)).toBe(0x4a17b156)

      // Empty input -> 0x00000000
      expect(crc32(new Uint8Array([]))).toBe(0)
    })
  })
})
