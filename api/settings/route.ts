import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse } from '@/lib/api-helpers'
import { GrocerySettingsSchema, SettingsSavedSchema } from '@/modules/grocery-deals/lib/validation'
import { registry } from '@/lib/openapi/registry'
import { DEFAULT_SECURITY, ErrorResponseSchema, InternalServerErrorResponse } from '@/lib/openapi/common'
import { moduleSettings } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

registry.registerPath({
  method: 'get',
  path: '/api/modules/grocery-deals/settings',
  operationId: 'getGroceryDealsSettings',
  summary: "Fetch the user's grocery-deals settings",
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  responses: {
    200: { description: 'Settings object', content: { 'application/json': { schema: GrocerySettingsSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

registry.registerPath({
  method: 'put',
  path: '/api/modules/grocery-deals/settings',
  operationId: 'updateGroceryDealsSettings',
  summary: 'JSONB-merge update of grocery-deals settings',
  tags: ['grocery-deals'],
  security: DEFAULT_SECURITY,
  request: { body: { content: { 'application/json': { schema: GrocerySettingsSchema } } } },
  responses: {
    200: { description: 'Settings saved', content: { 'application/json': { schema: SettingsSavedSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: InternalServerErrorResponse,
  },
})

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const data = await withRLS((db) =>
      db.select({ settings: moduleSettings.settings })
        .from(moduleSettings)
        .where(eq(moduleSettings.moduleId, 'grocery-deals'))
        .limit(1)
    )

    return NextResponse.json(data[0]?.settings ?? {})
  } catch (error) {
    console.error('GET /api/modules/grocery-deals/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, GrocerySettingsSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const patch = JSON.stringify(validation.data)
    await withRLS((db) =>
      db.insert(moduleSettings)
        .values({ userId: user.id, moduleId: 'grocery-deals', settings: validation.data })
        .onConflictDoUpdate({
          target: [moduleSettings.userId, moduleSettings.moduleId],
          set: {
            settings: sql`COALESCE(${moduleSettings.settings}, '{}'::jsonb) || ${patch}::jsonb`,
            updatedAt: sql`timezone('utc'::text, now())`,
          },
        })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/modules/grocery-deals/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
