import { beforeEach, describe, expect, it, vi } from "vitest"

import { GDriveClient } from "../../src/mobile-app/gdrive-client"

describe("GDriveClient", () => {
  const mockClientId = "test-client-id"
  const mockApiKey = "test-api-key"
  let client: GDriveClient

  beforeEach(() => {
    client = new GDriveClient(mockClientId, mockApiKey)
    // モックのリセット
    vi.clearAllMocks()

    // グローバルな window.google のモック設定
    global.window = Object.create(window)
    global.window.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn()
        }
      }
    } as any
  })

  it("should initialize correctly", () => {
    expect(client).toBeInstanceOf(GDriveClient)
  })

  it("should throw error if google identity services is not loaded", async () => {
    // 意図的に google オブジェクトを未定義に設定
    ;(window as any).google = undefined

    await expect(client.requestAccessToken()).rejects.toThrow(
      "Google Identity Services is not loaded yet."
    )
  })

  it("should return access token if already authenticated", async () => {
    // 内部状態を強制的に書き換え（テスト用）
    ;(client as any).accessToken = "existing-token"
    const token = await client.requestAccessToken()
    expect(token).toBe("existing-token")
  })

  it("should request access token via tokenClient", async () => {
    const mockRequestAccessToken = vi.fn()
    const mockInitTokenClient = vi.fn().mockReturnValue({
      requestAccessToken: mockRequestAccessToken
    })
    global.window.google.accounts.oauth2.initTokenClient = mockInitTokenClient

    // 非同期でリクエストを投げる
    const tokenPromise = client.requestAccessToken()

    // initTokenClientが呼ばれたことを確認
    expect(mockInitTokenClient).toHaveBeenCalledWith({
      client_id: mockClientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: expect.any(Function)
    })

    // requestAccessTokenが呼ばれたことを確認
    expect(mockRequestAccessToken).toHaveBeenCalledWith({ prompt: "consent" })

    // コールバックをシミュレート
    const initArgs = mockInitTokenClient.mock.calls[0][0]
    initArgs.callback({ access_token: "new-mock-token" })

    const token = await tokenPromise
    expect(token).toBe("new-mock-token")
  })

  describe("saveCardData", () => {
    let fetchMock: any

    beforeEach(() => {
      fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)
      // accessToken をあらかじめ設定してGISポップアップを回避する
      ;(client as any).accessToken = "test-token"
    })

    it("should upload new BackupPayload if no existing temp_shared_cards.json is found", async () => {
      // findExistingTempFile: 該当ファイルなし (空のfilesリスト)
      fetchMock.mockImplementation(async (url: string, _init?: any) => {
        if (url.includes("files?q=")) {
          return {
            ok: true,
            json: async () => ({ files: [] })
          }
        }
        if (url.includes("upload/drive/v3/files")) {
          // POSTリクエスト
          expect(_init.method).toBe("POST")
          return {
            ok: true,
            json: async () => ({ id: "new-file-id" })
          }
        }
        return { ok: false }
      })

      const card = { id: "card-1", name: "Card 1" }
      const result = await client.saveCardData(card)

      expect(result.success).toBe(true)
      expect(result.fileId).toBe("new-file-id")
      expect(fetchMock).toHaveBeenCalledTimes(2)

      // POSTされたボディの検証
      const lastCall = fetchMock.mock.calls[1]
      const body = lastCall[1].body as FormData
      const metadataBlob = body.get("metadata") as Blob
      const fileBlob = body.get("file") as Blob

      // Blobのテキストを読み出して検証
      const metadataText = await metadataBlob.text()
      const fileText = await fileBlob.text()

      expect(JSON.parse(metadataText)).toEqual({
        name: "temp_shared_cards.json",
        mimeType: "application/json"
      })

      const payload = JSON.parse(fileText)
      expect(payload.version).toBe(1)
      expect(payload.data.styleCards).toEqual([card])
    })

    it("should merge with existing cards if BackupPayload file exists", async () => {
      const existingCard = { id: "card-1", name: "Card 1" }
      const newCard = { id: "card-2", name: "Card 2" }

      fetchMock.mockImplementation(async (url: string, init?: any) => {
        if (url.includes("files?q=")) {
          return {
            ok: true,
            json: async () => ({ files: [{ id: "existing-file-id" }] })
          }
        }
        if (url.includes("existing-file-id?alt=media")) {
          return {
            ok: true,
            json: async () => ({
              version: 1,
              exportedAt: Date.now(),
              data: {
                styleCards: [existingCard]
              }
            })
          }
        }
        if (url.includes("upload/drive/v3/files/existing-file-id")) {
          expect(init.method).toBe("PATCH")
          return {
            ok: true,
            json: async () => ({ id: "existing-file-id" })
          }
        }
        return { ok: false }
      })

      const result = await client.saveCardData(newCard)

      expect(result.success).toBe(true)
      expect(result.fileId).toBe("existing-file-id")

      const lastCall = fetchMock.mock.calls[2]
      const body = lastCall[1].body as FormData
      const fileBlob = body.get("file") as Blob
      const fileText = await fileBlob.text()
      const payload = JSON.parse(fileText)

      expect(payload.data.styleCards).toEqual([existingCard, newCard])
    })

    it("should deduplicate by id when merging", async () => {
      const existingCard = { id: "card-1", name: "Card 1 Old" }
      const updatedCard = { id: "card-1", name: "Card 1 New" }

      fetchMock.mockImplementation(async (url: string, init?: any) => {
        if (url.includes("files?q=")) {
          return {
            ok: true,
            json: async () => ({ files: [{ id: "existing-file-id" }] })
          }
        }
        if (url.includes("existing-file-id?alt=media")) {
          return {
            ok: true,
            json: async () => ({
              version: 1,
              exportedAt: Date.now(),
              data: {
                styleCards: [existingCard]
              }
            })
          }
        }
        if (url.includes("upload/drive/v3/files/existing-file-id")) {
          return {
            ok: true,
            json: async () => ({ id: "existing-file-id" })
          }
        }
        return { ok: false }
      })

      const result = await client.saveCardData(updatedCard)

      expect(result.success).toBe(true)

      const lastCall = fetchMock.mock.calls[2]
      const body = lastCall[1].body as FormData
      const fileBlob = body.get("file") as Blob
      const fileText = await fileBlob.text()
      const payload = JSON.parse(fileText)

      expect(payload.data.styleCards).toEqual([updatedCard])
    })

    it("should support backward compatibility with old array-format files", async () => {
      const existingCard = { id: "card-1", name: "Card 1" }
      const newCard = { id: "card-2", name: "Card 2" }

      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes("files?q=")) {
          return {
            ok: true,
            json: async () => ({ files: [{ id: "existing-file-id" }] })
          }
        }
        if (url.includes("existing-file-id?alt=media")) {
          // 古い形式: 単なる配列
          return {
            ok: true,
            json: async () => [existingCard]
          }
        }
        if (url.includes("upload/drive/v3/files/existing-file-id")) {
          return {
            ok: true,
            json: async () => ({ id: "existing-file-id" })
          }
        }
        return { ok: false }
      })

      const result = await client.saveCardData(newCard)

      expect(result.success).toBe(true)

      const lastCall = fetchMock.mock.calls[2]
      const body = lastCall[1].body as FormData
      const fileBlob = body.get("file") as Blob
      const fileText = await fileBlob.text()
      const payload = JSON.parse(fileText)

      expect(payload.version).toBe(1)
      expect(payload.data.styleCards).toEqual([existingCard, newCard])
    })
  })
})
