import { describe, expect, it } from "vitest"

import {
  validateBackupPayload,
  validateCustomCategory,
  validateHistoryItem,
  validateSlotHistory,
  validateStyleCard,
  validateUserSettings
} from "./backup-validator"

// Mock Data Builders
const createValidCategory = () => ({
  id: "cat-1",
  name: "My Category",
  iconEmoji: "⭐",
  iconUrl: "http://example.com/icon.png",
  iconCardId: "card-1",
  createdAt: 123456789
})

const createValidStyleCard = () => ({
  id: "card-1",
  name: "My Style",
  createdAt: 123456789,
  updatedAt: 123456789,
  promptSegments: [
    { type: "text", value: "hello" },
    { type: "slot", label: "slot1", default: "world" },
    { type: "chip", kind: "sref", value: "sref1" }
  ],
  parameters: {
    ar: "16:9",
    sref: ["sref-url"],
    cref: ["cref-url"],
    p: ["p-url"],
    imagePrompts: ["prompt-url"],
    stylize: 100,
    chaos: 10,
    weird: 20,
    tile: true,
    raw: false
  },
  masking: {
    isSrefHidden: false,
    isPHidden: true
  },
  tier: "Epic",
  isFavorite: true,
  isPinned: false,
  usageCount: 5,
  tags: ["tag1", "tag2"],
  category: "cat-1",
  dominantColor: "#ff0000",
  accentColor: "#00ff00",
  thumbnailData: "data:image/png;base64,abc",
  frameId: "default-frame",
  genealogy: {
    generation: 2,
    parentIds: ["parent-1"],
    originCreatorId: "creator-1",
    mutationNote: "mutated"
  },
  isVariable: true,
  jobId: "job-1",
  associatedJobIds: ["job-1", "job-2"],
  images: ["img-1"],
  selectedThumbnails: ["thumb-1"]
})

const createValidHistoryItem = () => ({
  id: "hist-1",
  fullCommand: "/imagine prompt: test",
  imageUrl: "http://example.com/img.png",
  timestamp: 123456789,
  relatedCardId: "card-1"
})

const createValidUserSettings = () => ({
  userId: "user-1",
  isPro: true,
  unlockedSkins: ["skin-1", "skin-2"],
  branding: {
    enabled: true,
    customLogo: "logo.png",
    signatureName: "John Doe"
  }
})

const createValidSlotHistory = () => ({
  subject: ["cat", "dog"],
  style: ["anime"]
})

const createValidBackupPayload = () => ({
  version: 1,
  exportedAt: 123456789,
  data: {
    styleCards: [createValidStyleCard()],
    categories: [createValidCategory()],
    userSettings: [createValidUserSettings()],
    historyItems: [createValidHistoryItem()],
    slotHistory: createValidSlotHistory()
  }
})

describe("backup-validator", () => {
  describe("validateCustomCategory", () => {
    it("should validate a correct category", () => {
      const cat = createValidCategory()
      expect(validateCustomCategory(cat, 0)).toEqual({ isValid: true })
    })

    it("should validate category without optional fields", () => {
      const cat = createValidCategory()
      delete cat.iconEmoji
      delete cat.iconUrl
      delete cat.iconCardId
      expect(validateCustomCategory(cat, 0)).toEqual({ isValid: true })
    })

    it("should reject non-object values", () => {
      expect(validateCustomCategory(null, 0).isValid).toBe(false)
      expect(validateCustomCategory("string", 0).isValid).toBe(false)
    })

    it("should reject invalid fields", () => {
      const cat = createValidCategory()

      expect(validateCustomCategory({ ...cat, id: 123 }, 0).isValid).toBe(false)
      expect(validateCustomCategory({ ...cat, name: 123 }, 0).isValid).toBe(
        false
      )
      expect(
        validateCustomCategory({ ...cat, iconEmoji: 123 }, 0).isValid
      ).toBe(false)
      expect(validateCustomCategory({ ...cat, iconUrl: 123 }, 0).isValid).toBe(
        false
      )
      expect(
        validateCustomCategory({ ...cat, iconCardId: 123 }, 0).isValid
      ).toBe(false)
      expect(
        validateCustomCategory({ ...cat, createdAt: "not-a-number" }, 0).isValid
      ).toBe(false)
    })
  })

  describe("validateStyleCard", () => {
    it("should validate a correct style card", () => {
      const card = createValidStyleCard()
      expect(validateStyleCard(card, 0)).toEqual({ isValid: true })
    })

    it("should validate a style card without optional fields", () => {
      const card = createValidStyleCard()
      delete card.isPinned
      delete card.category
      delete card.accentColor
      delete card.isVariable
      delete card.jobId
      delete card.associatedJobIds
      delete card.images
      delete card.selectedThumbnails
      delete card.genealogy.originCreatorId
      delete card.genealogy.mutationNote

      // parameters optionals
      delete card.parameters.ar
      delete card.parameters.sref
      delete card.parameters.cref
      delete card.parameters.p
      delete card.parameters.imagePrompts
      delete card.parameters.stylize
      delete card.parameters.chaos
      delete card.parameters.weird
      delete card.parameters.tile
      delete card.parameters.raw

      expect(validateStyleCard(card, 0)).toEqual({ isValid: true })
    })

    it("should reject non-object values", () => {
      expect(validateStyleCard(null, 0).isValid).toBe(false)
      expect(validateStyleCard("card", 0).isValid).toBe(false)
    })

    it("should reject invalid basic identity fields", () => {
      const card = createValidStyleCard()
      expect(validateStyleCard({ ...card, id: 123 }, 0).isValid).toBe(false)
      expect(validateStyleCard({ ...card, name: 123 }, 0).isValid).toBe(false)
      expect(
        validateStyleCard({ ...card, createdAt: "not-a-number" }, 0).isValid
      ).toBe(false)
      expect(
        validateStyleCard({ ...card, updatedAt: "not-a-number" }, 0).isValid
      ).toBe(false)
    })

    describe("promptSegments validation", () => {
      it("should reject if promptSegments is not an array", () => {
        const card = createValidStyleCard()
        ;(card as any).promptSegments = "not-an-array"
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject if a segment is not an object", () => {
        const card = createValidStyleCard()
        card.promptSegments[0] = "not-an-object" as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject if a segment has missing or invalid type", () => {
        const card = createValidStyleCard()
        card.promptSegments[0] = { value: "hello" } as any // missing type
        expect(validateStyleCard(card, 0).isValid).toBe(false)

        card.promptSegments[0] = { type: 123, value: "hello" } as any // invalid type
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid text segments", () => {
        const card = createValidStyleCard()
        card.promptSegments[0] = { type: "text", value: 123 } as any // value must be string
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid slot segments", () => {
        const card = createValidStyleCard()
        card.promptSegments[1] = {
          type: "slot",
          label: 123,
          default: "world"
        } as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)

        card.promptSegments[1] = {
          type: "slot",
          label: "slot",
          default: 123
        } as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid chip segments", () => {
        const card = createValidStyleCard()
        card.promptSegments[2] = {
          type: "chip",
          kind: "invalid-kind",
          value: "val"
        } as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)

        card.promptSegments[2] = {
          type: "chip",
          kind: "sref",
          value: 123
        } as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject unknown segment types", () => {
        const card = createValidStyleCard()
        card.promptSegments[0] = { type: "unknown-type" } as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })
    })

    describe("parameters validation", () => {
      it("should reject if parameters is not an object", () => {
        const card = createValidStyleCard()
        card.parameters = "not-an-object" as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid parameters values", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, ar: 123 } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, sref: "not-array" } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, sref: [123] } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, cref: [123] } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, p: [123] } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              parameters: { ...card.parameters, imagePrompts: [123] }
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, stylize: "100" } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, chaos: "10" } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, weird: "20" } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, tile: "true" } },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, parameters: { ...card.parameters, raw: "false" } },
            0
          ).isValid
        ).toBe(false)
      })
    })

    describe("masking validation", () => {
      it("should reject if masking is not an object", () => {
        const card = createValidStyleCard()
        card.masking = "not-an-object" as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid masking values", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard(
            {
              ...card,
              masking: { isSrefHidden: "false", isPHidden: false } as any
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              masking: { isSrefHidden: false, isPHidden: "true" } as any
            },
            0
          ).isValid
        ).toBe(false)
      })
    })

    describe("TCG and other metadata validation", () => {
      it("should reject invalid tier", () => {
        const card = createValidStyleCard()
        card.tier = "SuperRare" as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject other invalid metadata", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard({ ...card, isFavorite: "true" as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, isPinned: "false" as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, usageCount: "5" as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, tags: "not-array" as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, tags: [123] as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, category: 123 as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, dominantColor: 123 as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, accentColor: 123 as any }, 0).isValid
        ).toBe(false)
      })
    })

    describe("Visuals validation", () => {
      it("should reject invalid visuals", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard({ ...card, thumbnailData: 123 as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, frameId: 123 as any }, 0).isValid
        ).toBe(false)
      })
    })

    describe("Genealogy validation", () => {
      it("should reject if genealogy is not an object", () => {
        const card = createValidStyleCard()
        card.genealogy = "not-an-object" as any
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject invalid genealogy values", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard(
            {
              ...card,
              genealogy: { ...card.genealogy, generation: "2" as any }
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              genealogy: { ...card.genealogy, parentIds: "not-array" as any }
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              genealogy: { ...card.genealogy, parentIds: [123] as any }
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              genealogy: { ...card.genealogy, originCreatorId: 123 as any }
            },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            {
              ...card,
              genealogy: { ...card.genealogy, mutationNote: 123 as any }
            },
            0
          ).isValid
        ).toBe(false)
      })
    })

    describe("Variables, Job ID validation", () => {
      it("should reject invalid variables and job parameters", () => {
        const card = createValidStyleCard()
        expect(
          validateStyleCard({ ...card, isVariable: "true" as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, jobId: 123 as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard(
            { ...card, associatedJobIds: "not-array" as any },
            0
          ).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, associatedJobIds: [123] as any }, 0)
            .isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, images: [123] as any }, 0).isValid
        ).toBe(false)
        expect(
          validateStyleCard({ ...card, selectedThumbnails: [123] as any }, 0)
            .isValid
        ).toBe(false)
      })
    })

    describe("versionHistory validation", () => {
      it("should validate a style card with correct versionHistory", () => {
        const card = createValidStyleCard()
        ;(card as any).versionHistory = [
          {
            id: "v-1",
            timestamp: 123456789,
            name: "V1 Name",
            promptSegments: [{ type: "text", value: "v1-prompt" }],
            parameters: { ar: "1:1" }
          }
        ]
        expect(validateStyleCard(card, 0)).toEqual({ isValid: true })
      })

      it("should reject if versionHistory is not an array", () => {
        const card = createValidStyleCard()
        ;(card as any).versionHistory = "not-an-array"
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })

      it("should reject if a version is invalid", () => {
        const card = createValidStyleCard()
        ;(card as any).versionHistory = [
          {
            id: 123, // id must be string
            timestamp: 123456789,
            name: "V1 Name",
            promptSegments: [],
            parameters: {}
          }
        ]
        expect(validateStyleCard(card, 0).isValid).toBe(false)
      })
    })
  })

  describe("validateHistoryItem", () => {
    it("should validate a correct history item", () => {
      const item = createValidHistoryItem()
      expect(validateHistoryItem(item, 0)).toEqual({ isValid: true })
    })

    it("should validate a history item without optional fields", () => {
      const item = createValidHistoryItem()
      delete item.relatedCardId
      expect(validateHistoryItem(item, 0)).toEqual({ isValid: true })
    })

    it("should reject non-object values", () => {
      expect(validateHistoryItem(null, 0).isValid).toBe(false)
      expect(validateHistoryItem("item", 0).isValid).toBe(false)
    })

    it("should reject invalid fields", () => {
      const item = createValidHistoryItem()
      expect(validateHistoryItem({ ...item, id: 123 }, 0).isValid).toBe(false)
      expect(
        validateHistoryItem({ ...item, fullCommand: 123 }, 0).isValid
      ).toBe(false)
      expect(validateHistoryItem({ ...item, imageUrl: 123 }, 0).isValid).toBe(
        false
      )
      expect(
        validateHistoryItem({ ...item, timestamp: "not-a-number" }, 0).isValid
      ).toBe(false)
      expect(
        validateHistoryItem({ ...item, relatedCardId: 123 }, 0).isValid
      ).toBe(false)
    })
  })

  describe("validateUserSettings", () => {
    it("should validate a correct user setting", () => {
      const setting = createValidUserSettings()
      expect(validateUserSettings(setting, 0)).toEqual({ isValid: true })
    })

    it("should validate user settings without optional branding fields", () => {
      const setting = createValidUserSettings()
      delete setting.branding.customLogo
      delete setting.branding.signatureName
      expect(validateUserSettings(setting, 0)).toEqual({ isValid: true })
    })

    it("should reject non-object values", () => {
      expect(validateUserSettings(null, 0).isValid).toBe(false)
      expect(validateUserSettings("setting", 0).isValid).toBe(false)
    })

    it("should reject invalid root fields", () => {
      const setting = createValidUserSettings()
      expect(validateUserSettings({ ...setting, userId: 123 }, 0).isValid).toBe(
        false
      )
      expect(
        validateUserSettings({ ...setting, isPro: "true" }, 0).isValid
      ).toBe(false)
      expect(
        validateUserSettings({ ...setting, unlockedSkins: "not-array" }, 0)
          .isValid
      ).toBe(false)
      expect(
        validateUserSettings({ ...setting, unlockedSkins: [123] }, 0).isValid
      ).toBe(false)
    })

    it("should reject invalid branding fields", () => {
      const setting = createValidUserSettings()
      expect(
        validateUserSettings({ ...setting, branding: "not-object" }, 0).isValid
      ).toBe(false)
      expect(
        validateUserSettings(
          { ...setting, branding: { ...setting.branding, enabled: "true" } },
          0
        ).isValid
      ).toBe(false)
      expect(
        validateUserSettings(
          { ...setting, branding: { ...setting.branding, customLogo: 123 } },
          0
        ).isValid
      ).toBe(false)
      expect(
        validateUserSettings(
          { ...setting, branding: { ...setting.branding, signatureName: 123 } },
          0
        ).isValid
      ).toBe(false)
    })
  })

  describe("validateSlotHistory", () => {
    it("should validate correct slot history", () => {
      const sh = createValidSlotHistory()
      expect(validateSlotHistory(sh)).toEqual({ isValid: true })
    })

    it("should reject non-object values", () => {
      expect(validateSlotHistory(null).isValid).toBe(false)
      expect(validateSlotHistory("slotHistory").isValid).toBe(false)
    })

    it("should reject if values are not string arrays", () => {
      const sh = { subject: "not-array" }
      expect(validateSlotHistory(sh).isValid).toBe(false)

      const sh2 = { subject: [123] }
      expect(validateSlotHistory(sh2).isValid).toBe(false)
    })
  })

  describe("validateBackupPayload", () => {
    it("should validate a correct full backup payload", () => {
      const payload = createValidBackupPayload()
      expect(validateBackupPayload(payload)).toEqual({ isValid: true })
    })

    it("should validate payload without optional data arrays", () => {
      const payload = createValidBackupPayload()
      delete payload.data.categories
      delete payload.data.userSettings
      delete payload.data.historyItems
      delete payload.data.slotHistory
      expect(validateBackupPayload(payload)).toEqual({ isValid: true })
    })

    it("should reject non-object payload", () => {
      expect(validateBackupPayload(null).isValid).toBe(false)
      expect(validateBackupPayload("payload").isValid).toBe(false)
    })

    describe("version validation", () => {
      it("should reject if version is missing", () => {
        const payload = createValidBackupPayload()
        delete (payload as any).version
        expect(validateBackupPayload(payload).isValid).toBe(false)
      })

      it("should reject if version is not a number", () => {
        const payload = createValidBackupPayload()
        ;(payload as any).version = "1"
        expect(validateBackupPayload(payload).isValid).toBe(false)
      })

      it("should reject if version is greater than supported version (1)", () => {
        const payload = createValidBackupPayload()
        payload.version = 2
        const res = validateBackupPayload(payload)
        expect(res.isValid).toBe(false)
        expect(res.error).toContain("Backup version (2) is not supported")
      })

      it("should reject if version is less than 1", () => {
        const payload = createValidBackupPayload()
        payload.version = 0
        expect(validateBackupPayload(payload).isValid).toBe(false)

        payload.version = -1
        expect(validateBackupPayload(payload).isValid).toBe(false)
      })
    })

    describe("exportedAt and data wrapper validation", () => {
      it("should reject if exportedAt is missing or invalid", () => {
        const payload = createValidBackupPayload()
        delete (payload as any).exportedAt
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.exportedAt = "not-a-number" as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })

      it("should reject if data is missing or invalid", () => {
        const payload = createValidBackupPayload()
        delete (payload as any).data
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.data = "not-an-object" as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })
    })

    describe("nested elements propagation", () => {
      it("should reject if styleCards array is missing or invalid", () => {
        const payload = createValidBackupPayload()
        delete (payload.data as any).styleCards
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.data.styleCards = "not-an-array" as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })

      it("should propagate error if a style card is invalid", () => {
        const payload = createValidBackupPayload()
        payload.data.styleCards[0].tier = "InvalidTier" as any
        expect(validateBackupPayload(payload).isValid).toBe(false)
      })

      it("should propagate error if categories is not an array, or if a category is invalid", () => {
        const payload = createValidBackupPayload()
        payload.data.categories = "not-an-array" as any
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.data.categories![0].name = 123 as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })

      it("should propagate error if userSettings is not an array, or if userSettings is invalid", () => {
        const payload = createValidBackupPayload()
        payload.data.userSettings = "not-an-array" as any
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.data.userSettings![0].isPro = "true" as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })

      it("should propagate error if historyItems is not an array, or if a history item is invalid", () => {
        const payload = createValidBackupPayload()
        payload.data.historyItems = "not-an-array" as any
        expect(validateBackupPayload(payload).isValid).toBe(false)

        const payload2 = createValidBackupPayload()
        payload2.data.historyItems![0].timestamp = "not-a-number" as any
        expect(validateBackupPayload(payload2).isValid).toBe(false)
      })

      it("should propagate error if slotHistory is invalid", () => {
        const payload = createValidBackupPayload()
        payload.data.slotHistory = { subject: "not-an-array" } as any
        expect(validateBackupPayload(payload).isValid).toBe(false)
      })
    })
  })
})
