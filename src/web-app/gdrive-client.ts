/// <reference types="@types/google.accounts" />

export interface GDriveUploadResult {
  success: boolean
  fileId?: string
  error?: Error
}

export class GDriveClient {
  private clientId: string
  private apiKey: string
  private accessToken: string | null = null
  private tokenClient: google.accounts.oauth2.TokenClient | null = null

  constructor(clientId: string, apiKey: string) {
    this.clientId = clientId
    this.apiKey = apiKey
  }

  /**
   * Google Identity Services を用いてトークンを取得する
   */
  async requestAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken
    }

    if (
      typeof window === "undefined" ||
      !window.google ||
      !window.google.accounts ||
      !window.google.accounts.oauth2
    ) {
      throw new Error("Google Identity Services is not loaded yet.")
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (response) => {
            if (response.error !== undefined) {
              reject(new Error(response.error))
            } else {
              this.accessToken = response.access_token
              resolve(response.access_token)
            }
          }
        })

        // トークンリクエスト（ポップアップ表示）
        this.tokenClient.requestAccessToken({ prompt: "consent" })
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * Drive内の temp_shared_cards.json を検索する
   */
  private async findExistingTempFile(token: string): Promise<string | null> {
    const query = encodeURIComponent(
      "name='temp_shared_cards.json' and trashed=false"
    )
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (!response.ok) {
      throw new Error("Failed to search existing file.")
    }
    const data = await response.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
    return null
  }

  /**
   * 既存の一時共有カードファイルの内容をダウンロードする
   */
  private async downloadExistingTempFile(
    token: string,
    fileId: string
  ): Promise<any> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (!response.ok) {
      throw new Error("Failed to download existing temp shared cards file.")
    }
    return response.json()
  }

  /**
   * 既存のカード配列と新規カードデータをマージ（重複排除）する
   */
  private mergeCardData(existingCards: any[], cardData: any): any[] {
    const newCardId = cardData.id
    const merged = [...existingCards]

    if (newCardId) {
      const index = merged.findIndex((c) => c.id === newCardId)
      if (index > -1) {
        merged[index] = cardData
      } else {
        merged.push(cardData)
      }
    } else {
      const index = merged.findIndex(
        (c) =>
          c.name === cardData.name &&
          JSON.stringify(c.promptSegments) ===
            JSON.stringify(cardData.promptSegments)
      )
      if (index > -1) {
        merged[index] = cardData
      } else {
        merged.push(cardData)
      }
    }
    return merged
  }

  /**
   * マージされたペイロードを Google Drive にアップロードする
   */
  private async uploadTempFile(
    token: string,
    existingFileId: string | null,
    payload: any
  ): Promise<any> {
    const metadata = {
      name: "temp_shared_cards.json",
      mimeType: "application/json"
    }
    const fileContent = JSON.stringify(payload, null, 2)
    const file = new Blob([fileContent], { type: "application/json" })

    const form = new FormData()
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    )
    form.append("file", file)

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    const method = existingFileId ? "PATCH" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    })

    if (!response.ok) {
      throw new Error("Failed to upload to Google Drive")
    }
    return response.json()
  }

  /**
   * データをJSONとして保存する
   */
  async saveCardData(cardData: any): Promise<GDriveUploadResult> {
    try {
      const token = await this.requestAccessToken()
      const existingFileId = await this.findExistingTempFile(token)

      let existingCards: any[] = []
      if (existingFileId) {
        try {
          const payload = await this.downloadExistingTempFile(
            token,
            existingFileId
          )
          if (payload?.data && Array.isArray(payload.data.styleCards)) {
            existingCards = payload.data.styleCards
          } else if (Array.isArray(payload)) {
            existingCards = payload
          }
        } catch (downloadErr) {
          console.warn(
            "Failed to download or parse existing file, proceeding with empty list:",
            downloadErr
          )
        }
      }

      const mergedStyleCards = this.mergeCardData(existingCards, cardData)

      const payload = {
        version: 1,
        exportedAt: Date.now(),
        data: {
          styleCards: mergedStyleCards,
          categories: [],
          userSettings: [],
          historyItems: []
        }
      }

      const result = await this.uploadTempFile(token, existingFileId, payload)
      return { success: true, fileId: result.id }
    } catch (err: any) {
      return { success: false, error: err }
    }
  }
}
