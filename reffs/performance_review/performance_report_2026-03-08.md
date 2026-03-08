# Performance Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **Date** | `2026-03-08` |
| **Tech Stack** | Next.js 14, TypeScript, Tailwind CSS, Supabase (PostgreSQL), PWA |
| **Framework Version** | Next.js 14.2.35 — `fetch()` defaults to `force-cache`; GET Route Handlers cached; Router Cache 30s dynamic / 5min static |
| **Reviewer** | AI Performance Review Agent |
| **Detected Rendering Modes** | All `ƒ Dynamic` — server-rendered on demand (confirmed via `npm run build` output) |

### Overall Performance Score

| Overall Score | Verdict |
|---------------|---------|
| **3.7/5.0** | 🟡 GOOD — solid baseline with strong caching architecture; targeted improvements possible |

**Bottom line:** The project has an excellent server-side caching strategy for master/settings data, but misses quick wins on public pages, missing image priorities, and a handful of redundant queries.

---

## Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Caching Strategy | 4.0/5 | `unstable_cache` + `React.cache()` dual-layer is excellent; public pages not using cached queries |
| Supabase Query Efficiency | 3.5/5 | Zero `select('*')`, good `.maybeSingle()` usage; one double-fetch, one JS aggregation instead of DB-side |
| Database & RLS Performance | 4.5/5 | Comprehensive indexes; all RLS policies use `TO` clause; simplified `USING (true)` avoids per-row `auth.uid()` penalty |
| Image & Asset Optimization | 3.0/5 | All `next/image`, good fonts; missing `priority` on above-fold images, no AVIF, `unoptimized` in settings |
| Rendering Strategy | 3.5/5 | All pages dynamic, `loading.tsx` on all routes, `dynamic()` imports used; zero Suspense boundaries |
| Client-Side Performance | 3.5/5 | Good `useCallback`/`useMemo`; no `useTransition`, PWA aggressive caching excellent |
| Loading UX (Perceived Speed) | 4.0/5 | `loading.tsx` on every route, skeleton patterns good; no optimistic UI |

### Scoring Formula

```
Overall = (4.0 × 0.20) + (3.5 × 0.15) + (4.5 × 0.15)
        + (3.0 × 0.10) + (3.5 × 0.15) + (3.5 × 0.10) + (4.0 × 0.15)
        = 0.80 + 0.525 + 0.675 + 0.30 + 0.525 + 0.35 + 0.60
        = 3.775 → 3.7/5.0
```

---

## Findings by Priority

### 🔴 Critical — Immediate Impact

No critical performance issues found.

---

### 🟠 Major — Should Optimize

#### 1. Public Pages Query Studio Info on Every Request

- **Area:** Caching / Supabase
- **File(s):**
  - `src/app/(public)/invoice/[bookingId]/page.tsx:26-30`
  - `src/app/(public)/mua/page.tsx:9-13`
  - `src/app/(public)/customer/[bookingId]/page.tsx:22-31`
- **Impact:** Every public page view (invoice, MUA, customer) fires an uncached DB query to `settings_studio_info` — a table that almost never changes. High-traffic public pages multiply this unnecessarily.
- **Risk Level:** 🟢 Safe fix

**Problem:** These pages use a fresh `createClient()` query instead of the available `getCachedStudioInfo()`.

**Current code (invoice page.tsx:26-30):**
```typescript
supabase
  .from("settings_studio_info")
  .select("studio_name, logo_url, address, whatsapp_number, footer_text")
  .eq("lock", true)
  .maybeSingle(),
```

**Optimized code:**
```typescript
import { getCachedStudioInfo } from "@/lib/cached-queries";
// ...
const [booking, studioInfo] = await Promise.all([
  supabase.from("bookings").select(`...`).eq("id", params.bookingId).single(),
  getCachedStudioInfo(),
]);
```

Same fix applies to `mua/page.tsx` and `customer/[bookingId]/page.tsx`.

---

#### 2. Booking Detail Page Double-Fetches Addons

- **Area:** Supabase Query Efficiency
- **File(s):** `src/app/(dashboard)/bookings/[id]/page.tsx:37-43`
- **Impact:** Each booking detail page fires a fresh addon query AND also calls `getCachedAddons()` — two round-trips for the same data.
- **Risk Level:** 🟢 Safe fix

**Problem:** Both a direct query and the cached version are fetched in the same `Promise.all`:

**Current code:**
```typescript
const [currentUser, booking, addons, backgrounds] = await Promise.all([
  getCurrentUser(),
  supabase.from("bookings").select(`...`).eq("id", params.id).single(),
  supabase.from("addons").select("id, name, price, need_extra_time, extra_time_minutes, is_active").eq("is_active", true).order("name"),  // ← fresh query
  getCachedAddons(),  // ← also cached query for same table
]);
```

**Optimized code:** Remove the direct `addons` Supabase query and use only `getCachedAddons()`.

---

#### 3. Missing `priority` on Above-Fold Images

- **Area:** Image & Asset Optimization
- **File(s):**
  - `src/app/(auth)/login/_components/login-client.tsx:25`
  - `src/components/layout/sidebar.tsx:~35`
  - `src/components/layout/mobile-nav.tsx:~35`
- **Impact:** Login page logo and sidebar logo are the first images the user sees. Without `priority`, they are lazy-loaded which increases LCP by 10–50ms.
- **Risk Level:** 🟢 Safe fix

**Current code:**
```tsx
<Image src={logoUrl} alt={studioName} width={56} height={56} />
```

**Optimized code:**
```tsx
<Image src={logoUrl} alt={studioName} width={56} height={56} priority />
```

---

#### 4. Dashboard Revenue Calculated in JavaScript Instead of Database

- **Area:** Supabase Query Efficiency
- **File(s):** `src/app/(dashboard)/dashboard/page.tsx:72-77`
- **Impact:** Fetches all `total` fields for every booking in the month, then sums them in JS. At 200+ bookings/month this is wasteful network transfer.
- **Risk Level:** 🟡 Test carefully (requires Supabase RPC or aggregation)

**Problem:**
```typescript
supabase
  .from("bookings")
  .select("total")              // ← fetches all rows
  .gte("booking_date", monthStart)
  .lte("booking_date", monthEnd)
  .in("status", PAID_STATUSES)
// Then: result.data.reduce((sum, b) => sum + b.total, 0)
```

**Optimized approach:** Create a Supabase RPC function or use `.select('total.sum()')` with PostgREST aggregate syntax. Alternatively, keep as-is until booking volume warrants it — low risk at current scale.

---

### 🟡 Minor — Recommended Improvement

- `src/app/(public)/invoice/[bookingId]/page.tsx` — add `export const revalidate = 0` or use cached studio info; booking data must stay fresh
- `src/app/(public)/mua/page.tsx` — add `export const dynamic = 'force-dynamic'` explicitly (MUA data is real-time) to make intent clear
- `src/components/layout/sidebar.tsx` — add `sizes="36px"` to logo Image (small fixed size, tells browser not to generate wide srcset)
- `src/app/(dashboard)/settings/_components/tab-studio-info.tsx:167,206` — `unoptimized` prop on preview images is acceptable but note that it bypasses WebP conversion; consider removing if previews are final renders
- `next.config.mjs` — add `images: { formats: ['image/avif', 'image/webp'] }` for modern format delivery
- `src/app/(dashboard)/commissions/_components/commissions-client.tsx:193` — `useCallback` dep array includes `selectedMonth`/`selectedYear` but `period` (derived from them) is the actual dependency used inside; ESLint lint warning is valid, consider refactoring to include `period.start`/`period.end` as deps instead
- `src/app/(public)/customer/[bookingId]/_components/customer-page-client.tsx` — fill image is missing `sizes` prop; add `sizes="(max-width: 768px) 100vw, 672px"` for better srcset selection

---

## Section Audit Results

### Caching & Revalidation

| Check | Status | Notes |
|-------|--------|-------|
| All fetches have explicit cache directive | WARN | No explicit `force-cache`/`no-store` on fetch calls, but Supabase client doesn't use extended fetch — N/A for Supabase queries |
| No `force-cache` on user data | OK | No force-cache anywhere; user data fetched fresh via `getUser()` |
| No conflicting fetch options | OK | No conflicting options found |
| Cacheable fetches are tagged | OK | `unstable_cache` uses tags; all 12 tags in `cached-queries.ts` have corresponding `revalidateTag` calls in `cache-invalidation.ts` |
| Supabase queries use `unstable_cache` | OK | `src/lib/cached-queries.ts` wraps all master/settings data in `unstable_cache` with appropriate TTLs |
| React `cache()` for deduplication | OK | All cached query functions are wrapped in `React.cache()` — prevents duplicate calls in same request |
| Route segment config explicit | WARN | No `export const dynamic` or `export const revalidate` on any page — relies on Next.js heuristics |
| Mutations paired with invalidation | OK | Every CRUD operation in settings/bookings/etc calls corresponding `invalidate*()` function |

### Supabase Client & Queries

| Check | Status | Notes |
|-------|--------|-------|
| Correct `@supabase/ssr` setup | OK | `client.ts` (browser singleton), `server.ts` (per-request with cookies), `middleware.ts` (session refresh), `admin.ts` (service role, no session) — all correct |
| Queries select specific columns | OK | Zero `.select('*')` found in entire codebase |
| `.single()`/`.maybeSingle()` used | OK | Appropriate usage throughout; `.maybeSingle()` where null is valid |
| Batch operations (no loops) | WARN | `commissions-client.tsx`: `Promise.all(card.bookings.map(b => supabase.update...))` — technically parallel but still N individual requests; could use batch update |
| Cursor-based pagination | N/A | Offset pagination used (`range()`); tables not large enough to require cursor pagination yet |
| Realtime subscriptions cleaned up | N/A | No Realtime subscriptions used |
| No redundant `getUser()` calls | OK | `getCurrentUser()` wrapped in `React.cache()` — deduped per request |

### Database & RLS

| Check | Status | Notes |
|-------|--------|-------|
| FK columns indexed | OK | `idx_bookings_customer_id`, `idx_bookings_staff_id`, `idx_expenses_vendor_id`, `idx_commissions_staff_id`, `idx_booking_addons_booking_id`, etc. — all FK columns indexed |
| Query columns indexed | OK | `booking_date`, `status`, `print_order_status`, `created_at`, `date`, `source` — all frequently queried columns indexed |
| Composite indexes for common patterns | OK | `idx_bookings_date_status (booking_date, status)` covers the most common query pattern; `idx_commissions_period (period_start, period_end)` |
| RLS uses `(SELECT auth.uid())` | OK | Simplified RLS design: all policies use `USING (true)` — no per-row `auth.uid()` evaluation at all. App-level auth enforced via middleware |
| RLS policies specify `TO` role | OK | All 32 policies explicitly use `TO anon` or `TO authenticated` — no policies evaluating for all roles |
| RLS join direction optimized | N/A | No join-based RLS policies; all use simple `USING (true)` |
| Client filters mirror RLS | OK | Explicit `.eq()`, `.gte()`, `.lte()`, `.in()` filters on all queries — helps query planner even with permissive RLS |

### Image & Assets

| Check | Status | Notes |
|-------|--------|-------|
| All images use `next/image` | OK | Zero raw `<img>` tags found; all 7 image locations use `next/image` |
| LCP images have `priority` | FAIL | Login logo, sidebar logo, mobile-nav logo all missing `priority` — these are above-fold on first paint |
| Responsive images have `sizes` | WARN | Fill-mode image in customer page missing `sizes` prop; fixed-size images don't require it |
| AVIF format enabled | WARN | `next.config.mjs` has no `formats` config — defaults to WebP only, not AVIF |
| Fonts use `next/font` | OK | `Inter` from `next/font/google` with `subsets: ["latin"]` in `layout.tsx` |
| No barrel file imports | OK | Direct component imports throughout |
| `optimizePackageImports` configured | WARN | Not configured in `next.config.mjs`; `lucide-react` (used extensively) benefits from this |

### Rendering Strategy

| Check | Status | Notes |
|-------|--------|-------|
| `generateStaticParams` for known routes | N/A | All routes are user-data-dependent — static generation not applicable |
| Suspense boundaries on async sections | FAIL | Zero `<Suspense>` boundaries found in `src/app/` — entire pages wait for all data |
| `loading.tsx` in key routes | OK | All 12 dashboard routes have `loading.tsx`; public routes handled by client-side skeleton |
| No sequential waterfall fetches | OK | All server-side data fetching uses `Promise.all()` — verified in dashboard, bookings, customers, commissions pages |
| `"use client"` at leaf level | OK | Page-level components are Server Components; `"use client"` pushed to `*-client.tsx` components |
| Heavy components dynamically imported | OK | `dynamic()` imports used for large client components (BookingsClient, CalendarClient, etc.) with `ssr: false` |
| Skeletons match content layout | OK | Skeleton components use `animate-pulse` blocks that approximate real content dimensions |

### Client-Side Performance

| Check | Status | Notes |
|-------|--------|-------|
| Optimistic UI for mutations | WARN | Some optimistic patterns (customers delete), but most mutations wait for server response |
| `useTransition` for expensive updates | FAIL | No `useTransition` found — manual `saving`/`loading` booleans used instead |
| Low-priority links no prefetch | WARN | No `prefetch={false}` on any Link; acceptable since sidebar nav links are primary navigation |
| Middleware has `matcher` config | OK | Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and image extensions |
| Middleware is lightweight | OK | Middleware only handles session refresh + redirect logic — no DB queries |
| Production `next.config.js` optimized | WARN | Missing `optimizePackageImports` for lucide-react/radix; missing AVIF image format |

---

## Positive Highlights

- **Excellent dual-layer caching architecture** — `unstable_cache` (persistent server cache) + `React.cache` (request deduplication) is a textbook-correct pattern for Next.js + Supabase
- **All 12 cache tags have matching invalidation functions** — no orphaned caches; every mutation correctly invalidates
- **Zero `select('*')` in entire codebase** — every Supabase query uses lean, explicit column selection
- **Comprehensive database indexes** — 20 indexes covering all FK columns, query columns, and common composite patterns
- **Simplified RLS design** (`USING (true)` + role-based) — completely avoids the per-row `auth.uid()` performance penalty; middleware handles auth at the edge
- **`Promise.all()` everywhere** — all server pages fetch independent datasets in parallel; dashboard does 9 queries in parallel
- **`loading.tsx` on all 12 routes** — instant skeleton loading during navigation
- **`getCurrentUser()` wrapped in `React.cache()`** — called in both layout and pages without double DB roundtrip
- **PWA with aggressive front-end caching** — `aggressiveFrontEndNavCaching: true` for offline/repeat visit performance

---

## Action Items Summary

### Must Fix (Immediate Impact)

1. Add `priority` to above-fold logos — `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/app/(auth)/login/_components/login-client.tsx`
2. Use `getCachedStudioInfo()` in public pages — `src/app/(public)/invoice/[bookingId]/page.tsx:26`, `src/app/(public)/mua/page.tsx:9`, `src/app/(public)/customer/[bookingId]/page.tsx:22`
3. Remove duplicate addons fetch in booking detail — `src/app/(dashboard)/bookings/[id]/page.tsx:37-41`

### Should Optimize (Significant Improvement)

4. Add `optimizePackageImports: ['lucide-react']` to `next.config.mjs` — reduces JS bundle size
5. Add `formats: ['image/avif', 'image/webp']` to `next.config.mjs` images config
6. Add `sizes` prop to fill-mode image in customer page — `src/app/(public)/customer/[bookingId]/_components/customer-page-client.tsx`
7. Add explicit `export const dynamic = 'force-dynamic'` to all dashboard pages for clarity

### Consider (Nice to Have)

8. Replace JS revenue sum with DB-side aggregation — `src/app/(dashboard)/dashboard/page.tsx:72-77`
9. Add Suspense boundaries for independent dashboard sections (stats, schedule, print orders)
10. Replace manual `saving` boolean patterns with `useTransition()` for better UX semantics
11. Consider batching `commission_amount` updates via a single RPC instead of N `Promise.all` requests — `src/app/(dashboard)/commissions/_components/commissions-client.tsx`

---

## Quick-Reference Diagnostic Commands

| What to Check | Command |
|---|---|
| Bundle size | `ANALYZE=true npm run build` (requires `@next/bundle-analyzer`) |
| Production caching | `npm run build && npm run start` (never test caching in dev) |
| Route rendering modes | `npm run build` → all show `ƒ Dynamic` currently |
| Slow Supabase queries | `SELECT mean_exec_time, calls, query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;` |
| Missing indexes | `EXPLAIN ANALYZE` on slow queries — look for `Seq Scan` |
| DB cache hit rate | `SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;` (target 99%+) |
| Core Web Vitals | Google PageSpeed Insights after deployment |

---

*Generated by AI Performance Review Agent. Checklist based on `reffs/performance_review/performance_checklist.md`. Next.js 14.2.35, Supabase PostgreSQL.*
