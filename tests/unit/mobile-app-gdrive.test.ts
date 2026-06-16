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
})
