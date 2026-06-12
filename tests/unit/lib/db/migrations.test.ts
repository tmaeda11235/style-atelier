import { setupMigrations } from "@/lib/db/migrations"
import Dexie from "dexie"
import { describe, expect, it, vi } from "vitest"

describe("setupMigrations", () => {
  it("should setup database versions and stores", () => {
    const mockStores = vi.fn().mockReturnValue({
      upgrade: vi.fn()
    })
    const mockVersion = vi.fn().mockReturnValue({
      stores: mockStores
    })

    const mockDb = {
      version: mockVersion
    } as unknown as Dexie

    setupMigrations(mockDb)

    // Verify versions 5 to 13 are registered
    expect(mockVersion).toHaveBeenCalledWith(5)
    expect(mockVersion).toHaveBeenCalledWith(6)
    expect(mockVersion).toHaveBeenCalledWith(7)
    expect(mockVersion).toHaveBeenCalledWith(8)
    expect(mockVersion).toHaveBeenCalledWith(9)
    expect(mockVersion).toHaveBeenCalledWith(10)
    expect(mockVersion).toHaveBeenCalledWith(11)
    expect(mockVersion).toHaveBeenCalledWith(12)
    expect(mockVersion).toHaveBeenCalledWith(13)
  })
})
