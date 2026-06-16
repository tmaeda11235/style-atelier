import { beforeEach, describe, expect, it, vi } from "vitest"

import { GDriveClient } from "../../src/mobile-app/gdrive-client"

describe("GDriveClient", () => {
  const mockClientId = "test-client-id"
  const mockApiKey = "test-api-key"
  let client: GDriveClient

  beforeEach(() => {
    client = new GDriveClient(mockClientId, mockApiKey)
    vi.clearAllMocks()
    vi.restoreAllMocks()

    // Mock global fetch
    vi.stubGlobal("fetch", vi.fn())

    // Mock window.google
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
    ;(window as any).google = undefined

    await expect(client.requestAccessToken()).rejects.toThrow(
      "Google Identity Services is not loaded yet."
    )
  })

  it("should return access token if already authenticated", async () => {
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

    const tokenPromise = client.requestAccessToken()

    expect(mockInitTokenClient).toHaveBeenCalledWith({
      client_id: mockClientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: expect.any(Function)
    })

    expect(mockRequestAccessToken).toHaveBeenCalledWith({ prompt: "consent" })

    const initArgs = mockInitTokenClient.mock.calls[0][0]
    initArgs.callback({ access_token: "new-mock-token" })

    const token = await tokenPromise
    expect(token).toBe("new-mock-token")
  })

  it("should reject requestAccessToken if callback returns error", async () => {
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

  it("should reject requestAccessToken if requesting token throws", async () => {
    const mockInitTokenClient = vi.fn().mockImplementation(() => {
      throw new Error("Init failed")
    })
    global.window.google.accounts.oauth2.initTokenClient = mockInitTokenClient

    await expect(client.requestAccessToken()).rejects.toThrow("Init failed")
  })

  it("should save card data successfully when file does not exist (POST)", async () => {
    ;(client as any).accessToken = "existing-token"

    const mockFetch = vi.fn()
    // First call (findExistingTempFile): search returns empty list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] })
    })
    // Second call (saveCardData upload): upload returns new file ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "new-file-id" })
    })
    vi.stubGlobal("fetch", mockFetch)

    const cardData = { id: "card-1", name: "Test Card" }
    const result = await client.saveCardData(cardData)

    expect(result).toEqual({ success: true, fileId: "new-file-id" })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    // Verify search query parameters
    const searchUrl = mockFetch.mock.calls[0][0] as string
    expect(decodeURIComponent(searchUrl)).toContain(
      "name='temp_shared_cards.json'"
    )
    expect(decodeURIComponent(searchUrl)).toContain("trashed=false")

    // Verify upload request parameters (POST)
    const uploadUrl = mockFetch.mock.calls[1][0] as string
    const uploadOptions = mockFetch.mock.calls[1][1] as any
    expect(uploadUrl).toContain(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    )
    expect(uploadOptions.method).toBe("POST")
    expect(uploadOptions.headers.Authorization).toBe("Bearer existing-token")
    expect(uploadOptions.body).toBeInstanceOf(FormData)
  })

  it("should save card data successfully when file exists (PATCH)", async () => {
    ;(client as any).accessToken = "existing-token"

    const mockFetch = vi.fn()
    // First call (findExistingTempFile): search returns existing file ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: "existing-file-id" }] })
    })
    // Second call (saveCardData upload): upload returns file ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "existing-file-id" })
    })
    vi.stubGlobal("fetch", mockFetch)

    const cardData = { id: "card-1", name: "Test Card" }
    const result = await client.saveCardData(cardData)

    expect(result).toEqual({ success: true, fileId: "existing-file-id" })

    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Verify upload request parameters (PATCH with ID)
    const uploadUrl = mockFetch.mock.calls[1][0] as string
    const uploadOptions = mockFetch.mock.calls[1][1] as any
    expect(uploadUrl).toContain(
      "https://www.googleapis.com/upload/drive/v3/files/existing-file-id?uploadType=multipart"
    )
    expect(uploadOptions.method).toBe("PATCH")
  })

  it("should return success false if findExistingTempFile fails", async () => {
    ;(client as any).accessToken = "existing-token"

    const mockFetch = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: false
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await client.saveCardData({ id: "card-1" })

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe("Failed to search existing file.")
  })

  it("should return success false if upload fails", async () => {
    ;(client as any).accessToken = "existing-token"

    const mockFetch = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] })
    })
    mockFetch.mockResolvedValueOnce({
      ok: false
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await client.saveCardData({ id: "card-1" })

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe("Failed to upload to Google Drive")
  })
})
