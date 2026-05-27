import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { groceryKeywords, groceryDealsCache } from '@/modules/grocery-deals/database/schema'
import { moduleSettings } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { fetchAndDeduplicateDeals } from '@/modules/grocery-deals/lib/flipp'

const DEFAULT_POSTAL_CODE = 'M5V3A8'

registry.registerPath({
  method: 'get',
  path: '/api/modules/grocery-deals/search',
  operationId: 'searchGroceryDeals',
  summary: 'Fan out to Flipp for all keywords, deduplicate by cheapest store, attach addresses, refresh cache',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Deals fetched and cached' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    // Read postal code from settings
    const settingsRows = await withRLS((db) =>
      db.select({ settings: moduleSettings.settings })
        .from(moduleSettings)
        .where(eq(moduleSettings.moduleId, 'grocery-deals'))
        .limit(1)
    )
    const settings = settingsRows[0]?.settings as { postalCode?: string } | undefined
    const postalCode = settings?.postalCode ?? DEFAULT_POSTAL_CODE

    // Fetch keywords
    const keywordRows = await withRLS((db) =>
      db.select({ keyword: groceryKeywords.keyword }).from(groceryKeywords)
    )

    if (keywordRows.length === 0) {
      return NextResponse.json({ deals: [], cached_at: null })
    }

    // Fan out, deduplicate by cheapest-per-item, attach store addresses
    const allDeals = await fetchAndDeduplicateDeals(
      keywordRows.map((r) => r.keyword),
      postalCode
    )

    // Clear old cache for this user
    await withRLS((db) =>
      db.delete(groceryDealsCache).where(eq(groceryDealsCache.userId, user.id))
    )

    // Insert fresh results
    if (allDeals.length > 0) {
      await withRLS((db) =>
        db.insert(groceryDealsCache).values(
          allDeals.map((d) => ({
            userId: user.id,
            keyword: d.keyword,
            itemName: d.itemName,
            storeName: d.storeName,
            storeAddress: d.storeAddress,
            currentPrice: d.currentPrice != null ? String(d.currentPrice) : null,
            originalPrice: d.originalPrice != null ? String(d.originalPrice) : null,
            discountPercent: String(d.discountPercent),
            imageUrl: d.imageUrl,
            description: d.description,
          }))
        )
      )
    }

    // Read back sorted results, top 50
    const cached = await withRLS((db) =>
      db.select().from(groceryDealsCache)
        .orderBy(desc(groceryDealsCache.discountPercent))
        .limit(50)
    )

    const deals = cached.map((d) => ({
      ...d,
      currentPrice: d.currentPrice != null ? Number(d.currentPrice) : null,
      originalPrice: d.originalPrice != null ? Number(d.originalPrice) : null,
      discountPercent: Number(d.discountPercent),
    }))

    return NextResponse.json({ deals, cached_at: new Date().toISOString() })
  } catch (error) {
    console.error('GET /api/modules/grocery-deals/search error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
