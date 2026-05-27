# Daily Grocery Deals Module — Build Plan

## Context

Building the `grocery-deals` custom module ("Daily Grocery Deals") inside the existing `modules-custom/grocery-deals/` git repo for Toronto Tech Week 2026. The module shows a daily digest of best grocery deals from stores near the user's home (via the Flipp API), based on a pre-filled keyword watchlist. Deals are cached in the DB. Users can star/save deals and view them in a Saved Deals page. A dashboard widget shows the top 5 deals by % discount.

---

## Module Identity

- **Folder**: `modules-custom/grocery-deals/`
- **Module ID**: `grocery-deals`
- **Display name**: Daily Grocery Deals
- **Icon**: `ShoppingCart`
- **Group**: Shopping

---

## Files to Create

```
modules-custom/grocery-deals/
├── module.json
├── app/
│   ├── page.tsx                    (main deals feed + onboarding)
│   ├── saved/page.tsx              (starred deals)
│   └── settings/page.tsx           (keywords + postal code)
├── api/
│   ├── settings/route.ts           (GET/PUT postal code + onboarding flag)
│   ├── keywords/route.ts           (GET/POST/DELETE keyword watchlist)
│   ├── search/route.ts             (GET — fan out to Flipp, cache results)
│   ├── cache/route.ts              (GET — read cached deals, used by widget)
│   └── saved/route.ts              (GET/POST/DELETE saved deals)
├── database/
│   ├── schema.sql                  (idempotent SQL)
│   ├── schema.ts                   (Drizzle definitions)
│   └── uninstall.sql               (manual-only teardown)
├── components/
│   ├── sidebar-submenu.tsx         (submenu: Overview / Saved / Settings)
│   ├── deal-card.tsx               (individual deal card with save button)
│   ├── keyword-manager.tsx         (add/remove keywords UI)
│   ├── postal-code-prompt.tsx      (onboarding step 1)
│   └── dashboard-widget.tsx        (top 5 deals for Dashboard)
├── hooks/
│   └── use-grocery-deals.ts        (all TanStack Query hooks)
├── lib/
│   ├── flipp.ts                    (Flipp API client)
│   └── validation.ts               (Zod schemas with .openapi() tags)
└── types/
    └── index.ts
```

---

## Step 1 — `module.json`

```json
{
  "id": "grocery-deals",
  "group": "Shopping",
  "name": "Daily Grocery Deals",
  "description": "Daily digest of the best grocery deals near you, powered by Flipp",
  "version": "1.0.0",
  "author": "ARI Hackathon",
  "icon": "ShoppingCart",
  "enabled": true,
  "fullscreen": false,
  "menuPriority": 30,
  "routes": [
    {
      "path": "/grocery-deals",
      "label": "Daily Grocery Deals",
      "icon": "ShoppingCart",
      "sidebarPosition": "main"
    }
  ],
  "dependencies": { "coreFeatures": [] },
  "database": {
    "tables": ["grocery_keywords", "grocery_saved_deals", "grocery_deals_cache"]
  },
  "submenu": {
    "component": "./components/sidebar-submenu.tsx"
  },
  "dashboard": {
    "widgets": true,
    "widgetComponents": ["./components/dashboard-widget.tsx"]
  }
}
```

---

## Step 2 — Database Schema

### `database/schema.sql` (idempotent)

Three tables. Follow the module-template pattern exactly (`modules-core/module-template/database/schema.sql`):

```sql
-- grocery_keywords: user's watchlist of search terms
CREATE TABLE IF NOT EXISTS grocery_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grocery_keywords_user_id ON grocery_keywords(user_id);
ALTER TABLE grocery_keywords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grocery_keywords_rls_select ON grocery_keywords;
CREATE POLICY grocery_keywords_rls_select ON grocery_keywords FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_keywords_rls_insert ON grocery_keywords;
CREATE POLICY grocery_keywords_rls_insert ON grocery_keywords FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_keywords_rls_delete ON grocery_keywords;
CREATE POLICY grocery_keywords_rls_delete ON grocery_keywords FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

-- grocery_deals_cache: Flipp results cached after each search
CREATE TABLE IF NOT EXISTS grocery_deals_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  item_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  current_price NUMERIC(10, 2),
  original_price NUMERIC(10, 2),
  discount_percent NUMERIC(5, 2),
  image_url TEXT,
  description TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grocery_deals_cache_user_id ON grocery_deals_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_deals_cache_fetched_at ON grocery_deals_cache(fetched_at DESC);
ALTER TABLE grocery_deals_cache ENABLE ROW LEVEL SECURITY;
-- (same 4 RLS policies as above, referencing grocery_deals_cache)

-- grocery_saved_deals: user-starred deals
CREATE TABLE IF NOT EXISTS grocery_saved_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  item_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  current_price NUMERIC(10, 2),
  original_price NUMERIC(10, 2),
  discount_percent NUMERIC(5, 2),
  image_url TEXT,
  description TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grocery_saved_deals_user_id ON grocery_saved_deals(user_id);
ALTER TABLE grocery_saved_deals ENABLE ROW LEVEL SECURITY;
-- (same 4 RLS policies)
```

### `database/schema.ts` (Drizzle)

Three Drizzle table exports: `groceryKeywords`, `groceryDealsCache`, `grocerySavedDeals`. Use `numeric("col", { precision: 10, scale: 2 })` for price columns and `pgPolicy` for RLS. Mirror the module-template pattern from `modules-core/module-template/database/schema.ts`.

**Critical**: `numeric()` columns return strings from Drizzle. Convert with `Number()` in all GET API responses.

### `database/uninstall.sql`

```sql
-- MANUAL TEARDOWN ONLY — never auto-run
DROP TABLE IF EXISTS grocery_saved_deals CASCADE;
DROP TABLE IF EXISTS grocery_deals_cache CASCADE;
DROP TABLE IF EXISTS grocery_keywords CASCADE;
```

---

## Step 3 — `lib/flipp.ts` (Flipp API Client)

Reverse-engineered endpoint, no auth required.

```typescript
const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp'

export interface FlippDeal {
  itemName: string
  description: string | null
  currentPrice: number | null
  originalPrice: number | null
  storeName: string
  imageUrl: string | null
  discountPercent: number   // calculated: (orig - cur) / orig * 100
  keyword: string           // which keyword triggered this
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
        return { itemName: String(item.name ?? ''), description: item.description ? String(item.description) : null,
          currentPrice: cur, originalPrice: orig, storeName: String(item.merchant ?? ''),
          imageUrl: item.image_url ? String(item.image_url) : null,
          discountPercent: discount, keyword }
      })
      .filter((d: FlippDeal) => d.discountPercent > 0)
  } catch { return [] }
}
```

---

## Step 4 — `lib/validation.ts` (Zod + OpenAPI)

All schemas live here and are tagged with `.openapi('...')`. Import `@/lib/openapi/registry` as a side effect.

Key schemas:
```typescript
export const GrocerySettingsSchema = z.object({
  postalCode: z.string().min(3, 'Postal code is required').max(10, 'Postal code too long').optional(),
  onboardingCompleted: z.boolean().optional(),
}).openapi('GrocerySettings')

export const KeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(100, 'Keyword must be 100 characters or less'),
}).openapi('GroceryKeywordBody')

export const SaveDealSchema = z.object({
  keyword: z.string(), itemName: z.string(), storeName: z.string(),
  currentPrice: z.number().nullable(), originalPrice: z.number().nullable(),
  discountPercent: z.number(), imageUrl: z.string().nullable(), description: z.string().nullable(),
}).openapi('GrocerySaveDealBody')
```

---

## Step 5 — API Routes

All routes follow the module-template settings pattern (`modules-core/module-template/api/settings/route.ts`). Every handler:
1. Calls `getAuthenticatedUser()` → 401 if no user
2. Uses `withRLS()` for all DB ops
3. Has a `registry.registerPath({...})` block with `tags: ['grocery-deals']`, `security: DEFAULT_SECURITY`
4. Returns generic errors (never stack traces)

### `api/settings/route.ts`
- **GET**: Read `module_settings` where `moduleId='grocery-deals'`, return `{}` if none.
- **PUT**: JSONB-merge upsert using `COALESCE(settings, '{}') || patch::jsonb`. Handles postal code + `onboardingCompleted`.

### `api/keywords/route.ts`
- **GET**: `SELECT * FROM grocery_keywords WHERE user_id = ? ORDER BY created_at DESC` via `withRLS`.
- **POST**: Validate with `KeywordSchema`. Insert. Return new row.
- **DELETE** (`?id=uuid`): `DELETE WHERE id = ? AND user_id = ?` via `withRLS`.

### `api/search/route.ts`
- **GET**:
  1. Read postal code from module_settings (default `M5V3A8` if unset).
  2. Fetch keywords via `withRLS`.
  3. If no keywords → return `{ deals: [], cached_at: null }`.
  4. Fan out `searchFlipp(keyword, postalCode)` for all keywords via `Promise.all`.
  5. **Clear old cache**: `DELETE FROM grocery_deals_cache WHERE user_id = ?` via `withRLS`.
  6. Insert all results into `grocery_deals_cache` via `withRLS`.
  7. Sort by `discountPercent DESC`, return top 50.
  8. **Convert numeric columns** to `Number()` before responding.

### `api/cache/route.ts`
- **GET**: Read `grocery_deals_cache` ordered by `discount_percent DESC`, limit 20. Used by dashboard widget. Convert numeric columns.

### `api/saved/route.ts`
- **GET**: `SELECT * FROM grocery_saved_deals ORDER BY saved_at DESC` via `withRLS`. Convert numeric columns.
- **POST**: Validate with `SaveDealSchema`. Insert. Return new row.
- **DELETE** (`?id=uuid`): Delete by id + user_id.

---

## Step 6 — `types/index.ts`

```typescript
export interface GroceryKeyword { id: string; keyword: string; createdAt: string }
export interface GroceryDeal {
  id: string; keyword: string; itemName: string; storeName: string
  currentPrice: number | null; originalPrice: number | null
  discountPercent: number; imageUrl: string | null; description: string | null
  fetchedAt: string; isSaved?: boolean
}
export interface GrocerySavedDeal extends Omit<GroceryDeal, 'fetchedAt' | 'isSaved'> { savedAt: string }
export interface GrocerySettings { postalCode?: string; onboardingCompleted?: boolean }
```

---

## Step 7 — `hooks/use-grocery-deals.ts`

TanStack Query hooks (all `'use client'`). Pattern: `modules-core/module-template/hooks/use-module-template.ts`.

```typescript
// Settings
useGrocerySettings()          // query: GET /settings
useUpdateGrocerySettings()    // mutation: PUT /settings, optimistic update

// Keywords
useGroceryKeywords()          // query: GET /keywords
useAddKeyword()               // mutation: POST /keywords
useRemoveKeyword()            // mutation: DELETE /keywords?id=

// Deals (search + cache)
useGroceryDeals()             // query: GET /cache (reads cached results)
useSearchDeals()              // mutation: GET /search (triggers Flipp fetch + cache refresh)
                              // invalidates ['grocery-deals'] on success

// Saved
useSavedDeals()               // query: GET /saved
useSaveDeal()                 // mutation: POST /saved
useRemoveSavedDeal()          // mutation: DELETE /saved?id=
```

All mutations use optimistic updates + rollback on error. `useSearchDeals` sets a local `isRefreshing` flag during fetch and shows a toast on error.

---

## Step 8 — Components

### `components/sidebar-submenu.tsx`
Three nav links: Overview (`/grocery-deals`), Saved Deals (`/grocery-deals/saved`), Settings (`/grocery-deals/settings`). Mirror `modules-core/module-template/components/sidebar-submenu.tsx`.

### `components/deal-card.tsx`
Props: `deal: GroceryDeal | GrocerySavedDeal`, `onSave?`, `onUnsave?`, `isSaved`.

Layout:
```
[Store name]                    [% OFF badge]
[Product image — 80×80]
[Item name (truncated 2 lines)]
[Description (truncated 1 line)]
[$current  ~~$original~~]       [★ Save / ✓ Saved]
```

Badge colours: `≥40%` → green, `20–39%` → amber, `<20%` → grey/slate.

### `components/keyword-manager.tsx`
Inline input + "Add" button at top. Tag pills with `×` remove button for each keyword. Max 20 keywords (enforce client + server). Used on settings page.

### `components/postal-code-prompt.tsx`
Onboarding card (step 1): centered card, postal code input, "Get Started" button. On submit: calls `useUpdateGrocerySettings({ postalCode, onboardingCompleted: true })`.

### `components/dashboard-widget.tsx`
`'use client'`. Calls `useGroceryDeals()` (reads cache). Shows top 5 deals as compact rows: store + item name + discount badge. "View All Deals" link to `/grocery-deals`. Wrapped in `<Card>`.

---

## Step 9 — Pages

### `app/page.tsx` (Main deals feed)

States:
| Condition | Renders |
|-----------|---------|
| `!settings.onboardingCompleted` | `<PostalCodePrompt>` |
| Keywords empty | Prompt to add keywords via Settings |
| No cache yet | "Click Refresh to fetch today's deals" empty state |
| Loading/refreshing | Skeleton grid (6 cards) |
| Deals loaded | Grid of `<DealCard>` sorted by % off |

Header: "Daily Grocery Deals" + today's date chip + "Refresh Today's Deals" button (calls `useSearchDeals`).

Includes random quote under title when Quotes module is enabled (module-template pattern).

### `app/saved/page.tsx`
Lists `<DealCard>` from `useSavedDeals()`. Empty state: "No saved deals yet — star deals from the main feed."

### `app/settings/page.tsx`
Two sections:
1. **Postal Code** — input showing current value, save button
2. **Keywords** — `<KeywordManager>` component

---

## Step 10 — Registration (after all files created)

Run:
```bash
pnpm generate-module-registry
```

This auto-generates:
- `lib/generated/module-api-registry.ts` — API route mappings
- `lib/db/schema/schema.ts` — adds `export * from '@/modules/grocery-deals/database/schema'`
- `lib/generated/module-submenu-registry.ts` — submenu lazy-load entry
- `lib/generated/module-manifest.json` — merged module config

No manual edits to shared files needed.

---

## Implementation Order (3 hours)

| Time | Phase |
|------|-------|
| 0:00–0:20 | `module.json` + `database/schema.sql` + `database/schema.ts` + `types/index.ts` |
| 0:20–0:40 | `lib/flipp.ts` + `lib/validation.ts` |
| 0:40–1:10 | All 5 API routes (settings, keywords, search, cache, saved) |
| 1:10–1:25 | `hooks/use-grocery-deals.ts` |
| 1:25–1:50 | `app/page.tsx` with onboarding + deals grid |
| 1:50–2:10 | `components/deal-card.tsx` + `components/keyword-manager.tsx` |
| 2:10–2:30 | `app/saved/page.tsx` + `app/settings/page.tsx` |
| 2:30–2:45 | `components/dashboard-widget.tsx` + `components/sidebar-submenu.tsx` |
| 2:45–3:00 | `pnpm generate-module-registry` + polish + demo walkthrough |

---

## Key Reference Files

| What | Path |
|------|------|
| Settings JSONB merge | `modules-core/module-template/api/settings/route.ts` |
| Drizzle schema pattern | `modules-core/module-template/database/schema.ts` |
| SQL idempotency pattern | `modules-core/module-template/database/schema.sql` |
| TanStack Query hooks | `modules-core/module-template/hooks/use-module-template.ts` |
| Submenu component | `modules-core/module-template/components/sidebar-submenu.tsx` |
| Dashboard widget | `modules-core/module-template/components/widget.tsx` |
| module.json template | `modules-core/module-template/module.json` |
| OpenAPI registration | `modules-core/module-template/api/data/route.ts` |
| Validation + openapi | `modules-core/module-template/lib/validation.ts` |

---

## Verification

1. `pnpm generate-module-registry` runs without errors
2. "Daily Grocery Deals" appears in sidebar under Shopping group; clicking it shows submenu
3. First run → `PostalCodePrompt` shown; entering postal code dismisses it
4. Add "chicken", "eggs" as keywords in Settings → Refresh → deal cards appear with % badges
5. Star a deal → Saved tab shows it; persists after page refresh
6. Dashboard shows top 5 deals widget
7. Dark mode toggle → all cards render correctly
8. `/api-docs` shows all 5 `grocery-deals` routes after dev server restart
