import { z } from 'zod'
import '@/lib/openapi/registry'

export const GrocerySettingsSchema = z.object({
  postalCode: z.string().min(3, 'Postal code is required').max(10, 'Postal code too long').optional(),
  onboardingCompleted: z.boolean().optional(),
}).strict().openapi('GrocerySettings')

export const KeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(100, 'Keyword must be 100 characters or less'),
}).openapi('GroceryKeywordBody')

export const DeleteKeywordQuerySchema = z.object({
  id: z.string().uuid('Invalid keyword id'),
})

export const SaveDealSchema = z.object({
  keyword: z.string(),
  itemName: z.string(),
  storeName: z.string(),
  currentPrice: z.number().nullable(),
  originalPrice: z.number().nullable(),
  discountPercent: z.number(),
  imageUrl: z.string().nullable(),
  description: z.string().nullable(),
}).openapi('GrocerySaveDealBody')

export const DeleteSavedDealQuerySchema = z.object({
  id: z.string().uuid('Invalid saved deal id'),
})

export const SettingsSavedSchema = z.object({
  success: z.literal(true),
}).openapi('GrocerySettingsSaved')
