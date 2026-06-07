import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { db } from "../lib/db"
import type { CustomCategory } from "../lib/db-schema"
import { getAllCategories } from "../lib/style-card-store"

export const CATEGORIES_QUERY_KEY = ["categories"]

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: getAllCategories,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function useAddCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category: CustomCategory) => db.addCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
    }
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      changes
    }: {
      id: string
      changes: Partial<CustomCategory>
    }) => db.updateCategory(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
    }
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => db.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
    }
  })
}
