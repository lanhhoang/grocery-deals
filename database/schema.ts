import { pgTable, index, pgPolicy, uuid, text, timestamp, varchar, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const groceryKeywords = pgTable("grocery_keywords", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: text("user_id").notNull(),
  keyword: varchar({ length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  index("idx_grocery_keywords_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  pgPolicy("grocery_keywords_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_keywords_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_keywords_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])

export const groceryDealsCache = pgTable("grocery_deals_cache", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: text("user_id").notNull(),
  keyword: text("keyword").notNull(),
  itemName: text("item_name").notNull(),
  storeName: text("store_name").notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  imageUrl: text("image_url"),
  description: text("description"),
  storeAddress: text("store_address"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  index("idx_grocery_deals_cache_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  index("idx_grocery_deals_cache_fetched_at").using("btree", table.fetchedAt.desc().nullsFirst().op("timestamptz_ops")),
  pgPolicy("grocery_deals_cache_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_deals_cache_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_deals_cache_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])

export const grocerySavedDeals = pgTable("grocery_saved_deals", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: text("user_id").notNull(),
  keyword: text("keyword").notNull(),
  itemName: text("item_name").notNull(),
  storeName: text("store_name").notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  imageUrl: text("image_url"),
  description: text("description"),
  storeAddress: text("store_address"),
  savedAt: timestamp("saved_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  index("idx_grocery_saved_deals_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  pgPolicy("grocery_saved_deals_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_saved_deals_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("grocery_saved_deals_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])
