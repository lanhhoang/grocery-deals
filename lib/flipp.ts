const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp'

export interface FlippDeal {
  itemName: string
  description: string | null
  currentPrice: number | null
  originalPrice: number | null
  storeName: string
  imageUrl: string | null
  discountPercent: number
  keyword: string
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
    return (data.items ?? [])
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
          storeName: String(item.merchant ?? ''),
          imageUrl: (item.clean_image_url || item.clipping_image_url)
            ? String(item.clean_image_url || item.clipping_image_url)
            : null,
          discountPercent: discount,
          keyword,
        }
      })
      .filter((d: FlippDeal) => d.discountPercent > 0)
  } catch {
    return []
  }
}
