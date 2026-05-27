'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { GroceryKeyword, GroceryDeal, GrocerySavedDeal, GrocerySettings } from '../types'

const SETTINGS_KEY = ['grocery-deals-settings']
const KEYWORDS_KEY = ['grocery-deals-keywords']
const DEALS_KEY = ['grocery-deals']
const SAVED_KEY = ['grocery-deals-saved']

// ─── Settings ────────────────────────────────────────────────────────────────

export function useGrocerySettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<GrocerySettings> => {
      const res = await fetch('/api/modules/grocery-deals/settings')
      if (!res.ok) return {}
      return res.json()
    },
  })
}

export function useUpdateGrocerySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Partial<GrocerySettings>): Promise<void> => {
      const res = await fetch('/api/modules/grocery-deals/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save settings')
      }
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY })
      const previous = queryClient.getQueryData<GrocerySettings>(SETTINGS_KEY)
      queryClient.setQueryData<GrocerySettings>(SETTINGS_KEY, (old = {}) => ({ ...old, ...newSettings }))
      return { previous }
    },
    onError: (_err, _newSettings, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
    },
  })
}

// ─── Keywords ────────────────────────────────────────────────────────────────

export function useGroceryKeywords() {
  return useQuery({
    queryKey: KEYWORDS_KEY,
    queryFn: async (): Promise<GroceryKeyword[]> => {
      const res = await fetch('/api/modules/grocery-deals/keywords')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch keywords')
      }
      const data = await res.json()
      return data.keywords ?? []
    },
  })
}

export function useAddKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyword: string): Promise<GroceryKeyword> => {
      const res = await fetch('/api/modules/grocery-deals/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add keyword')
      }
      const data = await res.json()
      return data.keyword
    },
    onMutate: async (newKeyword) => {
      await queryClient.cancelQueries({ queryKey: KEYWORDS_KEY })
      const previous = queryClient.getQueryData<GroceryKeyword[]>(KEYWORDS_KEY)
      queryClient.setQueryData<GroceryKeyword[]>(KEYWORDS_KEY, (old = []) => [
        { id: 'temp-' + Date.now(), keyword: newKeyword, createdAt: new Date().toISOString() },
        ...old,
      ])
      return { previous }
    },
    onError: (_err, _keyword, context) => {
      if (context?.previous) queryClient.setQueryData(KEYWORDS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYWORDS_KEY })
    },
  })
}

export function useRemoveKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/grocery-deals/keywords?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove keyword')
      }
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: KEYWORDS_KEY })
      const previous = queryClient.getQueryData<GroceryKeyword[]>(KEYWORDS_KEY)
      queryClient.setQueryData<GroceryKeyword[]>(KEYWORDS_KEY, (old = []) =>
        old.filter((k) => k.id !== deletedId)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(KEYWORDS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYWORDS_KEY })
    },
  })
}

// ─── Deals (cache + search) ───────────────────────────────────────────────────

export function useGroceryDeals() {
  return useQuery({
    queryKey: DEALS_KEY,
    queryFn: async (): Promise<GroceryDeal[]> => {
      const res = await fetch('/api/modules/grocery-deals/cache')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch deals')
      }
      const data = await res.json()
      return data.deals ?? []
    },
  })
}

export function useSearchDeals() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const mutation = useMutation({
    mutationFn: async (): Promise<{ deals: GroceryDeal[]; cached_at: string | null }> => {
      const res = await fetch('/api/modules/grocery-deals/search')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch deals from Flipp')
      }
      return res.json()
    },
    onMutate: () => {
      setIsRefreshing(true)
    },
    onSuccess: (data) => {
      queryClient.setQueryData<GroceryDeal[]>(DEALS_KEY, data.deals)
    },
    onError: () => {
      setIsRefreshing(false)
    },
    onSettled: () => {
      setIsRefreshing(false)
      queryClient.invalidateQueries({ queryKey: DEALS_KEY })
    },
  })

  return { ...mutation, isRefreshing }
}

// ─── Saved Deals ─────────────────────────────────────────────────────────────

export function useSavedDeals() {
  return useQuery({
    queryKey: SAVED_KEY,
    queryFn: async (): Promise<GrocerySavedDeal[]> => {
      const res = await fetch('/api/modules/grocery-deals/saved')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch saved deals')
      }
      const data = await res.json()
      return data.deals ?? []
    },
  })
}

export function useSaveDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (deal: Omit<GrocerySavedDeal, 'id' | 'savedAt'>): Promise<GrocerySavedDeal> => {
      const res = await fetch('/api/modules/grocery-deals/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save deal')
      }
      const data = await res.json()
      return data.deal
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_KEY })
    },
  })
}

export function useRemoveSavedDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/modules/grocery-deals/saved?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove saved deal')
      }
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: SAVED_KEY })
      const previous = queryClient.getQueryData<GrocerySavedDeal[]>(SAVED_KEY)
      queryClient.setQueryData<GrocerySavedDeal[]>(SAVED_KEY, (old = []) =>
        old.filter((d) => d.id !== deletedId)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(SAVED_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_KEY })
    },
  })
}
