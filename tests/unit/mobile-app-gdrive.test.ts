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

  it("should reject if tokenClient returns error", async () => {
    const mockRequestAccessToken = vi.fn()
    const mockInitTokenClient = vi.fn().mockReturnValue({
      requestAccessToken: mockRequestAccessToken
    })
    global.window.google.accounts.oauth2.initTokenClient = mockInitTokenClient

    const tokenPromise = client.requestAccessToken()

    const initArgs = mockInitTokenClient.mock.calls[0][0]
    initArgs.callback({ error: "access_denied" })

    await expect(tokenPromise).rejects.toThrow("access_denied")
  })

  describe("saveCardData", () => {
    let mockFetch: any

    beforeEach(() => {
      mockFetch = vi.fn()
      global.fetch = mockFetch
      // すでに認証済み状態にしておく
      ;(client as any).accessToken = "test-token"
    })

    it("should successfully save card data as a new file (POST)", async () => {
      // 1. findExistingTempFile: 既存ファイルなしの応答
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      })
      // 2. uploadResponse: 成功時の応答
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-file-id" })
      })

      const cardData = { name: "Test Card" }
      const result = await client.saveCardData(cardData)

      expect(result).toEqual({ success: true, fileId: "new-file-id" })
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // findExistingTempFile のURL検証
      const findCall = mockFetch.mock.calls[0]
      expect(findCall[0]).toContain("https://www.googleapis.com/drive/v3/files")

      // upload のURLとmethodの検証
      const uploadCall = mockFetch.mock.calls[1]
      expect(uploadCall[0]).toBe(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
      )
      expect(uploadCall[1].method).toBe("POST")
    })

    it("should successfully update existing card data (PATCH)", async () => {
      // 1. findExistingTempFile: 既存ファイルありの応答
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: "existing-file-id" }] })
      })
      // 2. uploadResponse: 成功時の応答
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "existing-file-id" })
      })

      const cardData = { name: "Test Card" }
      const result = await client.saveCardData(cardData)

      expect(result).toEqual({ success: true, fileId: "existing-file-id" })
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // upload のURLとmethodが PATCH であることを検証
      const uploadCall = mockFetch.mock.calls[1]
      expect(uploadCall[0]).toBe(
        "https://www.googleapis.com/upload/drive/v3/files/existing-file-id?uploadType=multipart"
      )
      expect(uploadCall[1].method).toBe("PATCH")
    })

    it("should return success: false if requestAccessToken fails", async () => {
      // 認証情報をクリアし、requestAccessTokenが例外を投げるようにする
      ;(client as any).accessToken = null
      ;(window as any).google = undefined

      const cardData = { name: "Test Card" }
      const result = await client.saveCardData(cardData)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it("should return success: false if findExistingTempFile fails (fetch not ok)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const cardData = { name: "Test Card" }
      const result = await client.saveCardData(cardData)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Failed to search existing file")
    })

    it("should return success: false if upload fails (fetch not ok)", async () => {
      // 1. findExistingTempFile: 既存ファイルなしの応答
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      })
      // 2. uploadResponse: アップロード失敗の応答
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const cardData = { name: "Test Card" }
      const result = await client.saveCardData(cardData)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain(
        "Failed to upload to Google Drive"
      )
    })
  })
})
