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
   * データをJSONとして保存する
   */
  async saveCardData(cardData: any): Promise<GDriveUploadResult> {
    try {
      const token = await this.requestAccessToken()
      const existingFileId = await this.findExistingTempFile(token)

      const metadata = {
        name: "temp_shared_cards.json",
        mimeType: "application/json"
      }
      // モバイル版では一時的に現在の1枚のカードを配列で保存する仕様
      const fileContent = JSON.stringify([cardData], null, 2)
      const file = new Blob([fileContent], { type: "application/json" })

      const form = new FormData()
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      )
      form.append("file", file)

      let url =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
      let method = "POST"

      if (existingFileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        method = "PATCH"
      }

      const uploadResponse = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to Google Drive")
      }

      const result = await uploadResponse.json()
      return { success: true, fileId: result.id }
    } catch (err: any) {
      return { success: false, error: err }
    }
  }
}
