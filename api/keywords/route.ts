import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse } from '@/lib/api-helpers'
import { KeywordSchema, DeleteKeywordQuerySchema } from '@/modules/grocery-deals/lib/validation'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { groceryKeywords } from '@/modules/grocery-deals/database/schema'
import { eq, and, desc } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/grocery-deals/keywords',
  operationId: 'getGroceryKeywords',
  summary: "Get the user's keyword watchlist",
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'List of keywords' },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/modules/grocery-deals/keywords',
  operationId: 'addGroceryKeyword',
  summary: 'Add a keyword to the watchlist',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: KeywordSchema } } } },
  responses: {
    200: { description: 'Keyword added' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/modules/grocery-deals/keywords',
  operationId: 'deleteGroceryKeyword',
  summary: 'Remove a keyword from the watchlist',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  request: { query: DeleteKeywordQuerySchema },
  responses: {
    200: { description: 'Keyword removed' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const keywords = await withRLS((db) =>
      db.select().from(groceryKeywords).orderBy(desc(groceryKeywords.createdAt))
    )

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('GET /api/modules/grocery-deals/keywords error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, KeywordSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    // Enforce max 20 keywords
    const existing = await withRLS((db) =>
      db.select({ id: groceryKeywords.id }).from(groceryKeywords)
    )
    if (existing.length >= 20) {
      return createErrorResponse('Maximum of 20 keywords allowed', 400)
    }

    const [newKeyword] = await withRLS((db) =>
      db.insert(groceryKeywords)
        .values({ userId: user.id, keyword: validation.data.keyword })
        .returning()
    )

    return NextResponse.json({ keyword: newKeyword })
  } catch (error) {
    console.error('POST /api/modules/grocery-deals/keywords error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryValidation = DeleteKeywordQuerySchema.safeParse({ id: searchParams.get('id') })
    if (!queryValidation.success) {
      return createErrorResponse(queryValidation.error.errors[0]?.message ?? 'Invalid id', 400)
    }

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    await withRLS((db) =>
      db.delete(groceryKeywords)
        .where(and(eq(groceryKeywords.id, queryValidation.data.id), eq(groceryKeywords.userId, user.id)))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/modules/grocery-deals/keywords error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
