'use client'

import { useEffect, useState } from 'react'
import { useModuleEnabled } from '@/lib/modules/module-hooks'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingCart, RefreshCw, Settings } from 'lucide-react'
import Link from 'next/link'
import {
  useGrocerySettings,
  useGroceryKeywords,
  useGroceryDeals,
  useSearchDeals,
  useSavedDeals,
  useSaveDeal,
  useRemoveSavedDeal,
} from '../hooks/use-grocery-deals'
import { PostalCodePrompt } from '../components/postal-code-prompt'
import { DealCard } from '../components/deal-card'
import type { GroceryDeal } from '../types'

export default function GroceryDealsPage() {
  const { toast } = useToast()
  const { enabled: quotesEnabled } = useModuleEnabled('quotes')
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author?: string } | null>(null)

  const { data: settings, isLoading: settingsLoading } = useGrocerySettings()
  const { data: keywords = [] } = useGroceryKeywords()
  const { data: deals = [], isLoading: dealsLoading } = useGroceryDeals()
  const { data: savedDeals = [] } = useSavedDeals()
  const { mutate: search, isRefreshing } = useSearchDeals()
  const saveDeal = useSaveDeal()
  const removeSavedDeal = useRemoveSavedDeal()

  const savedIds = new Set(savedDeals.map((d) => d.id))

  useEffect(() => {
    if (!quotesEnabled) return
    let cancelled = false
    fetch('/api/modules/quotes/quotes')
      .then((res) => (res.ok ? res.json() : []))
      .then((quotes) => {
        if (!cancelled && quotes.length > 0)
          setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [quotesEnabled])

  const handleRefresh = () => {
    search(undefined, {
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Failed to fetch deals',
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      },
    })
  }

  const handleSave = (deal: GroceryDeal) => {
    saveDeal.mutate(
      {
        keyword: deal.keyword,
        itemName: deal.itemName,
        storeName: deal.storeName,
        currentPrice: deal.currentPrice,
        originalPrice: deal.originalPrice,
        discountPercent: deal.discountPercent,
        imageUrl: deal.imageUrl,
        description: deal.description,
      },
      {
        onError: () => toast({ variant: 'destructive', title: 'Failed to save deal' }),
      }
    )
  }

  const handleUnsave = (deal: GroceryDeal) => {
    const saved = savedDeals.find(
      (s) => s.itemName === deal.itemName && s.storeName === deal.storeName
    )
    if (!saved) return
    removeSavedDeal.mutate(saved.id, {
      onError: () => toast({ variant: 'destructive', title: 'Failed to remove deal' }),
    })
  }

  if (settingsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!settings?.onboardingCompleted) {
    return <PostalCodePrompt />
  }

  const isLoading = dealsLoading || isRefreshing

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-medium">Daily Grocery Deals</h1>
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Badge>
          </div>
          {quotesEnabled && randomQuote && (
            <p className="text-sm text-[#aa2020] mt-1">{randomQuote.quote}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/grocery-deals/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : "Refresh Today's Deals"}
          </Button>
        </div>
      </div>

      {/* No keywords state */}
      {keywords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <ShoppingCart className="w-12 h-12 opacity-40" />
          <p className="text-lg font-medium">No keywords yet</p>
          <p className="text-sm">Add keywords in Settings to start tracking deals.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/grocery-deals/settings">Go to Settings</Link>
          </Button>
        </div>
      )}

      {/* Empty cache state */}
      {keywords.length > 0 && !isLoading && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <ShoppingCart className="w-12 h-12 opacity-40" />
          <p className="text-lg font-medium">No deals cached yet</p>
          <p className="text-sm">Click &ldquo;Refresh Today&rsquo;s Deals&rdquo; to fetch the latest from Flipp.</p>
        </div>
      )}

      {/* Skeleton loading grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      )}

      {/* Deals grid */}
      {!isLoading && deals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isSaved={savedDeals.some(
                (s) => s.itemName === deal.itemName && s.storeName === deal.storeName
              )}
              onSave={() => handleSave(deal)}
              onUnsave={() => handleUnsave(deal)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
