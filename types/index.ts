export interface GroceryKeyword {
  id: string
  keyword: string
  createdAt: string
}

export interface GroceryDeal {
  id: string
  keyword: string
  itemName: string
  storeName: string
  storeAddress: string | null
  currentPrice: number | null
  originalPrice: number | null
  discountPercent: number
  imageUrl: string | null
  description: string | null
  fetchedAt: string
  isSaved?: boolean
}

export interface GrocerySavedDeal extends Omit<GroceryDeal, 'fetchedAt' | 'isSaved'> {
  savedAt: string
}

export interface GrocerySettings {
  postalCode?: string
  onboardingCompleted?: boolean
}
