const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export interface FlippDeal {
  itemName: string
  description: string | null
  currentPrice: number | null
  originalPrice: number | null
  storeName: string
  storeAddress: string | null
  imageUrl: string | null
  discountPercent: number
  keyword: string
}

// Resolve a city name from a postal code via Nominatim (used to narrow store lookups)
async function resolveCity(postalCode: string): Promise<string> {
  try {
    const url = `${NOMINATIM_BASE}/search?postalcode=${encodeURIComponent(postalCode)}&format=json&addressdetails=1&limit=1&countrycodes=ca,us`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'ARI-GroceryDeals/1.0' },
    })
    if (!res.ok) return ''
    const data = await res.json()
    const addr = data[0]?.address ?? {}
    return addr.city ?? addr.town ?? addr.village ?? ''
  } catch {
    return ''
  }
}

// Look up a store's street address by merchant name + city via Nominatim
async function lookupStoreAddress(merchantName: string, city: string): Promise<string | null> {
  try {
    const q = city ? `${merchantName} ${city}` : merchantName
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1&countrycodes=ca,us`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'ARI-GroceryDeals/1.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data[0]) return null
    const addr = data[0].address ?? {}
    const parts = [
      addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road,
      addr.city ?? addr.town ?? addr.village,
      addr.state,
      addr.postcode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : (data[0].display_name ?? null)
  } catch {
    return null
  }
}

export async function searchFlipp(keyword: string, postalCode: string): Promise<FlippDeal[]> {
  try {
    const url = `${FLIPP_BASE}/items/search?q=${encodeURIComponent(keyword)}&postal_code=${encodeURIComponent(postalCode)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return []
    const data = await res.json()

    const raw: FlippDeal[] = (data.items ?? [])
      .map((item: Record<string, unknown>) => {
        const cur = item.current_price != null ? Number(item.current_price) : null
        const orig = item.original_price != null ? Number(item.original_price) : null
        const discount = cur && orig && orig > cur
          ? Math.round(((orig - cur) / orig) * 100)
          : 0
        return {
          itemName: String(item.name ?? ''),
          description: item.description ? String(item.description) : null,
          currentPrice: cur,
          originalPrice: orig,
          storeName: String(item.merchant_name ?? item.merchant ?? ''),
          storeAddress: null,
          imageUrl: (item.clean_image_url || item.clipping_image_url)
            ? String(item.clean_image_url || item.clipping_image_url)
            : null,
          discountPercent: discount,
          keyword,
        }
      })
      .filter((d: FlippDeal) => d.discountPercent > 0)

    return raw
  } catch {
    return []
  }
}

// Fan out all keywords, group by item name keeping cheapest per item, attach store addresses
export async function fetchAndDeduplicateDeals(
  keywords: string[],
  postalCode: string
): Promise<FlippDeal[]> {
  // Resolve city once for address lookups
  const city = await resolveCity(postalCode)

  // Fan out keyword searches
  const results = await Promise.all(keywords.map((kw) => searchFlipp(kw, postalCode)))
  const allDeals = results.flat()

  // Group by normalised item name — keep only cheapest across stores
  const byItem = new Map<string, FlippDeal>()
  for (const deal of allDeals) {
    const key = deal.itemName.toLowerCase().trim()
    const existing = byItem.get(key)
    if (!existing) {
      byItem.set(key, deal)
    } else {
      const existingPrice = existing.currentPrice ?? Infinity
      const newPrice = deal.currentPrice ?? Infinity
      if (newPrice < existingPrice) byItem.set(key, deal)
    }
  }

  const deduplicated = Array.from(byItem.values())

  // Look up store addresses for unique merchants (rate-limit: 1 req/sec per Nominatim ToS)
  const uniqueMerchants = [...new Set(deduplicated.map((d) => d.storeName))]
  const addressMap = new Map<string, string | null>()

  for (const merchant of uniqueMerchants) {
    const address = await lookupStoreAddress(merchant, city)
    addressMap.set(merchant, address)
    // Nominatim requires max 1 request/second
    await new Promise((r) => setTimeout(r, 1100))
  }

  return deduplicated.map((deal) => ({
    ...deal,
    storeAddress: addressMap.get(deal.storeName) ?? null,
  }))
}
