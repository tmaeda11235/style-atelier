import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { StyleCard } from "../lib/db-schema"
import {
  addStyleCard,
  deleteStyleCard,
  getAllStyleCards,
  getPinnedStyleCards,
  updateStyleCard
} from "../lib/style-card-store"

export const STYLE_CARDS_QUERY_KEY = ["styleCards"]
export const PINNED_CARDS_QUERY_KEY = ["pinnedCards"]

export function useStyleCards() {
  return useQuery({
    queryKey: STYLE_CARDS_QUERY_KEY,
    queryFn: getAllStyleCards,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function usePinnedStyleCards() {
  return useQuery({
    queryKey: PINNED_CARDS_QUERY_KEY,
    queryFn: getPinnedStyleCards,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function useAddStyleCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addStyleCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STYLE_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PINNED_CARDS_QUERY_KEY })
    }
  })
}

export function useUpdateStyleCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      changes
    }: {
      id: string
      changes: Partial<StyleCard>
    }) => updateStyleCard(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STYLE_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PINNED_CARDS_QUERY_KEY })
    }
  })
}

export function useDeleteStyleCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStyleCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STYLE_CARDS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PINNED_CARDS_QUERY_KEY })
    }
  })
}
