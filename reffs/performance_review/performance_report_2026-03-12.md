# Performance Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **Date** | 2026-03-12 |
| **Tech Stack** | Next.js 14.2.35, TypeScript 5, Tailwind CSS, ShadCN UI, Supabase JS v2, Framer Motion v12 |
| **Framework Version** | Next.js 14.2.35 — `fetch()` defaults to `force-cache`; GET route handlers cached |
| **Reviewer** | AI Performance Review Agent |
| **Detected Rendering Modes** | λ dynamic (all 24 routes — auth-gated or booking-specific); ○ static (`/mua`) |
| **Pages Audited** | 24 routes: 19 dashboard + 3 public + 2 photo-delivery (new this sprint) |

### Overall Performance Score

| Overall Score | Verdict |
|---------------|---------|
| **4.2/5.0** | 🟡 GOOD — solid baseline; photo-delivery module cleanly integrated; three 2026-03-09 issues resolved |

**Bottom line:** Three major issues from the 2026-03-09 report are resolved (commissions waterfall, vendors unbounded query, dashboard count consolidation). The new photo-delivery module follows established performance patterns with only two outstanding omissions: missing `loading.tsx` files and a sequential search pattern consistent with the rest of the codebase. DB indexes and RLS remain the only unverified action items requiring manual Supabase dashboard review.

---

## Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Caching Strategy | 5/5 | Dual-layer `unstable_cache` + `React.cache()`, 13 cached functions with proper tags — unchanged and excellent |
| Supabase Query Efficiency | 4/5 | Zero `select('*')` across all 24 routes; all server pages use `Promise.all()`; photo-delivery search still sequential (consistent pattern with bookings/customers) |
| Database & RLS Performance | 3/5 | Cannot verify indexes or RLS policies from code — Supabase dashboard check still required |
| Image & Asset Optimization | 5/5 | AVIF+WebP, `next/image` everywhere, `priority` on LCP, `next/font`, `remotePatterns`, `optimizePackageImports` — unchanged |
| Rendering Strategy | 4.5/5 | All 24 server pages use `Promise.all()`; photo-delivery missing `loading.tsx` on 2 of 19 dashboard routes |
| Client-Side Performance | 4/5 | 300ms debounce on all search inputs; no `useTransition` on filter updates (minor, low-frequency app) |
| Loading UX (Perceived Speed) | 4/5 | 17/19 dashboard routes have `loading.tsx`; photo-delivery list and detail are the two exceptions |

### Scoring Calculation

```
Overall = (5.0 × 0.20) + (4.0 × 0.15) + (3.0 × 0.15)
        + (5.0 × 0.10) + (4.5 × 0.15) + (4.0 × 0.10) + (4.0 × 0.15)

       = 1.00 + 0.60 + 0.45
       + 0.50 + 0.675 + 0.40 + 0.60

       = 4.225 ≈ 4.2/5.0
```

| Score Range | Verdict |
|-------------|---------|
| 4.5 – 5.0 | 🟢 EXCELLENT |
| 3.5 – 4.4 | 🟡 GOOD |
| 2.5 – 3.4 | 🟠 NEEDS WORK |
| 1.5 – 2.4 | 🔴 POOR |

---

## Changes Since Last Report (2026-03-09)

### ✅ Fixed Items

| # | Issue (from 2026-03-09) | File | Resolution |
|---|------------------------|------|------------|
| 1 | Sequential fetches in CommissionsClient | `commissions/_components/commissions-client.tsx` | ✅ `Promise.all()` applied — `bookings` and `commissions` queries now run in parallel |
| 2 | Unbounded expense fetch in Vendors page | `vendors/page.tsx` | ✅ 24-month date filter applied — query now bounded by `.gte("date", ...)` |
| 3 | Dashboard 4 separate print count queries | `dashboard/page.tsx` | ✅ Single `.select("print_order_status").in(...)` + JS groupBy — reduces parallel DB calls from 9→6 |

### 🆕 New Pages Added (Photo Delivery Module)

| Route | Performance Assessment |
|-------|----------------------|
| `/photo-delivery` | ✅ Server-side initial pagination (10 rows), lean nested select, `count: 'exact'`, `dynamic({ssr:false})`, 300ms debounced search |
| `/photo-delivery/[id]` | ✅ `Promise.all` for user + Supabase init; comprehensive single nested select fetches all needed fields in one query; `dynamic({ssr:false})` |

### ⚠️ New Issues Introduced

| # | Issue | Location |
|---|-------|----------|
| 1 | Missing `loading.tsx` | `src/app/(dashboard)/photo-delivery/loading.tsx` (does not exist) |
| 2 | Missing `loading.tsx` | `src/app/(dashboard)/photo-delivery/[id]/loading.tsx` (does not exist) |

---

## Findings by Priority

### 🔴 Critical — Immediate Impact

No critical performance issues found. All user-specific data goes through the per-request authenticated Supabase client (no cross-user caching risk). No `select('*')` in the entire codebase. No unbounded queries without pagination or date filters.

---

### 🟠 Major — Should Optimize

#### 1. Missing `loading.tsx` for Photo Delivery Routes

- **Area:** Loading UX / Rendering
- **File(s):** `src/app/(dashboard)/photo-delivery/` and `src/app/(dashboard)/photo-delivery/[id]/`
- **Impact:** Users see a blank/frozen screen when navigating to these routes instead of an instant skeleton. Because both pages use `dynamic({ ssr: false })`, the initial paint is entirely client-side — the blank gap is more noticeable than routes with partial SSR content. All 17 other dashboard routes have `loading.tsx`; these two are inconsistent.
- **Risk Level:** 🟢 Safe fix

**Problem:** Photo delivery list and detail pages were added without `loading.tsx` skeleton files.

**Fix:**
```tsx
// src/app/(dashboard)/photo-delivery/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      <div className="rounded-xl border bg-white h-64 animate-pulse" />
    </div>
  );
}

// src/app/(dashboard)/photo-delivery/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-8 bg-gray-100 rounded animate-pulse" />
      <div className="rounded-xl border bg-white h-96 animate-pulse" />
    </div>
  );
}
```

---

#### 2. Verify DB Indexes — Still Unresolved from Previous Report

- **Area:** Database
- **Impact:** Without indexes on FK columns and frequently filtered columns, queries degrade to O(n) full table scans as data grows. At 10k+ bookings, unindexed `booking_date` or `status` filters add 200–500ms per query.
- **Risk Level:** 🟢 Safe fix — adding indexes never breaks existing queries

**Columns to verify have btree indexes in Supabase dashboard:**

| Table | Column | Used In |
|-------|--------|---------|
| `bookings` | `booking_date` | ORDER BY + WHERE on every page |
| `bookings` | `status` | WHERE filter — every page |
| `bookings` | `customer_id` | FK, JOIN |
| `bookings` | `staff_id` | FK, WHERE — Commissions |
| `bookings` | `print_order_status` | WHERE — Dashboard, Bookings, Photo Delivery |
| `booking_addons` | `booking_id` | FK, JOIN |
| `booking_packages` | `booking_id` | FK, JOIN |
| `booking_backgrounds` | `booking_id` | FK, JOIN |
| `booking_custom_fields` | `booking_id` | FK, JOIN |
| `booking_status_dates` | `booking_id` | FK, WHERE — Photo Delivery detail |
| `expenses` | `vendor_id` | FK, JOIN |
| `expenses` | `date` | WHERE — Vendors (24-month), Finance |
| `commissions` | `user_id` | FK, WHERE |
| `activity_log` | `created_at` | ORDER BY — Activities page |

**Recommended composite index (high priority):**
```sql
-- bookings filtered by (status, booking_date) on nearly every page
CREATE INDEX idx_bookings_status_date ON bookings (status, booking_date DESC);

-- photo-delivery specifically filters by (status IN [...], booking_date)
CREATE INDEX idx_bookings_print_status ON bookings (print_order_status, booking_date DESC);
```

**SQL to detect all missing FK indexes:**
```sql
SELECT conrelid::regclass AS table, a.attname AS column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );
```

---

#### 3. Verify RLS Policies Use `(SELECT auth.uid())` — Still Unresolved

- **Area:** Database / RLS Performance
- **Impact:** Without the `(SELECT ...)` wrapper, `auth.uid()` evaluates per-row. On `bookings` with 10k+ rows this is a ~10,000× overhead compared to evaluating once via PostgreSQL's initPlan mechanism.
- **Risk Level:** 🟢 Safe fix — purely a performance change, no behavior change

**Check every RLS policy in Supabase SQL Editor → Authentication → Policies.**

Every occurrence of:
```sql
USING (auth.uid() = user_id)
```
Should become:
```sql
USING ((SELECT auth.uid()) = user_id)
```
Also verify all policies specify `TO authenticated` to avoid evaluating for anonymous users.

---

### 🟡 Minor — Recommended Improvement

- `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx` (search block) — Two-step search (customer name lookup → booking filter) adds ~50–150ms per search keystroke. This is the same pattern used in `bookings-client.tsx` and `customers-client.tsx`. Consider a shared utility or DB view if this pattern appears in more pages.

- `src/app/(dashboard)/commissions/_components/commissions-client.tsx` — No server-side or client-side pagination on the bookings fetch for a commission period. At high booking volume (100+ bookings/period), this fetches all rows to the client. Add a note in code with the expected maximum or add pagination if studio volume grows.

- `src/app/(dashboard)/settings/_components/tab-*.tsx` — After saving any settings tab, `unstable_cache` data (`SETTINGS_STUDIO_INFO`, `PACKAGES`, etc.) is NOT invalidated until its 1-hour TTL expires. Settings changes won't reflect in sidebar logo or booking forms for up to 1 hour. Fix: call `revalidateTag()` via a Server Action after each settings save.

- `src/utils/supabase/client.ts` — `createClient()` is a factory function called per component. Exporting a module-level singleton (`export const supabase = createBrowserClient(url, key)`) would prevent repeated instantiation across client components.

- `next.config.mjs` — Missing `poweredByHeader: false`. Minor security hygiene; removes `X-Powered-By: Next.js` response header.

- `src/app/(dashboard)/bookings/_components/bookings-client.tsx`, `customers-client.tsx`, `photo-delivery-client.tsx` — No `useTransition` around search/filter state updates. UI may feel slightly unresponsive (~100ms) during fetch transitions. Low priority for this app's interaction frequency.

---

## Section Audit Results

### Caching & Revalidation

| Check | Status | Notes |
|-------|--------|-------|
| All fetches have explicit cache directive | OK | Supabase JS doesn't use extended `fetch()` — N/A for that layer. `unstable_cache` handles persistent caching. |
| No `force-cache` on user data | OK | User-specific data always fetched via per-request Supabase client with no caching. |
| No conflicting fetch options | OK | No `revalidate` + `no-store` combinations exist. |
| Cacheable fetches are tagged | OK | All 13 cached functions have named tags: `SETTINGS_STUDIO_INFO`, `PACKAGES`, `ADDONS`, `USERS`, `VENDORS`, `BACKGROUNDS`, etc. |
| Supabase queries use `unstable_cache` | OK | `src/lib/cached-queries.ts` — 13 functions with TTLs: 3600s (settings/master data), 300s (user/role data). |
| React `cache()` for deduplication | OK | All `getCached*` functions + `getCurrentUser()` wrapped in `React.cache()`. One DB roundtrip per request. |
| Route segment config explicit | WARN | No `export const dynamic` or `export const revalidate` on any page. All auth-gated pages are implicitly dynamic via `cookies()` calls, but explicit config adds clarity and future-proofs against Next.js upgrades. |
| Mutations paired with invalidation | WARN | Client mutations re-fetch local state — correct for UI. Settings saves do not call `revalidateTag()`, so `unstable_cache` may serve stale data up to 1 hour after settings change. |

### Supabase Client & Queries

| Check | Status | Notes |
|-------|--------|-------|
| Correct `@supabase/ssr` setup | OK | `server.ts` uses `createServerClient` (per-request, cookie-aware), `client.ts` uses `createBrowserClient`. Admin client uses SERVICE_ROLE key only in server-only context. |
| Queries select specific columns | OK | Zero `select('*')` found across all 24 routes and all client components. Every query has an explicit column list including photo-delivery. |
| `.single()`/`.maybeSingle()` used | OK | Booking detail, customer detail, photo-delivery detail, `getCurrentUser()` all use `.single()` on ID lookups. |
| Batch operations (no loops) | OK | No insert/update/delete inside loops. Bulk operations use array `.insert([...])`. |
| Cursor-based pagination | N/A | Offset pagination (`range(from, to)`) on all list pages. Acceptable for studio scale (<10k rows per table). |
| Realtime subscriptions cleaned up | N/A | No Realtime subscriptions anywhere in the codebase. |
| No redundant `getUser()` calls | OK | `getCurrentUser()` wrapped in `React.cache()` — single DB roundtrip per server request regardless of how many components call it. |

### Database & RLS

| Check | Status | Notes |
|-------|--------|-------|
| FK columns indexed | WARN | Cannot verify from code — 14 FK/filter columns listed above. Check Supabase dashboard. |
| Query columns indexed | WARN | `bookings.booking_date` and `bookings.status` used in WHERE/ORDER BY on every page. Composite index recommended. `bookings.print_order_status` now also used by photo-delivery. |
| Composite indexes for common patterns | WARN | `bookings` filtered by `(status, booking_date)` on 5+ pages. `(print_order_status, booking_date)` now also a common photo-delivery pattern. |
| RLS uses `(SELECT auth.uid())` | WARN | Cannot verify from code. Must check all policies in Supabase SQL Editor. |
| RLS policies specify `TO` role | WARN | Cannot verify from code. Policies without `TO authenticated` evaluate for anonymous users too. |
| RLS join direction optimized | N/A | No complex join-based RLS patterns detected in query review. |
| Client filters mirror RLS | OK | Explicit `.eq()`, `.in()`, `.gte()`, `.lte()` filters on all queries help the query planner even when RLS is active. |

### Image & Assets

| Check | Status | Notes |
|-------|--------|-------|
| All images use `next/image` | OK | No raw `<img>` tags. Photo-delivery components display no images (Drive links are external URLs, not rendered via `next/image` — correct). |
| LCP images have `priority` | OK | Sidebar logo and login logo have `priority`. No images in photo-delivery module to optimize. |
| Responsive images have `sizes` | OK | Existing logo images have `sizes="36px"` / `sizes="72px"`. |
| AVIF format enabled | OK | `images: { formats: ["image/avif", "image/webp"] }` in `next.config.mjs`. |
| Fonts use `next/font` | OK | `Inter` via `next/font/google`. No external font CDN links. |
| No barrel file imports | OK | Direct imports throughout all 24 routes. |
| `optimizePackageImports` configured | OK | `experimental: { optimizePackageImports: ["lucide-react"] }` in `next.config.mjs`. |

### Rendering Strategy

| Check | Status | Notes |
|-------|--------|-------|
| `generateStaticParams` for known routes | N/A | Public pages are booking-specific and user-requested — not pre-renderable at build time. |
| Suspense boundaries on async sections | WARN | No explicit inner `<Suspense>` wrappers within pages. Route-level `loading.tsx` is the only streaming boundary. Acceptable given each page is a single cohesive dashboard view. |
| `loading.tsx` in key routes | WARN | **17/19 dashboard routes have `loading.tsx`**. Missing: `/photo-delivery` and `/photo-delivery/[id]`. |
| No sequential waterfall fetches | OK | All 24 server pages use `Promise.all()`. All three previously flagged client-side waterfalls resolved. Photo-delivery uses `Promise.all` for `getCurrentUser` + initial Supabase query. |
| `"use client"` at leaf level | OK | Client directive only at `*-client.tsx` component level. All `page.tsx` files are Server Components. |
| Heavy components dynamically imported | OK | `bookings/page.tsx`, `photo-delivery/page.tsx`, `photo-delivery/[id]/page.tsx` use `dynamic({ssr:false})`. Valid: avoids Radix UI hydration mismatch with client-only state. |
| Skeletons match content layout | OK | All 17 existing `loading.tsx` files use card/table shapes matching actual page layouts. |

### Client-Side Performance

| Check | Status | Notes |
|-------|--------|-------|
| Optimistic UI for mutations | N/A | All mutations wait for server confirmation before updating UI. Acceptable for low-frequency studio management operations. |
| `useTransition` for expensive updates | WARN | Search/filter state changes in photo-delivery, bookings, and customers trigger full re-fetches without `startTransition`. Minor UX latency (~100ms). |
| Low-priority links no prefetch | OK | Sidebar navigation uses Next.js default prefetch (appropriate — these are primary nav links used frequently). |
| Middleware has `matcher` config | OK | Matcher excludes `_next/static`, `_next/image`, favicon, and image file extensions. |
| Middleware is lightweight | OK | Only `updateSession()` from `@supabase/ssr`. No DB queries, no business logic. |
| Production `next.config.js` optimized | OK | AVIF formats, `optimizePackageImports`, PWA service worker caching, `remotePatterns`. Missing: `poweredByHeader: false`. |

---

## Positive Highlights

- **All three 2026-03-09 major issues resolved** — Dashboard print counts consolidated, vendors unbounded query bounded to 24 months, commissions sequential awaits parallelized with `Promise.all()`.
- **Zero `select('*')` queries across all 24 routes** — Every Supabase query specifies exact columns including photo-delivery nested joins. Rare and excellent discipline.
- **`Promise.all()` on every server page** — All 24 `page.tsx` files fetch independent data in parallel. Zero sequential server-side awaits anywhere.
- **Dual-layer caching architecture** — `unstable_cache` (persistent server cache, 1hr/5min TTL by data type) + `React.cache()` (per-request deduplication). Correct and optimal.
- **`getCurrentUser()` deduplication** — One DB roundtrip per request regardless of how many server components call it across layout + page + nested components.
- **Photo-delivery module follows all performance patterns** — Server pagination (10 rows), 300ms debounced search, `count: 'exact'` for pagination UX, lean select with nested joins.
- **17/19 loading.tsx coverage** — Near-complete skeleton coverage; users almost never see blank screens during navigation.
- **No Realtime subscriptions** — Zero WebSocket connections = minimal memory footprint and no cleanup concerns.
- **PWA configured with Workbox** — Aggressive navigation + static asset caching for repeat visits via `@ducanh2912/next-pwa`.
- **Vendor expense query now bounded** — 24-month filter prevents full table scan growth as expense records accumulate over years.
- **Activity logging is non-blocking** — Logs are inserted after the main operation in the same try block; failure doesn't block the user-facing operation, and all are correctly within try/catch.

---

## Action Items Summary

### Must Fix (Immediate Impact)

1. **Add `loading.tsx` to `/photo-delivery`** — `src/app/(dashboard)/photo-delivery/loading.tsx`
2. **Add `loading.tsx` to `/photo-delivery/[id]`** — `src/app/(dashboard)/photo-delivery/[id]/loading.tsx`

### Should Optimize (Significant Improvement)

3. **Verify + add DB indexes** — Check Supabase dashboard for 14 FK/filter columns; add composite `(status, booking_date DESC)` and `(print_order_status, booking_date DESC)` indexes on `bookings` table
4. **Verify RLS uses `(SELECT auth.uid())`** — Check all policies in Supabase SQL Editor; apply initPlan wrapper + `TO authenticated` on all policies

### Consider (Nice to Have)

5. **Settings mutation cache invalidation** — Call `revalidateTag()` via server action after settings saves — `src/app/(dashboard)/settings/_components/tab-*.tsx`
6. **Browser client singleton** — Export `export const supabase = createBrowserClient(...)` from `src/utils/supabase/client.ts`
7. **Add `poweredByHeader: false`** — `next.config.mjs`
8. **`useTransition` for search/filter updates** — `photo-delivery-client.tsx`, `bookings-client.tsx`, `customers-client.tsx`

---

## Quick-Reference Diagnostic Commands

| What to Check | Command |
|---|---|
| Route rendering modes | `npm run build` → check output: ○ static, ◐ ISR, λ dynamic |
| Missing FK indexes | `SELECT conrelid::regclass AS table, a.attname AS column FROM pg_constraint c JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid WHERE c.contype = 'f' AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey));` |
| Slow queries | `SELECT mean_exec_time, calls, query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;` |
| RLS policy impact | Compare `EXPLAIN ANALYZE` with RLS enabled vs `SET ROLE postgres` (dev only) |
| DB cache hit rate | `SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;` (target 99%+) |
| Core Web Vitals | Google PageSpeed Insights — test public pages `/customer/[id]` and `/invoice/[id]` |
| Bundle size | `ANALYZE=true npm run build` (requires `@next/bundle-analyzer`) |

---

## Cross-Reference

> Code Review (2026-03-12) was conducted simultaneously. Shared findings:

| Finding | Performance Angle | Code Review Angle |
|---------|-------------------|-------------------|
| Photo-delivery search two-step customer lookup | Deliberate waterfall (+50–150ms per search) as PostgREST `.or()` workaround — consistent with bookings/customers pattern | String concatenation of customer IDs into filter string is injection-like risk; should use `.in()` |
| Activity log insert on every CRUD | 2 DB calls per mutation (main + log) — acceptable for studio scale | All inside try/catch; silent failures prevented |
| `count: 'exact'` on paginated lists | Full table scan per page view for accurate pagination | Correct pattern; acceptable at current scale; switch to `count: 'estimated'` if tables exceed 50k rows |
| `ssr: false` on 3 page-level dynamic imports | No SSR HTML — blank until JS loads; mitigated by `loading.tsx` (once added for photo-delivery) | Justified workaround for Radix UI Select hydration mismatch; pattern documented in previous reviews |
| `commissions/page.tsx` `Promise.all()` | Resolves the waterfall; parallel queries now ~2× faster | `Promise.all` lacks per-query error handling — each query error should be checked individually |

---

*Generated by AI Performance Review Agent — 2026-03-12. Full audit of 24 routes. Previous report: [2026-03-09](performance_report_2026-03-09.md).*
