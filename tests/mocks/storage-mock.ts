/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from "vitest"

export class MockFileSystemFileHandle {
  kind = "file" as const
  private content: Uint8Array = new Uint8Array(0)

  constructor(public name: string) {}

  async getFile(): Promise<File> {
    return new File([this.content], this.name)
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    const chunks: Uint8Array[] = []

    return {
      write: async (chunk: any) => {
        if (MockStorage.shouldFailWithQuota) {
          throw new DOMException("QuotaExceededError", "QuotaExceededError")
        }
        const data =
          chunk instanceof ArrayBuffer
            ? new Uint8Array(chunk)
            : chunk instanceof Uint8Array
              ? chunk
              : new Uint8Array(chunk.buffer || chunk)
        chunks.push(data)
      },
      close: async () => {
        if (MockStorage.shouldFailWithQuota) {
          throw new DOMException("QuotaExceededError", "QuotaExceededError")
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const merged = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          merged.set(chunk, offset)
          offset += chunk.length
        }
        this.content = merged
      },
      abort: async () => {}
    } as any
  }
}

export class MockFileSystemDirectoryHandle {
  kind = "directory" as const
  private entriesMap = new Map<
    string,
    MockFileSystemFileHandle | MockFileSystemDirectoryHandle
  >()

  constructor(public name: string) {}

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemDirectoryHandle> {
    if (!this.entriesMap.has(name)) {
      if (options?.create) {
        this.entriesMap.set(name, new MockFileSystemDirectoryHandle(name))
      } else {
        throw new DOMException("NotFoundError", "NotFoundError")
      }
    }
    return this.entriesMap.get(name) as any
  }

  async getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle> {
    if (!this.entriesMap.has(name)) {
      if (options?.create) {
        this.entriesMap.set(name, new MockFileSystemFileHandle(name))
      } else {
        throw new DOMException("NotFoundError", "NotFoundError")
      }
    }
    return this.entriesMap.get(name) as any
  }

  async removeEntry(name: string): Promise<void> {
    if (this.entriesMap.has(name)) {
      this.entriesMap.delete(name)
    } else {
      throw new DOMException("NotFoundError", "NotFoundError")
    }
  }

  async *values(): AsyncIterableIterator<
    MockFileSystemFileHandle | MockFileSystemDirectoryHandle
  > {
    for (const val of this.entriesMap.values()) {
      yield val
    }
  }
}

export const MockStorage = {
  shouldFailWithQuota: false,
  mockUsage: 0,
  mockQuota: 1024 * 1024 * 10, // 10MB default
  rootDir: new MockFileSystemDirectoryHandle("root"),

  setup() {
    this.shouldFailWithQuota = false
    this.mockUsage = 0
    this.mockQuota = 1024 * 1024 * 10
    this.rootDir = new MockFileSystemDirectoryHandle("root")

    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn().mockImplementation(async () => {
          return {
            usage: this.mockUsage,
            quota: this.mockQuota
          }
        }),
        getDirectory: vi.fn().mockResolvedValue(this.rootDir)
      },
      configurable: true,
      writable: true
    })
  },

  setUsage(usage: number) {
    this.mockUsage = usage
  },

  setQuota(quota: number) {
    this.mockQuota = quota
  },

  triggerQuotaExceeded(fail: boolean) {
    this.shouldFailWithQuota = fail
  }
}

export class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  private isCached = false

  constructor(public scriptUrl: string) {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { status: "ready" } } as MessageEvent)
      }
    }, 10)
  }

  private postToMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }

  private handleStartDownload() {
    this.postToMessage({
      status: "downloading",
      progress: 50,
      speed: 1.2,
      eta: 5,
      text: "Downloading model weights... (50%)"
    })
    setTimeout(() => {
      this.isCached = true
      this.postToMessage({ status: "ready" })
    }, 20)
  }

  private handlePreload() {
    if (this.isCached) {
      this.postToMessage({ status: "engine-ready" })
    } else {
      this.postToMessage({ status: "error", error: "Model file not found" })
    }
  }

  private handleRunInference(payload: any) {
    const { requestId, prompt } = payload
    this.postToMessage({
      status: "inference-result",
      requestId,
      result: `Mocked AI Response to: ${prompt}`,
      metrics: {
        latencyMs: 120,
        tokensPerSec: 25.5,
        estimatedTokens: 10,
        vramBytes: 2264924160
      }
    })
  }

  private handleUnload() {
    this.postToMessage({ status: "idle", info: "Engine unloaded manually" })
  }

  postMessage(data: any) {
    const { action, ...payload } = data

    setTimeout(() => {
      switch (action) {
        case "start-download":
          this.handleStartDownload()
          break
        case "preload":
          this.handlePreload()
          break
        case "run-inference":
          this.handleRunInference(payload)
          break
        case "unload":
          this.handleUnload()
          break
      }
    }, 10)
  }

  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
