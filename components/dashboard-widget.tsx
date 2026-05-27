'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react'
import { useGroceryDeals } from '../hooks/use-grocery-deals'

export function GroceryDealsWidget() {
  const { data: deals = [], isLoading, isError, refetch } = useGroceryDeals()
  const topDeals = deals.slice(0, 5)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grocery Deals</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-red-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grocery Deals</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600">Failed to load deals</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="w-full mt-2 text-xs">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Grocery Deals</CardTitle>
        <ShoppingCart className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent className="space-y-2">
        {topDeals.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No deals cached yet. Open the module and refresh.</p>
        ) : (
          topDeals.map((deal) => (
            <div key={deal.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{deal.itemName}</p>
                <p className="text-xs text-muted-foreground truncate">{deal.storeName}</p>
              </div>
              <Badge className="shrink-0 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {deal.discountPercent}% OFF
              </Badge>
            </div>
          ))
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-xs"
          onClick={() => window.location.href = '/grocery-deals'}
        >
          <ShoppingCart className="w-3 h-3 mr-1" />
          View All Deals
        </Button>
      </CardContent>
    </Card>
  )
}
