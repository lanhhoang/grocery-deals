import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { groceryDealsCache } from '@/modules/grocery-deals/database/schema'
import { desc } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/grocery-deals/cache',
  operationId: 'getGroceryDealsCache',
  summary: 'Read cached deals (top 20 by discount) — used by dashboard widget',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Cached deals' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const cached = await withRLS((db) =>
      db.select().from(groceryDealsCache)
        .orderBy(desc(groceryDealsCache.discountPercent))
        .limit(20)
    )

    const deals = cached.map((d) => ({
      ...d,
      currentPrice: d.currentPrice != null ? Number(d.currentPrice) : null,
      originalPrice: d.originalPrice != null ? Number(d.originalPrice) : null,
      discountPercent: Number(d.discountPercent),
    }))

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('GET /api/modules/grocery-deals/cache error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
