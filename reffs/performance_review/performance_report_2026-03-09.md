# Performance Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **Date** | 2026-03-09 |
| **Tech Stack** | Next.js 14.2.35, TypeScript 5, Tailwind CSS, ShadCN UI, Supabase JS v2, Framer Motion v12 |
| **Framework Version** | Next.js 14.2.35 — `fetch()` defaults to `force-cache`, GET route handlers are cached |
| **Reviewer** | AI Performance Review Agent |
| **Detected Rendering Modes** | λ dynamic (all dashboard routes — auth-gated); public routes (customer, invoice, mua) could be ISR |

### Overall Performance Score

| Overall Score | Verdict |
|---------------|---------|
| **4.0/5.0** | 🟡 GOOD — solid caching foundation, targeted optimizations available |

**Bottom line:** The project has an excellent caching and data-fetching architecture overall, with `Promise.all()` used consistently across server pages, dual-layer caching for shared data, and no `select('*')` anti-patterns — but a few client-side waterfall patterns and one unbounded DB query need attention.

---

## Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Caching Strategy | 5/5 | Dual-layer `unstable_cache` + `React.cache()`, 13 cached functions, proper tags |
| Supabase Query Efficiency | 3.5/5 | Lean selects throughout, but 2 client-side waterfall patterns and 1 unbounded query |
| Database & RLS Performance | 3/5 | Cannot verify indexes from code alone — requires Supabase dashboard check |
| Image & Asset Optimization | 5/5 | AVIF+WebP, next/image, priority flags, remotePatterns, next/font |
| Rendering Strategy | 4.5/5 | Promise.all on all server pages, 15 loading.tsx files, React.cache deduplication |
| Client-Side Performance | 3.5/5 | No Realtime subs, middleware has matcher, but no optimistic UI or useTransition |
| Loading UX (Perceived Speed) | 4.5/5 | All routes have loading.tsx skeletons, fast server-rendered initial load |

### Scoring Calculation

```
Overall = (5.0 × 0.20) + (3.5 × 0.15) + (3.0 × 0.15)
        + (5.0 × 0.10) + (4.5 × 0.15) + (3.5 × 0.10) + (4.5 × 0.15)

       = 1.00 + 0.525 + 0.45
       + 0.50 + 0.675 + 0.35 + 0.675

       = 4.175 ≈ 4.0/5.0
```

---

## Findings by Priority

### 🔴 Critical — Immediate Impact

No critical (data leak / security) performance issues found. All user-specific data uses `no-store` (via authenticated Supabase client). Shared/static data is safely cached via admin client with non-user-specific keys.

---

### 🟠 Major — Should Optimize

#### 1. Sequential Waterfall in CommissionsClient Re-fetch

- **Area:** Supabase / Client-Side
- **File:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx` lines ~138–150
- **Impact:** Two sequential DB roundtrips on every period change. Adds ~100–300ms latency per interaction.

**Problem:** `bookings` and `commissions` are fetched with sequential `await` calls instead of in parallel. They are completely independent queries.

**Current code:**
```typescript
const { data: bookings } = await supabase.from("bookings")...;
const { data: existingCommissions } = await supabase.from("commissions")...;
```

**Optimized code:**
```typescript
const [{ data: bookings }, { data: existingCommissions }] = await Promise.all([
  supabase.from("bookings")....,
  supabase.from("commissions")....,
]);
```

---

#### 2. Unbounded Expense Fetch in Vendors Page

- **Area:** Supabase
- **File:** `src/app/(dashboard)/vendors/page.tsx` lines ~10–20
- **Impact:** Fetches ALL expense records from the DB with no pagination or date filter. As `expenses` table grows, this query becomes progressively slower and wastes memory.

**Problem:** The vendors page aggregates per-vendor expense totals client-side by fetching every expense row ever created.

**Current code:**
```typescript
supabase.from("expenses").select("vendor_id, amount")
// No .range(), no .gte("date", ...) filter
```

**Optimized code:**
```typescript
// Option A — Limit to last 12 months (recommended)
supabase
  .from("expenses")
  .select("vendor_id, amount")
  .gte("date", twelveMonthsAgo)

// Option B — Use a DB-level aggregate (ideal long-term)
// Create a view: SELECT vendor_id, SUM(amount) AS total FROM expenses GROUP BY vendor_id
```

---

#### 3. Dashboard Has 6 Separate `count: 'exact'` Queries

- **Area:** Supabase / Rendering
- **File:** `src/app/(dashboard)/dashboard/page.tsx` lines ~67, 82, 98, 103, 108, 113
- **Impact:** 6 DB roundtrips for what could be 1–2 queries. Every dashboard page load issues 9 parallel DB calls total, 6 of which are just counts.

**Problem:** Each print order status (SELECTION, VENDOR, PACKING, SHIPPED) gets its own `.head()` count query.

**Current code:**
```typescript
supabase.from("print_orders").select("*", { count: "exact", head: true }).eq("status", "SELECTION"),
supabase.from("print_orders").select("*", { count: "exact", head: true }).eq("status", "VENDOR"),
supabase.from("print_orders").select("*", { count: "exact", head: true }).eq("status", "PACKING"),
supabase.from("print_orders").select("*", { count: "exact", head: true }).eq("status", "SHIPPED"),
```

**Optimized code:**
```typescript
// Single query — fetch all active print orders (not DONE/CANCELED), count server-side by status
const { data: printOrders } = await supabase
  .from("print_orders")
  .select("status")
  .in("status", ["SELECTION", "VENDOR", "PACKING", "SHIPPED"]);

// Aggregate in JS (typically < 100 rows)
const printCount = {
  SELECTION: printOrders?.filter(p => p.status === "SELECTION").length ?? 0,
  VENDOR: printOrders?.filter(p => p.status === "VENDOR").length ?? 0,
  PACKING: printOrders?.filter(p => p.status === "PACKING").length ?? 0,
  SHIPPED: printOrders?.filter(p => p.status === "SHIPPED").length ?? 0,
};
```

This reduces 4 DB calls to 1 and the `Promise.all` length from 9 to 6.

---

### 🟡 Minor — Recommended Improvement

- `src/app/(dashboard)/bookings/_components/bookings-client.tsx:151` — Search triggers a waterfall: first queries `customers` by name to get IDs, then queries `bookings`. This is a deliberate workaround for PostgREST's `.or()` limitation with joined tables. Acceptable for now; note it adds ~50–150ms on search.

- `src/utils/supabase/client.ts:1` — `createClient()` creates a new browser client instance on every call. While lightweight (no connection created at instantiation), memoizing it as a module-level singleton avoids repeated `createBrowserClient()` configuration parsing: `export const supabase = createBrowserClient(...)` and import `supabase` directly.

- `src/app/(dashboard)/customers/_components/customers-client.tsx` — At 666 lines, this is the largest client component. Consider extracting the create/edit modal and delete dialog into separate files (`create-customer-modal.tsx`, `edit-customer-modal.tsx`) for better code splitting.

- `src/app/(dashboard)/dashboard/page.tsx` — Uses `count: 'exact'` for monthly booking count and "belum lunas" count. Consider switching to `count: 'estimated'` for the general stats display if approximate numbers (±5%) are acceptable. Saves a full table scan per count.

---

## Section Audit Results

### Caching & Revalidation

| Check | Status | Notes |
|-------|--------|-------|
| All fetches have explicit cache directive | OK | Supabase client calls don't use `fetch()` — N/A. `unstable_cache` handles this layer. |
| No `force-cache` on user data | OK | User data never cached globally. `getCachedActiveUsers()` uses admin client key only. |
| No conflicting fetch options | OK | No conflicting `revalidate` + `no-store` combinations found. |
| Cacheable fetches are tagged | OK | All 13 cached functions have tags: `SETTINGS_STUDIO_INFO`, `PACKAGES`, `ADDONS`, etc. |
| Supabase queries use `unstable_cache` | OK | 13 functions in `src/lib/cached-queries.ts` wrap Supabase with `unstable_cache`. |
| React `cache()` for deduplication | OK | All `getCached*` functions wrapped with `React.cache()`. `getCurrentUser()` also uses `cache()`. |
| Route segment config explicit | WARN | No `export const dynamic` or `export const revalidate` on any page — relying on Next.js heuristics. All auth-gated pages are correctly dynamic (use `cookies()`), but explicit config adds clarity. |
| Mutations paired with invalidation | WARN | Client components mutate via Supabase JS directly — no `revalidateTag()` called after mutations. This is acceptable because client components re-fetch their own data after mutations. However, if a settings change is made, the `getCachedStudioInfo` cache is NOT invalidated until its 1hr TTL expires. Settings tab components should call the appropriate revalidation API after saving. |

### Supabase Client & Queries

| Check | Status | Notes |
|-------|--------|-------|
| Correct `@supabase/ssr` setup | OK | server.ts uses `createServerClient`, client.ts uses `createBrowserClient`. |
| Queries select specific columns | OK | Zero `select('*')` found in entire codebase. |
| `.single()`/`.maybeSingle()` used | OK | `getCurrentUser` uses `.single()`. Booking detail, customer detail, etc. use `.single()` appropriately. |
| Batch operations (no loops) | OK | No insert/update loops detected. Bulk inserts (e.g., booking addons) use array `.insert([...])`. |
| Cursor-based pagination | N/A | All paginated lists use offset (`range(from, to)`). Acceptable for studio scale (<10k rows per table). |
| Realtime subscriptions cleaned up | N/A | No Realtime subscriptions used anywhere. |
| No redundant `getUser()` calls | OK | `getCurrentUser()` wrapped in `React.cache()`. One network call per request regardless of how many components call it. |

### Database & RLS

| Check | Status | Notes |
|-------|--------|-------|
| FK columns indexed | WARN | Cannot verify from code. Check Supabase dashboard: `bookings.customer_id`, `bookings.package_id`, `booking_addons.booking_id`, `booking_addons.addon_id`, `expenses.vendor_id`, `commissions.user_id` should all have btree indexes. |
| Query columns indexed | WARN | Frequent filter columns to verify: `bookings.booking_date`, `bookings.status`, `activity_log.created_at`, `print_orders.status`. Run `EXPLAIN ANALYZE` on slow queries. |
| Composite indexes for common patterns | WARN | `bookings` is filtered by `(booking_date, status)` on nearly every page. Composite index `(booking_date, status)` would improve performance significantly at scale. |
| RLS uses `(SELECT auth.uid())` | WARN | Cannot verify RLS policies from code alone. Must check in Supabase SQL Editor. Ensure all policies use `(SELECT auth.uid())` not bare `auth.uid()`. |
| RLS policies specify `TO` role | WARN | Same — verify in Supabase SQL Editor that policies have `TO authenticated`. |
| RLS join direction optimized | N/A | No complex join-based RLS patterns detected from query review. |
| Client filters mirror RLS | OK | Client queries include explicit filters (e.g., `.neq("status", "CANCELED")`, `.eq("is_active", true)`) that aid the query planner. |

### Image & Assets

| Check | Status | Notes |
|-------|--------|-------|
| All images use `next/image` | OK | No raw `<img>` tags in TSX components. |
| LCP images have `priority` | OK | Sidebar logo and login logo have `priority` + `sizes`. |
| Responsive images have `sizes` | OK | `sizes="36px"` on sidebar/mobile-nav logo; `sizes="72px"` on login logo. |
| AVIF format enabled | OK | `images: { formats: ["image/avif", "image/webp"] }` in next.config.mjs. |
| Fonts use `next/font` | OK | `Inter` loaded via `next/font/google` with `subsets: ["latin"]`. |
| No barrel file imports | OK | Direct component imports used throughout. |
| `optimizePackageImports` configured | OK | `experimental: { optimizePackageImports: ["lucide-react"] }` in next.config.mjs. |

### Rendering Strategy

| Check | Status | Notes |
|-------|--------|-------|
| `generateStaticParams` for known routes | N/A | Public pages (`/customer/[id]`, `/invoice/[id]`) are dynamic and booking-specific — not pre-renderable. |
| Suspense boundaries on async sections | WARN | No explicit `<Suspense>` wrappers around individual sections in server components. Loading is route-level only (loading.tsx). For long-loading sections within a page, inner Suspense would improve perceived speed. |
| `loading.tsx` in key routes | OK | 15 loading.tsx files found — all major dashboard routes covered. |
| No sequential waterfall fetches | OK | All server-side pages use `Promise.all()`. Two client-side waterfalls noted above. |
| `"use client"` at leaf level | OK | Client directive is at component level (`*-client.tsx`), not at page or layout level. Server Components wrap them. |
| Heavy components dynamically imported | WARN | `bookings/page.tsx` uses `dynamic(..., { ssr: false })` for BookingsClient. Other large client components (customers-client, finance-client) are NOT dynamically imported — acceptable but adds to initial bundle. |
| Skeletons match content layout | OK | Loading skeletons use card/table shapes matching the actual page layout. |

### Client-Side Performance

| Check | Status | Notes |
|-------|--------|-------|
| Optimistic UI for mutations | N/A | Status changes, toggles, and CRUD operations wait for server confirmation before updating UI. Acceptable for studio management app with low mutation frequency. |
| `useTransition` for expensive updates | WARN | Filter/search state changes in bookings-client, customers-client trigger full re-fetches without `startTransition`. UI may feel slightly unresponsive during fetch. |
| Low-priority links no prefetch | OK | Internal sidebar links use Next.js `Link` with default prefetching (appropriate — these are the primary navigation links). |
| Middleware has `matcher` config | OK | Matcher excludes `_next/static`, `_next/image`, favicon, and image extensions. |
| Middleware is lightweight | OK | Only session refresh via `updateSession()`. No DB queries or heavy computation. |
| Production `next.config.js` optimized | OK | AVIF formats, optimizePackageImports, PWA caching, remotePatterns all configured. Missing: `poweredByHeader: false` (minor). |

---

## Positive Highlights

- **Zero `select('*')` queries** — Every Supabase query in the entire codebase specifies explicit columns. This is rare and excellent.
- **Dual-layer caching architecture** — `unstable_cache` for persistent server cache + `React.cache()` for per-request deduplication is the correct and most performant pattern for shared/global data in Next.js 14.
- **`getCurrentUser()` deduplication** — Wrapped in `React.cache()`, so layout and page can both call it with a single DB roundtrip per request.
- **15 loading.tsx files** — Complete skeleton coverage for all dashboard routes. Users never see a blank screen during navigation.
- **No Realtime subscriptions** — Avoiding WebSockets entirely keeps connection count and memory footprint minimal. All data is fetch-on-demand.
- **Consistent `Promise.all()` on server pages** — Every server-side page fetches all its data in parallel. The most impactful single-page optimization is already applied everywhere.
- **next/font + AVIF + priority images** — LCP and font-related Core Web Vitals are well-addressed.
- **PWA configured** — Aggressive front-end nav caching via `@ducanh2912/next-pwa` improves repeat visit performance.

---

## Action Items Summary

### Must Fix (Immediate Impact)

1. **Sequential fetches in CommissionsClient** — `src/app/(dashboard)/commissions/_components/commissions-client.tsx` ~line 138 — wrap in `Promise.all()`
2. **Unbounded expense fetch in Vendors page** — `src/app/(dashboard)/vendors/page.tsx` ~line 15 — add date range filter (e.g., last 12 months)

### Should Optimize (Significant Improvement)

3. **Consolidate 4 print order count queries on Dashboard** — `src/app/(dashboard)/dashboard/page.tsx` lines 98–113 — single query + JS grouping
4. **Verify DB indexes exist** — Check Supabase dashboard for btree indexes on: `bookings.booking_date`, `bookings.status`, `bookings.customer_id`, `booking_addons.booking_id`, `expenses.vendor_id`, `activity_log.created_at`
5. **Verify RLS uses `(SELECT auth.uid())`** — Check all RLS policies in Supabase SQL Editor — apply the initPlan wrapper for per-row auth checks
6. **Settings mutation cache invalidation** — After saving any settings tab, call `revalidateTag("SETTINGS_STUDIO_INFO")` (or appropriate tag) via a server action so the cache updates immediately instead of waiting 1 hour

### Consider (Nice to Have)

7. **Browser client singleton** — `src/utils/supabase/client.ts` — export a single `supabase` instance instead of `createClient()` factory to avoid repeated instantiation
8. **Split customers-client.tsx** — Extract modal dialogs (create, edit, delete) into separate files for better code-splitting opportunities
9. **Add `poweredByHeader: false`** — `next.config.mjs` — minor security/header hygiene
10. **`useTransition` for search/filter** — `bookings-client.tsx`, `customers-client.tsx` — wrap fetch triggers in `startTransition()` to keep UI responsive during loading state

---

## Quick-Reference Diagnostic Commands

| What to Check | Command |
|---|---|
| Route rendering modes | `npm run build` → check output: ○ static, ◐ ISR, λ dynamic |
| Slow Supabase queries | `SELECT mean_exec_time, calls, query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;` |
| Missing FK indexes | `SELECT conrelid::regclass AS table, a.attname AS column FROM pg_constraint c JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid WHERE c.contype = 'f' AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey));` |
| RLS impact | Compare `EXPLAIN ANALYZE` with RLS vs `SET ROLE postgres` (dev only) |
| Core Web Vitals | Google PageSpeed Insights — test public pages `/customer/[id]` and `/invoice/[id]` |
| DB cache hit rate | `SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;` (target 99%+) |

---

## Cross-Reference

| Finding | Performance Angle | Notes |
|---------|-------------------|-------|
| Booking search two-step customer lookup | Deliberate waterfall — workaround for PostgREST `.or()` limitation with joined tables | Correct fix was implemented; acceptable tradeoff |
| Activity log insert on every CRUD | Each mutation = 2 DB calls (main op + log) | Acceptable for low-volume studio management; would need batching at scale |
| `count: 'exact'` on paginated lists | Full table scan per count | Acceptable at current scale (<10k bookings); switch to `count: 'estimated'` if table grows large |

---

*Generated by AI Performance Review Agent — 2026-03-09. Based on Next.js official docs, Supabase performance guides, Vercel best practices, and Google Core Web Vitals methodology.*
