export interface CacheOptions {
  expectedSize: number
  expectedHash?: string // SHA-256 (hex string)
  onProgress?: (progress: number, speed: number, eta: number) => void
}

export class OPFSCacheManager {
  private static DIR_NAME = "litert_models"

  /**
   * OPFSのディレクトリハンドルを取得する
   */
  private static async getDirectoryHandle(
    create = true
  ): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory()
    return await root.getDirectoryHandle(this.DIR_NAME, { create })
  }

  /**
   * 指定のファイルがキャッシュに存在し、サイズが一致するか簡易チェック
   */
  static async isCached(
    filename: string,
    expectedSize: number
  ): Promise<boolean> {
    try {
      const dir = await this.getDirectoryHandle(false)
      const fileHandle = await dir.getFileHandle(filename)
      const file = await fileHandle.getFile()
      return file.size === expectedSize
    } catch {
      return false
    }
  }

  /**
   * 整合性検証（サイズチェック、およびオプションでハッシュチェック）
   */
  static async verifyIntegrity(
    filename: string,
    expectedSize: number,
    expectedHash?: string
  ): Promise<boolean> {
    try {
      const dir = await this.getDirectoryHandle(false)
      const fileHandle = await dir.getFileHandle(filename)
      const file = await fileHandle.getFile()

      if (file.size !== expectedSize) {
        return false
      }

      if (expectedHash) {
        const buffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        return hashHex === expectedHash
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * 不要な古いファイルをOPFSから削除する
   */
  private static async cleanupOldFiles(
    dir: FileSystemDirectoryHandle,
    keepFilename?: string
  ): Promise<void> {
    const entries = await (dir as any).values()
    if (!entries) return

    for await (const entry of entries) {
      if (entry.kind === "file" && entry.name !== keepFilename) {
        try {
          await dir.removeEntry(entry.name)
          console.log(`Cleaned up old cache file: ${entry.name}`)
        } catch (e) {
          console.error(`Failed to delete cache file ${entry.name}:`, e)
        }
      }
    }
  }

  /**
   * キャッシュの空き容量を監視し、必要に応じて古いファイルを削除する
   */
  static async ensureSpace(
    requiredBytes: number,
    keepFilename?: string
  ): Promise<void> {
    const estimate = await navigator.storage.estimate()
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? 0
    const freeSpace = quota - usage

    if (freeSpace < requiredBytes) {
      console.warn(
        `Insufficient space in OPFS. Free: ${freeSpace} bytes, Required: ${requiredBytes} bytes. Starting cleanup...`
      )

      const dir = await this.getDirectoryHandle(false).catch(() => null)
      if (dir) {
        await this.cleanupOldFiles(dir, keepFilename)
      }

      const postCleanupEstimate = await navigator.storage.estimate()
      const postUsage = postCleanupEstimate.usage ?? 0
      const postQuota = postCleanupEstimate.quota ?? 0
      if (postQuota - postUsage < requiredBytes) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError")
      }
    }
  }

  /**
   * モデルファイルをOPFSから取得する
   */
  static async getFile(filename: string): Promise<File> {
    const dir = await this.getDirectoryHandle(false)
    const fileHandle = await dir.getFileHandle(filename)
    return await fileHandle.getFile()
  }

  private static checkQuotaError(err: any): boolean {
    return !!(
      err &&
      (err.name === "QuotaExceededError" ||
        err.message?.includes("QuotaExceededError") ||
        err.message?.includes("quota"))
    )
  }

  private static async getWritableStream(
    fileHandle: FileSystemFileHandle
  ): Promise<FileSystemWritableFileStream> {
    try {
      return await fileHandle.createWritable()
    } catch (e: any) {
      if (this.checkQuotaError(e)) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError")
      }
      throw e
    }
  }

  private static async checkIntegrityAndCleanup(
    dir: FileSystemDirectoryHandle,
    filename: string,
    expectedSize: number,
    expectedHash?: string
  ): Promise<void> {
    const isValid = await this.verifyIntegrity(
      filename,
      expectedSize,
      expectedHash
    )
    if (!isValid) {
      try {
        await dir.removeEntry(filename)
      } catch (removeErr) {
        console.warn("Failed to remove invalid file:", removeErr)
      }
      throw new Error(`Integrity check failed for ${filename}`)
    }
  }

  /**
   * データをOPFSにダウンロード・保存する
   */
  static async downloadAndCache(
    url: string,
    filename: string,
    options: CacheOptions
  ): Promise<void> {
    const { expectedSize, expectedHash, onProgress } = options

    await this.ensureSpace(expectedSize, filename)

    const response = await fetch(url)
    if (!response.ok || !response.body) {
      throw new Error(
        `Failed to fetch model from ${url}: ${response.statusText}`
      )
    }

    const contentLength = response.headers.get("Content-Length")
    const totalBytes = contentLength
      ? parseInt(contentLength, 10)
      : expectedSize

    const dir = await this.getDirectoryHandle(true)
    const fileHandle = await dir.getFileHandle(filename, { create: true })
    const writable = await this.getWritableStream(fileHandle)

    try {
      await this.writeStreamToWritable(
        response.body.getReader(),
        writable,
        totalBytes,
        onProgress
      )
    } catch (err: any) {
      try {
        await writable.abort()
      } catch (abortErr) {
        console.warn("Failed to abort writable stream:", abortErr)
      }
      if (this.checkQuotaError(err)) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError")
      }
      throw err
    }

    await this.checkIntegrityAndCleanup(
      dir,
      filename,
      expectedSize,
      expectedHash
    )
  }

  private static async writeStreamToWritable(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    writable: FileSystemWritableFileStream,
    totalBytes: number,
    onProgress?: (progress: number, speed: number, eta: number) => void
  ): Promise<void> {
    let receivedBytes = 0
    const startTime = Date.now()
    let lastProgress = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      try {
        await writable.write(value as any)
      } catch (writeError: any) {
        if (this.checkQuotaError(writeError)) {
          throw new DOMException("QuotaExceededError", "QuotaExceededError")
        }
        throw writeError
      }

      receivedBytes += value.length

      if (onProgress) {
        const progress = Math.min(
          99,
          Math.round((receivedBytes / totalBytes) * 100)
        )
        if (progress > lastProgress) {
          lastProgress = progress
          const elapsedMs = Date.now() - startTime
          const speed = Number(
            (receivedBytes / (elapsedMs / 1000) / (1024 * 1024)).toFixed(1)
          )
          const eta = Math.max(
            0,
            Math.round(
              (elapsedMs / (receivedBytes / totalBytes) - elapsedMs) / 1000
            )
          )
          onProgress(progress, speed, eta)
        }
      }
    }
    await writable.close()
  }

  /**
   * キャッシュを削除する
   */
  static async deleteCache(filename: string): Promise<void> {
    try {
      const dir = await this.getDirectoryHandle(false)
      await dir.removeEntry(filename)
    } catch (e) {
      console.warn("Failed to delete cache:", e)
    }
  }
}
