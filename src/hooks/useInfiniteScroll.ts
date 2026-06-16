import { useEffect, useRef } from "react"

interface UseInfiniteScrollProps {
  hasMore: boolean
  isLoading: boolean
  loadMore: () => void
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  loadMore
}: UseInfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: "100px"
      }
    )

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
      observer.disconnect()
    }
  }, [hasMore, loadMore, isLoading])

  return sentinelRef
}
