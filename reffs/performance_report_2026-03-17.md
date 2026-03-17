# Performance Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **Date** | 2026-03-17 |
| **Tech Stack** | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, Supabase (@supabase/ssr), Framer Motion |
| **Framework Version** | Next.js 14.2.35 |
| **Reviewer** | AI Performance Review Agent |
| **Detected Rendering Modes** | ○ static: `/_not-found`, `/mua` · λ dynamic: all other 23 routes |

### Overall Performance Score

| Overall Score | Verdict |
|---------------|---------|
| **3.8/5.0** | 🟡 GOOD |

**Bottom line:** Production-grade data fetching and caching with excellent parallel query patterns and comprehensive loading UX — main gaps are missing route segment configs, no Suspense streaming on data-heavy pages, and no optimistic/transition patterns on mutations.

---

## Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Caching Strategy | 4.0/5 | `unstable_cache` + React `cache()` + tag-based invalidation properly implemented; missing explicit route segment configs |
| Supabase Query Efficiency | 4.5/5 | Lean selects everywhere, no `select('*')`, proper `.single()`/`.maybeSingle()`, batch inserts, singleton browser client |
| Database & RLS Performance | 3.0/5 | RLS enabled but cannot verify `(SELECT auth.uid())` optimization or FK indexes from application code alone |
| Image & Asset Optimization | 4.5/5 | 100% `next/image`, AVIF+WebP enabled, `priority`+`sizes` on LCP images, `next/font` with subset, `optimizePackageImports` for lucide-react |
| Rendering Strategy | 3.5/5 | `Promise.all()` on every page, good `next/dynamic` usage, comprehensive `loading.tsx`; but no Suspense streaming, no `generateStaticParams` (acceptable for auth-gated app) |
| Client-Side Performance | 3.0/5 | Lightweight middleware with proper matcher; no `useTransition`, no optimistic UI, no explicit Link `prefetch` props |
| Loading UX (Perceived Speed) | 4.5/5 | All 17 dashboard routes have `loading.tsx` with skeleton UI matching content layout; settings tabs have Suspense fallbacks; empty states handled |

### Scoring Formula

```
Overall = (4.0 × 0.20) + (4.5 × 0.15) + (3.0 × 0.15)
        + (4.5 × 0.10) + (3.5 × 0.15) + (3.0 × 0.10) + (4.5 × 0.15)
        = 0.80 + 0.675 + 0.45 + 0.45 + 0.525 + 0.30 + 0.675
        = 3.875 ≈ 3.8/5.0
```

---

## Findings by Priority

### 🔴 Critical — Immediate Impact

No critical performance issues found.

---

### 🟠 Major — Should Optimize

#### 1. No explicit route segment config on any page

- **Area:** Caching
- **File(s):** All `page.tsx` files under `src/app/(dashboard)/` and `src/app/(public)/`
- **Impact:** Next.js uses heuristics to decide caching behavior; different behavior between dev and production; unpredictable when upgrading to Next.js 15

**Problem:** No page exports `export const dynamic` or `export const revalidate`. Since all dashboard pages call `cookies()` via `createClient()`, Next.js 14 already marks them as dynamic — but this is implicit and fragile.

**Fix:** Add to every authenticated page:
```ts
export const dynamic = 'force-dynamic';
```

This makes the intent explicit and prevents surprises on framework upgrades.

---

#### 2. No Suspense streaming on data-heavy pages

- **Area:** Rendering
- **File(s):** `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/bookings/[id]/page.tsx`, `src/app/(dashboard)/bookings/new/page.tsx`
- **Impact:** User sees a full loading skeleton until ALL parallel queries complete; fast queries blocked by slowest one

**Problem:** Dashboard fetches 6 parallel queries via `Promise.all()` — user must wait for all 6 before seeing anything. If one query is slow (e.g., `printOrderRows`), everything is blocked.

**Fix:** Wrap independent sections in `<Suspense>` with individual skeletons:
```tsx
<Suspense fallback={<StatsSkeleton />}>
  <StatsSection />
</Suspense>
<Suspense fallback={<ScheduleSkeleton />}>
  <TodaySchedule />
</Suspense>
```
This enables progressive rendering — fast sections appear immediately.

---

#### 3. Login page bypasses cached studio info

- **Area:** Caching
- **File(s):** `src/app/(auth)/login/page.tsx:7-11`
- **Impact:** Every login page visit hits the database for studio info instead of using the 1-hour cached version

**Problem:**
```ts
const { data: studioInfo } = await supabase
  .from("settings_studio_info")
  .select("logo_url, studio_name")
  .eq("lock", true)
  .maybeSingle();
```

**Fix:**
```ts
import { getCachedStudioInfo } from "@/lib/cached-queries";

const studioInfo = await getCachedStudioInfo();
```

---

### 🟡 Minor — Recommended Improvement

- **No `useTransition` for expensive state updates** — Search filters, sort toggles, and pagination in `bookings-client.tsx`, `customers-client.tsx`, `finance-client.tsx` could use `startTransition()` to keep UI responsive during refetches.

- **No optimistic UI on mutations** — Add/remove addon in `tab-pricing.tsx`, expense create/delete in `finance-client.tsx`, and booking status toggles could update UI immediately then reconcile with server.

- **No explicit `prefetch` on Link components** — Dashboard quick menu links (`/bookings`, `/calendar`, etc.) would benefit from `prefetch={true}`. Detail page links (`/bookings/[id]`) could use `prefetch={false}` to reduce unnecessary data loading.

- **Photo Delivery page: query not parallelized with auth check** — `src/app/(dashboard)/photo-delivery/page.tsx` awaits auth check then fetches data sequentially instead of using `Promise.all()`.

- **API routes use sequential operations** — `src/app/api/users/create/route.ts` and `src/app/api/users/delete/route.ts` perform 3-4 sequential Supabase calls that could partially be parallelized.

- **Finance package stats computed in JS loop** — `src/app/(dashboard)/finance/page.tsx:45-58` aggregates package stats with a `for` loop instead of SQL `GROUP BY`. Acceptable for current data volume but won't scale.

---

## Section Audit Results

### Caching & Revalidation

| Check | Status | Notes |
|-------|--------|-------|
| All fetches have explicit cache directive | N/A | No raw `fetch()` calls; all queries via Supabase SDK |
| No `force-cache` on user data | OK | No `force-cache` anywhere; user data always fetched per-request |
| No conflicting fetch options | N/A | No raw `fetch()` calls |
| Cacheable fetches are tagged | OK | All `unstable_cache` calls use `tags` array — 14 tag types in `cache-invalidation.ts` |
| Supabase queries use `unstable_cache` | OK | 14 cached queries in `src/lib/cached-queries.ts` with proper admin client (no cookies inside) |
| React `cache()` for deduplication | OK | `getCurrentUser()` wrapped in `cache()` — deduplicates across layout + page |
| Route segment config explicit | WARN | No `export const dynamic` or `export const revalidate` on any page |
| Mutations paired with invalidation | OK | All settings CRUD calls `revalidateTag()` via `src/lib/cache-invalidation.ts` |

### Supabase Client & Queries

| Check | Status | Notes |
|-------|--------|-------|
| Correct `@supabase/ssr` setup | OK | Browser: singleton `createBrowserClient`. Server: per-request `createServerClient` with cookies. Admin: `createClient` with service role key for cached queries |
| Queries select specific columns | OK | Zero `.select('*')` found. All queries use explicit column lists |
| `.single()`/`.maybeSingle()` used | OK | 40+ occurrences. `.single()` for required rows (booking by ID), `.maybeSingle()` for optional (settings, studio info) |
| Batch operations (no loops) | OK | Booking creation inserts packages, addons, backgrounds, custom fields all via batch `.insert(array)` |
| Cursor-based pagination | N/A | Offset-based `.range()` used — acceptable for studio management app (datasets < 10K rows) |
| Realtime subscriptions cleaned up | OK | Only 1 subscription in `use-current-user.ts` — properly cleaned up with `subscription.unsubscribe()` in useEffect return |
| No redundant `getUser()` calls | OK | `getCurrentUser()` wrapped in React `cache()` — layout + page share single call |

### Database & RLS

| Check | Status | Notes |
|-------|--------|-------|
| FK columns indexed | N/A | Cannot verify from application code — requires SQL-level audit of `db_yoonjae.sql` |
| Query columns indexed | N/A | Cannot verify from application code |
| Composite indexes for common patterns | N/A | Cannot verify from application code |
| RLS uses `(SELECT auth.uid())` | N/A | RLS policies configured in Supabase SQL Editor — not visible in app code |
| RLS policies specify `TO` role | N/A | Same as above |
| RLS join direction optimized | N/A | Same as above |
| Client filters mirror RLS | WARN | Most queries rely on RLS without explicit `.eq('user_id', ...)` — acceptable since this is a single-tenant studio app |

### Image & Assets

| Check | Status | Notes |
|-------|--------|-------|
| All images use `next/image` | OK | 100% — all 7 image locations use `next/image`. Zero raw `<img>` tags |
| LCP images have `priority` | OK | Login logo, sidebar logo, mobile nav logo all have `priority` prop |
| Responsive images have `sizes` | OK | All images specify explicit `sizes` (e.g., `sizes="72px"`, `sizes="36px"`) |
| AVIF format enabled | OK | `next.config.mjs`: `formats: ["image/avif", "image/webp"]` |
| Fonts use `next/font` | OK | `Inter` from `next/font/google` with `subsets: ["latin"]` in root layout |
| No barrel file imports | OK | All imports are direct file paths — no `index.ts` barrel files |
| `optimizePackageImports` configured | OK | `experimental: { optimizePackageImports: ["lucide-react"] }` |

### Rendering Strategy

| Check | Status | Notes |
|-------|--------|-------|
| `generateStaticParams` for known routes | N/A | All dynamic routes are auth-gated with per-user data — static generation not applicable |
| Suspense boundaries on async sections | WARN | Only `settings-client.tsx` uses Suspense for lazy tabs. Dashboard, booking detail, calendar could benefit |
| `loading.tsx` in key routes | OK | All 17 dashboard routes have `loading.tsx` with skeleton UI |
| No sequential waterfall fetches | OK | Every server page uses `Promise.all()` for parallel fetching |
| `"use client"` at leaf level | OK | 83 client components — all at leaf/component level, never at page or layout level |
| Heavy components dynamically imported | OK | Settings: 10 tabs lazy-loaded via `next/dynamic`. Bookings + Photo Delivery: `ssr: false` for Radix UI compatibility |
| Skeletons match content layout | OK | Loading skeletons replicate actual component structure (headers, cards, tables, rows) |

### Client-Side Performance

| Check | Status | Notes |
|-------|--------|-------|
| Optimistic UI for mutations | WARN | Not implemented. All mutations show loading spinner → wait for server → update state |
| `useTransition` for expensive updates | WARN | Not used anywhere. Filters, sort, and pagination could benefit |
| Low-priority links no prefetch | WARN | No explicit `prefetch` props on any Link component |
| Middleware has `matcher` config | OK | Excludes `_next/static`, `_next/image`, favicon, and image file extensions |
| Middleware is lightweight | OK | Only calls `updateSession()` — no DB queries, no heavy computation |
| Production `next.config.js` optimized | OK | AVIF/WebP images, `optimizePackageImports`, `remotePatterns` for Supabase, PWA configured |

---

## Positive Highlights

- **Exceptional parallel data fetching** — Every single server page uses `Promise.all()`. Dashboard (6 queries), New Booking (11 queries), and Booking Detail (7 queries) are exemplary.
- **Production-grade caching architecture** — Dual-layer `unstable_cache` + React `cache()` with tag-based invalidation covering 14 data types. Admin client correctly used inside cached functions to avoid cookie contamination.
- **Comprehensive loading UX** — All 17 dashboard routes have dedicated `loading.tsx` with skeleton UI that matches actual content layout. Settings tabs have individual Suspense fallbacks.
- **Zero `select('*')` across entire codebase** — Every Supabase query selects only needed columns.
- **Batch operations everywhere** — Booking creation inserts packages, addons, backgrounds, and custom fields all via single batch operations, not loops.
- **Smart code splitting** — Settings page lazy-loads 10 tabs (only first tab eagerly loaded). Bookings and Photo Delivery use `ssr: false` for Radix UI compatibility.
- **Image optimization fully configured** — AVIF+WebP, `next/image` everywhere, `priority` on LCP images, `sizes` specified, Supabase remote patterns configured.

---

## Action Items Summary

### Must Fix (Immediate Impact)

None — no critical performance issues.

### Should Optimize (Significant Improvement)

1. Add `export const dynamic = 'force-dynamic'` to all authenticated pages — prevents caching surprises on framework upgrade
2. Add Suspense streaming to Dashboard, Booking Detail, and New Booking pages — enables progressive rendering
3. Use `getCachedStudioInfo()` on login page — `src/app/(auth)/login/page.tsx:7`

### Consider (Nice to Have)

1. Add `useTransition` for search/filter/sort in table components — smoother UX during refetches
2. Implement optimistic UI for add/remove addon, expense CRUD — instant feedback
3. Add explicit `prefetch={true}` on dashboard quick menu links, `prefetch={false}` on detail links
4. Parallelize photo delivery page query with auth check — `src/app/(dashboard)/photo-delivery/page.tsx`
5. Parallelize API route operations where possible — `src/app/api/users/create/route.ts`
6. Audit RLS policies in Supabase SQL Editor for `(SELECT auth.uid())` wrapper optimization
7. Verify FK column indexes exist in database

---

## Quick-Reference Diagnostic Commands

| What to Check | Command |
|---|---|
| Bundle size | `ANALYZE=true npm run build` (requires `@next/bundle-analyzer`) |
| Production caching | `npm run build && npm run start` (never test caching in dev) |
| Route rendering modes | `npm run build` → check output: ○ static, ◐ ISR, λ dynamic |
| Slow Supabase queries | `SELECT mean_exec_time, calls, query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;` |
| Missing indexes | `EXPLAIN ANALYZE` on slow queries — look for `Seq Scan` |
| RLS impact | Compare query with RLS vs `SET ROLE postgres` (dev only) |
| Core Web Vitals | Google PageSpeed Insights (field data), Lighthouse (lab data) |
| DB cache hit rate | `SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;` (target 99%+) |

---

*Generated by AI Performance Review Agent. Checklist based on Next.js official docs, Supabase performance guides, Vercel best practices, and Google Core Web Vitals methodology.*
