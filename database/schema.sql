-- Daily Grocery Deals schema
-- Idempotent: safe to run on every module enable.

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
DROP POLICY IF EXISTS grocery_deals_cache_rls_select ON grocery_deals_cache;
CREATE POLICY grocery_deals_cache_rls_select ON grocery_deals_cache FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_deals_cache_rls_insert ON grocery_deals_cache;
CREATE POLICY grocery_deals_cache_rls_insert ON grocery_deals_cache FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_deals_cache_rls_delete ON grocery_deals_cache;
CREATE POLICY grocery_deals_cache_rls_delete ON grocery_deals_cache FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

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
DROP POLICY IF EXISTS grocery_saved_deals_rls_select ON grocery_saved_deals;
CREATE POLICY grocery_saved_deals_rls_select ON grocery_saved_deals FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_saved_deals_rls_insert ON grocery_saved_deals;
CREATE POLICY grocery_saved_deals_rls_insert ON grocery_saved_deals FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));
DROP POLICY IF EXISTS grocery_saved_deals_rls_delete ON grocery_saved_deals;
CREATE POLICY grocery_saved_deals_rls_delete ON grocery_saved_deals FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));
