'use client'

import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Bookmark } from 'lucide-react'
import { useSavedDeals, useRemoveSavedDeal } from '../../hooks/use-grocery-deals'
import { DealCard } from '../../components/deal-card'

export default function SavedDealsPage() {
  const { toast } = useToast()
  const { data: savedDeals = [], isLoading } = useSavedDeals()
  const removeSavedDeal = useRemoveSavedDeal()

  const handleUnsave = (id: string) => {
    removeSavedDeal.mutate(id, {
      onError: () => toast({ variant: 'destructive', title: 'Failed to remove deal' }),
    })
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-4xl font-medium">Saved Deals</h1>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && savedDeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <Bookmark className="w-12 h-12 opacity-40" />
          <p className="text-lg font-medium">No saved deals yet</p>
          <p className="text-sm">Star deals from the main feed to save them here.</p>
        </div>
      )}

      {!isLoading && savedDeals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isSaved={true}
              onUnsave={() => handleUnsave(deal.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
