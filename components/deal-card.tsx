'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'
import Image from 'next/image'
import type { GroceryDeal, GrocerySavedDeal } from '../types'

interface DealCardProps {
  deal: GroceryDeal | GrocerySavedDeal
  isSaved: boolean
  onSave?: () => void
  onUnsave?: () => void
}

function discountBadgeClass(pct: number) {
  if (pct >= 40) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
  if (pct >= 20) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export function DealCard({ deal, isSaved, onSave, onUnsave }: DealCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        {/* Store + badge row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground truncate">{deal.storeName}</span>
          <Badge className={`shrink-0 text-xs font-semibold ${discountBadgeClass(deal.discountPercent)}`}>
            {deal.discountPercent}% OFF
          </Badge>
        </div>

        {/* Image */}
        {deal.imageUrl && (
          <div className="relative w-20 h-20 mx-auto">
            <Image
              src={deal.imageUrl}
              alt={deal.itemName}
              fill
              className="object-contain rounded"
              unoptimized
            />
          </div>
        )}

        {/* Item name */}
        <p className="font-medium text-sm line-clamp-2 flex-1">{deal.itemName}</p>

        {/* Description */}
        {deal.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{deal.description}</p>
        )}

        {/* Price row + save button */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t">
          <div className="flex items-baseline gap-1.5">
            {deal.currentPrice != null && (
              <span className="font-semibold text-sm">${deal.currentPrice.toFixed(2)}</span>
            )}
            {deal.originalPrice != null && deal.originalPrice !== deal.currentPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ${deal.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <Button
            variant={isSaved ? 'default' : 'outline'}
            size="sm"
            className="shrink-0 text-xs h-7 px-2"
            onClick={isSaved ? onUnsave : onSave}
          >
            <Star className={`w-3 h-3 mr-1 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
