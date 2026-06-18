import { useEffect, useState } from "react"

import { readBlobFromOpfs } from "../shared/lib/db/migration-helpers"

class LruCache<K, V> {
  private cache = new Map<K, V>()
  private max: number
  private onEvict?: (key: K, value: V) => void

  constructor(max = 100, onEvict?: (key: K, value: V) => void) {
    this.max = max
    this.onEvict = onEvict
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        const firstVal = this.cache.get(firstKey)
        this.cache.delete(firstKey)
        if (this.onEvict && firstVal !== undefined) {
          this.onEvict(firstKey, firstVal)
        }
      }
    }
    this.cache.set(key, value)
  }

  delete(key: K): void {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      if (this.onEvict) {
        this.onEvict(key, value)
      }
    }
  }

  clear(): void {
    for (const [key, value] of this.cache.entries()) {
      if (this.onEvict) {
        this.onEvict(key, value)
      }
    }
    this.cache.clear()
  }
}

const IMAGE_CACHE_LIMIT = 100

// Exported for testing purposes
export const opfsImageCache = new LruCache<string, string>(
  IMAGE_CACHE_LIMIT,
  (_filePath, objectUrl) => {
    URL.revokeObjectURL(objectUrl)
  }
)

const pendingLoads = new Map<string, Promise<string>>()

interface UseOpfsImageResult {
  imageUrl: string | undefined
  isLoading: boolean
  error: Error | null
}

export function useOpfsImage(filePath: string | undefined): UseOpfsImageResult {
  const [state, setState] = useState<UseOpfsImageResult>({
    imageUrl: undefined,
    isLoading: !!filePath,
    error: null
  })

  useEffect(() => {
    if (!filePath) {
      setState({ imageUrl: undefined, isLoading: false, error: null })
      return
    }

    const cachedUrl = opfsImageCache.get(filePath)
    if (cachedUrl) {
      setState({ imageUrl: cachedUrl, isLoading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    let isMounted = true

    let loadPromise = pendingLoads.get(filePath)
    if (!loadPromise) {
      loadPromise = readBlobFromOpfs(filePath)
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob)
          opfsImageCache.set(filePath, objectUrl)
          pendingLoads.delete(filePath)
          return objectUrl
        })
        .catch((err) => {
          pendingLoads.delete(filePath)
          throw err
        })
      pendingLoads.set(filePath, loadPromise)
    }

    loadPromise
      .then((objectUrl) => {
        if (!isMounted) return
        setState({ imageUrl: objectUrl, isLoading: false, error: null })
      })
      .catch((err) => {
        if (!isMounted) return
        setState({ imageUrl: undefined, isLoading: false, error: err as Error })
      })

    return () => {
      isMounted = false
    }
  }, [filePath])

  return state
}
