import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse } from '@/lib/api-helpers'
import { SaveDealSchema, DeleteSavedDealQuerySchema } from '@/modules/grocery-deals/lib/validation'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { grocerySavedDeals } from '@/modules/grocery-deals/database/schema'
import { eq, and, desc } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/grocery-deals/saved',
  operationId: 'getSavedGroceryDeals',
  summary: "Get the user's saved deals",
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Saved deals list' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/modules/grocery-deals/saved',
  operationId: 'savGroceryDeal',
  summary: 'Star/save a deal',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: SaveDealSchema } } } },
  responses: {
    200: { description: 'Deal saved' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/modules/grocery-deals/saved',
  operationId: 'removeSavedGroceryDeal',
  summary: 'Remove a saved deal',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  request: { query: DeleteSavedDealQuerySchema },
  responses: {
    200: { description: 'Deal removed' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const rows = await withRLS((db) =>
      db.select().from(grocerySavedDeals).orderBy(desc(grocerySavedDeals.savedAt))
    )

    const deals = rows.map((d) => ({
      ...d,
      currentPrice: d.currentPrice != null ? Number(d.currentPrice) : null,
      originalPrice: d.originalPrice != null ? Number(d.originalPrice) : null,
      discountPercent: Number(d.discountPercent),
    }))

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('GET /api/modules/grocery-deals/saved error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, SaveDealSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const d = validation.data
    const [saved] = await withRLS((db) =>
      db.insert(grocerySavedDeals)
        .values({
          userId: user.id,
          keyword: d.keyword,
          itemName: d.itemName,
          storeName: d.storeName,
          currentPrice: d.currentPrice != null ? String(d.currentPrice) : null,
          originalPrice: d.originalPrice != null ? String(d.originalPrice) : null,
          discountPercent: String(d.discountPercent),
          imageUrl: d.imageUrl,
          description: d.description,
        })
        .returning()
    )

    return NextResponse.json({
      deal: {
        ...saved,
        currentPrice: saved.currentPrice != null ? Number(saved.currentPrice) : null,
        originalPrice: saved.originalPrice != null ? Number(saved.originalPrice) : null,
        discountPercent: Number(saved.discountPercent),
      },
    })
  } catch (error) {
    console.error('POST /api/modules/grocery-deals/saved error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryValidation = DeleteSavedDealQuerySchema.safeParse({ id: searchParams.get('id') })
    if (!queryValidation.success) {
      return createErrorResponse(queryValidation.error.errors[0]?.message ?? 'Invalid id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    await withRLS((db) =>
      db.delete(grocerySavedDeals)
        .where(and(eq(grocerySavedDeals.id, queryValidation.data.id), eq(grocerySavedDeals.userId, user.id)))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/modules/grocery-deals/saved error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
