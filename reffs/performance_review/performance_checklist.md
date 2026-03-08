# Performance Review Checklist & Report Template

> **Scope:** This review covers runtime performance, database optimization, caching strategy, loading UX, and asset delivery. It does NOT cover code correctness, security vulnerabilities, architectural patterns, or testing quality — those belong in the Code Review.

---

## How This File Works

This file serves two purposes:

1. **Checklist** (Sections 1–7): The knowledge base of performance best practices. The agent reads these to know what to look for.
2. **Report Template** (Section 8): The output format. The agent fills this in with findings from the audit.

The agent should:
1. Read Sections 1–7 to understand what to audit
2. Scan the codebase against each checklist item
3. Fill in the Report Template (Section 8) with findings
4. Save as `performance_report_[YYYY-MM-DD].md`

---

## Pre-Audit: Detect Framework Version

> **CRITICAL:** Before starting, detect the Next.js version from `package.json`. Caching defaults changed significantly between versions.

| Version | `fetch()` Default | GET Route Handlers | Router Cache staleTime |
|---------|-------------------|--------------------|------------------------|
| 14.x | `force-cache` (cached) | Cached | 30s dynamic, 5min static |
| 15.x+ | `no-store` (uncached) | Uncached | 0s (always revalidates) |

Adapt all caching recommendations based on detected version. When this document says "default behavior," it means the behavior for the **detected version**.

---

## 1. Caching & Revalidation Strategy

Next.js App Router has four caching layers that interact. Misconfiguring any layer causes stale data or unnecessary re-fetching.

| Layer | What It Caches | Where | Duration |
|-------|---------------|-------|----------|
| Request Memoization | Identical `fetch()` calls | Server, per-request | Single render pass |
| Data Cache | `fetch()` responses | Server, persistent | Until revalidated |
| Full Route Cache | Pre-rendered HTML + RSC payload | Server, persistent | Until revalidated |
| Router Cache | RSC payload | Browser memory | Version-dependent (see table above) |

### What to Audit

**1.1 — Every `fetch()` call has an explicit cache directive**

Check that no `fetch()` call relies on implicit defaults. Every fetch should have one of:
- `cache: 'force-cache'` — for truly static data
- `cache: 'no-store'` — for user-specific or real-time data
- `next: { revalidate: N }` — for time-based revalidation (ISR)

Why: Implicit defaults differ between v14 and v15, causing bugs when upgrading. Explicit is always safe.

**1.2 — No `force-cache` on user-specific data**

Any fetch that includes auth tokens, user IDs, session data, or personalized content must NOT use `force-cache` at the route level. This causes User A's data to be served to User B.

Safe patterns for caching user data:
- `cache: 'no-store'` (no caching)
- `unstable_cache` with per-user cache key
- Client-side fetching with SWR/React Query

**1.3 — No conflicting fetch options**

Setting both `{ revalidate: N }` and `{ cache: 'no-store' }` on the same fetch silently breaks both. Use one or the other.

**1.4 — Cacheable fetches are tagged for invalidation**

Look for `next: { tags: ['tag-name'] }` on cached fetches. Without tags, the only way to invalidate is the broad `revalidatePath()`.

**1.5 — Supabase queries use `unstable_cache` for server-side caching**

Supabase JS client calls do NOT participate in the Next.js Data Cache because they use HTTP internally (not the extended `fetch()`). To cache Supabase results on the server:

```ts
import { unstable_cache } from 'next/cache'

export const getCachedData = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data } = await supabase.from('table').select('col1, col2').limit(50)
    return data
  },
  ['cache-key'],
  { tags: ['tag-name'], revalidate: 60 }
)
```

Check: No `cookies()` or `headers()` called inside the cached function body — these must be read outside and passed as arguments.

**1.6 — React `cache()` used for per-request deduplication**

When the same Supabase query (e.g., `getUser()`) is called in multiple Server Components during one render, it should be wrapped in `import { cache } from 'react'` to avoid duplicate network calls.

**1.7 — Route segment config is explicit**

Every route should have either `export const dynamic = 'force-dynamic'` or `export const revalidate = N`. Without explicit config, Next.js uses heuristics that may produce unexpected results.

Check: The "lowest revalidate wins" rule — if two fetches in one route use different revalidation times, the shorter one applies to the entire route.

**1.8 — Mutations are paired with cache invalidation**

Every Server Action that writes to the database should call `revalidateTag()` or `revalidatePath()` afterward. Without this, the Data Cache and Router Cache serve stale data.

Important: `revalidateTag()` inside a Server Action clears the client Router Cache immediately. The same call inside a Route Handler does NOT clear the Router Cache.

**1.9 — `revalidatePath('/', 'layout')` is not overused**

This invalidates the entire site's cache. Flag any usage and recommend granular tag-based invalidation.

---

## 2. Supabase Client & Query Optimization

### What to Audit

**2.1 — Correct Supabase client setup with `@supabase/ssr`**

Expected structure:
```
lib/supabase/
├── client.ts     # createBrowserClient — singleton, Client Components
├── server.ts     # createServerClient — per-request, Server Components/Actions
└── middleware.ts  # Session refresh
```

Red flags:
- Using `@supabase/supabase-js` `createClient()` directly in Server Components (no cookie handling)
- Singleton server client (must be per-request because it reads cookies)
- Service role key in `NEXT_PUBLIC_` environment variables
- Service role key used with the SSR cookie client

**2.2 — Queries select only needed columns**

Flag every `.select('*')` call. Replace with explicit column lists:
```ts
// ❌ Wasteful
.select('*')

// ✅ Efficient
.select('id, name, price, image_url')
```

**2.3 — `.single()` or `.maybeSingle()` used for single-row queries**

When expecting exactly one row (e.g., fetching by ID), `.single()` adds `LIMIT 1`. Use `.maybeSingle()` when zero rows is a valid case.

**2.4 — Batch operations instead of loops**

Flag any pattern where Supabase insert/update/delete is called inside a loop:
```ts
// ❌ N separate HTTP requests
for (const item of items) {
  await supabase.from('items').insert(item)
}

// ✅ Single request
await supabase.from('items').insert(items)
```

**2.5 — Cursor-based pagination for large datasets**

Offset-based pagination (`range(from, to)`) degrades with high offsets. For infinite scroll or deep pagination, use cursor-based:
```ts
.order('created_at', { ascending: false })
.lt('created_at', lastSeenTimestamp)
.limit(20)
```

**2.6 — `count: 'estimated'` for large tables**

`count: 'exact'` requires a full table scan. Use `count: 'estimated'` when approximate counts suffice (e.g., "~1,234 results").

**2.7 — Realtime subscriptions cleaned up**

Every `supabase.channel().subscribe()` in a `useEffect` must have a cleanup:
```ts
return () => { supabase.removeChannel(channel) }
```

Missing cleanup causes memory leaks and connection exhaustion.

**2.8 — No redundant `getUser()` calls**

If middleware validates the session, Server Components should use the cheaper `getClaims()` (local JWKS validation) instead of calling `getUser()` (network roundtrip) again. Alternatively, `getUser()` should be wrapped in React `cache()`.

**2.9 — `getSession()` not used for server-side auth**

`getSession()` does not validate the JWT signature — it only checks format and expiry. Server-side authorization must use `getUser()` or `getClaims()`.

> Note: This is flagged as a correctness issue, not a security issue. The security aspect is covered in Code Review. Performance Review flags it because `getUser()` is a network call and `getClaims()` is faster.

---

## 3. Database & RLS Performance

### What to Audit

**3.1 — Indexes on all foreign key columns**

PostgreSQL does NOT auto-create indexes on foreign keys. Check that every FK column has a btree index:
```sql
CREATE INDEX idx_table_fk_column ON table_name USING btree (fk_column);
```

**3.2 — Indexes on columns in WHERE, ORDER BY, and JOIN clauses**

Scan Supabase queries for `.eq()`, `.order()`, `.filter()` patterns and verify corresponding database indexes exist.

**3.3 — Composite indexes for common query patterns**

If a query frequently filters by `(user_id, status)` and orders by `created_at`, a composite index is more efficient than three separate indexes:
```sql
CREATE INDEX idx_orders_user_status_date ON orders (user_id, status, created_at DESC);
```

**3.4 — RLS policies use `(SELECT auth.uid())` wrapper**

This is the single biggest RLS performance fix. Without the wrapper, `auth.uid()` is evaluated per-row. With it, PostgreSQL evaluates it once:

```sql
-- ❌ Slow — per-row evaluation
USING (auth.uid() = user_id);

-- ✅ Fast — evaluated once via initPlan
USING ((SELECT auth.uid()) = user_id);
```

Apply the same pattern to `auth.jwt()`, `current_setting()`, and any custom functions in RLS policies.

**3.5 — RLS policies specify `TO` role**

Policies without `TO authenticated` evaluate for anonymous users too, wasting resources:
```sql
-- ❌ Evaluates for all roles
CREATE POLICY "own_data" ON posts USING (...);

-- ✅ Only evaluates for authenticated users
CREATE POLICY "own_data" ON posts TO authenticated USING (...);
```

**3.6 — RLS join direction is optimized**

The subquery should filter by the user first, then match table rows:
```sql
-- ❌ Slow — correlates with each row
USING (auth.uid() IN (
  SELECT user_id FROM team_members WHERE team_members.team_id = posts.team_id
))

-- ✅ Fast — builds user's team set first
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = (SELECT auth.uid())
))
```

**3.7 — Client-side filters mirror RLS conditions**

Even though RLS enforces filtering, adding explicit `.eq('user_id', userId)` in the client query helps the PostgreSQL query planner choose optimal indexes.

---

## 4. Image & Asset Optimization

### What to Audit

**4.1 — All images use `next/image`**

Flag any raw `<img>` tag. `next/image` provides: automatic WebP/AVIF conversion, responsive srcset, lazy loading, and CLS prevention.

**4.2 — Above-the-fold images have `priority`**

The hero image and logo should have `priority` prop to disable lazy loading and trigger a preload hint. Flag if `priority` is used on more than 2-3 images per page (defeats its purpose).

**4.3 — Responsive images have `sizes` prop**

Without `sizes`, Next.js generates a full-width srcset. Check for appropriate breakpoint-based sizes:
```tsx
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
```

**4.4 — `placeholder="blur"` for perceived performance**

Check for blur placeholders on content images. Local imports get automatic blur; remote images need `blurDataURL`.

**4.5 — AVIF format enabled in `next.config.js`**

```js
images: { formats: ['image/avif', 'image/webp'] }
```

**4.6 — `remotePatterns` configured for Supabase storage**

External images must be whitelisted. Check for the Supabase storage domain pattern.

**4.7 — Fonts use `next/font`**

Flag any `<link>` to Google Fonts or external font CDNs. `next/font` self-hosts, auto-subsets, and prevents CLS.

Check for: `subsets` specified, `display: 'swap'` set, variable fonts used when available, max 2-3 font families.

**4.8 — Bundle size is managed**

Check for:
- Barrel file imports (`import { X } from '@/components'` instead of direct imports)
- `optimizePackageImports` in `next.config.js` for large libraries (lucide-react, heroicons, radix)
- ES module library versions (`lodash-es` over `lodash`, `date-fns` over `moment.js`)
- Heavy libraries that could be dynamically imported

---

## 5. Rendering Strategy

### What to Audit

**5.1 — `generateStaticParams` used for known dynamic routes**

Public content with known slugs/IDs (blog posts, products, docs) should be pre-rendered at build time.

**5.2 — Streaming with Suspense for mixed-speed pages**

Pages that fetch multiple independent datasets should wrap each async section in `<Suspense>`:
```tsx
<Suspense fallback={<Skeleton />}>
  <SlowDataSection />
</Suspense>
```

This lets fast sections render immediately without waiting for slow ones.

**5.3 — `loading.tsx` exists in key route segments**

Check that dashboard, listing, and detail pages have `loading.tsx`. This provides instant skeleton loading during route transitions.

**5.4 — No sequential waterfall fetches**

Flag this anti-pattern:
```ts
// ❌ Waterfall — each waits for the previous
const user = await getUser()
const posts = await getPosts()
const stats = await getStats()
```

Fix with `Promise.all()` for independent fetches:
```ts
const [user, posts, stats] = await Promise.all([getUser(), getPosts(), getStats()])
```

**5.5 — `"use client"` at leaf level for minimal JS shipping**

The lower `"use client"` is in the component tree, the less JavaScript ships to the browser. Flag `"use client"` on page-level or layout-level components.

> Note: Code Review checks this for architectural correctness. Performance Review checks it for bundle size impact.

**5.6 — Heavy components use `next/dynamic`**

Charts, editors, maps, modals, and syntax highlighters should be dynamically imported with a loading fallback:
```tsx
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <ChartSkeleton />,
})
```

Flag `ssr: false` unless the component genuinely requires browser APIs (Canvas, WebGL, `window`).

**5.7 — Skeletons match actual content layout**

Skeleton components should mirror the real content's structure (grid columns, card sizes, text line heights) to prevent CLS.

---

## 6. Client-Side Performance

### What to Audit

**6.1 — Optimistic UI for mutations**

Forms and actions that modify data should update the UI immediately, then reconcile with the server:
- `useOptimistic` hook for Server Action-driven updates
- Manual optimistic patterns for client-side mutations

**6.2 — `useTransition` for expensive state updates**

Search filters, sorting, and other interactions that trigger expensive re-renders should use `startTransition` to keep the UI responsive:
```tsx
const [isPending, startTransition] = useTransition()
startTransition(() => { setFilteredResults(filter(data, query)) })
```

**6.3 — Low-priority links disable prefetching**

Footer links, legal pages, and rarely-visited routes should use `prefetch={false}`:
```tsx
<Link href="/legal/terms" prefetch={false}>Terms</Link>
```

**6.4 — Middleware has a `matcher` config**

Without `matcher`, middleware runs on every request including static assets. Check for:
```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**6.5 — Middleware is lightweight**

No database queries, no heavy computation, no complex business logic in middleware. It runs on every matched request on the Edge Runtime.

**6.6 — Production `next.config.js` settings**

Check for:
```js
{
  compress: true,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  experimental: { optimizePackageImports: [...] },
}
```

---

## 7. Common Pitfalls Checklist

| Pitfall | How to Detect | Risk |
|---------|--------------|------|
| Cached user data at route level | `force-cache` or no `cache` option on user-specific fetches | Data leaks between users |
| Missing cache invalidation after mutation | Server Action without `revalidateTag`/`revalidatePath` | Stale data after writes |
| `revalidateTag` in Route Handler expecting client freshness | Route Handler (not Server Action) doing mutations | Stale Router Cache |
| GoTrueClient memory leak | Multiple `createClient()` calls on client side without singleton | Memory leak, timer accumulation |
| Missing Realtime cleanup | `useEffect` with `.subscribe()` but no return cleanup | Connection exhaustion |
| `getSession()` for server auth | `getSession()` instead of `getUser()`/`getClaims()` on server | Unvalidated JWT |
| Dev vs production caching mismatch | Testing caching in `next dev` (always dynamic) | False confidence in caching |
| RLS `auth.uid()` without `(SELECT ...)` | RLS policies with bare `auth.uid()` calls | 100x slowdown on large tables |
| Over-caching everything | `force-cache` everywhere without invalidation strategy | Users see outdated data |
| Over-granular Suspense | Suspense around every small component | Visual chaos, loading waterfall |

---

## 8. Report Template

> Fill in this section with audit findings. Save as `performance_report_[YYYY-MM-DD].md`.

---

# Performance Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | `{project_name}` |
| **Date** | `{review_date}` |
| **Tech Stack** | `{detected_stack}` |
| **Framework Version** | `{detected_version}` |
| **Reviewer** | AI Performance Review Agent |
| **Detected Rendering Modes** | `{○ static / ◐ ISR / λ dynamic — from build output}` |

### Overall Performance Score

| Overall Score | Verdict |
|---------------|---------|
| **{score}/5.0** | {EXCELLENT / GOOD / NEEDS WORK / POOR} |

**Bottom line:** {One sentence summary of performance state.}

---

## Scorecard

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Caching Strategy | {1-5}/5 | {assessment} |
| Supabase Query Efficiency | {1-5}/5 | {assessment} |
| Database & RLS Performance | {1-5}/5 | {assessment} |
| Image & Asset Optimization | {1-5}/5 | {assessment} |
| Rendering Strategy | {1-5}/5 | {assessment} |
| Client-Side Performance | {1-5}/5 | {assessment} |
| Loading UX (Perceived Speed) | {1-5}/5 | {assessment} |

### Scoring Formula

```
Overall = (Caching × 0.20 + SupabaseQueries × 0.15 + DatabaseRLS × 0.15)
        + (ImageAssets × 0.10 + Rendering × 0.15 + ClientSide × 0.10 + LoadingUX × 0.15)
```

| Score Range | Verdict |
|-------------|---------|
| 4.5 – 5.0 | 🟢 EXCELLENT — production-optimized, near-instant experience |
| 3.5 – 4.4 | 🟡 GOOD — solid baseline, targeted improvements possible |
| 2.5 – 3.4 | 🟠 NEEDS WORK — noticeable performance gaps, action required |
| 1.5 – 2.4 | 🔴 POOR — significant bottlenecks degrading user experience |
| 1.0 – 1.4 | ⛔ CRITICAL — fundamental performance issues, major rework needed |

---

## Findings by Priority

### 🔴 Critical — Immediate Impact

{If none: "No critical performance issues found."}

#### 1. {Issue title}

- **Area:** {Caching / Supabase / Database / Assets / Rendering / Client-Side}
- **File(s):** `{filepath}:{line}`
- **Impact:** {Measured or estimated impact on load time / user experience}
- **Risk Level:** 🟢 Safe fix / 🟡 Test carefully

**Problem:** {Clear description.}

**Current code:**
```
{snippet}
```

**Optimized code:**
```
{fix}
```

---

### 🟠 Major — Should Optimize

{If none: "No major performance issues found."}

#### 1. {Issue title}

- **Area:** {area}
- **File(s):** `{filepath}:{line}`
- **Impact:** {impact}

**Problem:** {Description.}

**Fix:** {Approach or code.}

---

### 🟡 Minor — Recommended Improvement

{If none: "No minor issues found."}

- `{filepath}:{line}` — {Suggestion}

---

## Section Audit Results

### Caching & Revalidation

| Check | Status | Notes |
|-------|--------|-------|
| All fetches have explicit cache directive | {OK/WARN/FAIL} | {notes} |
| No `force-cache` on user data | {OK/WARN/FAIL} | {notes} |
| No conflicting fetch options | {OK/WARN/FAIL} | {notes} |
| Cacheable fetches are tagged | {OK/WARN/FAIL} | {notes} |
| Supabase queries use `unstable_cache` | {OK/WARN/FAIL/N/A} | {notes} |
| React `cache()` for deduplication | {OK/WARN/FAIL} | {notes} |
| Route segment config explicit | {OK/WARN/FAIL} | {notes} |
| Mutations paired with invalidation | {OK/WARN/FAIL} | {notes} |

### Supabase Client & Queries

| Check | Status | Notes |
|-------|--------|-------|
| Correct `@supabase/ssr` setup | {OK/WARN/FAIL} | {notes} |
| Queries select specific columns | {OK/WARN/FAIL} | {notes} |
| `.single()`/`.maybeSingle()` used | {OK/WARN/FAIL} | {notes} |
| Batch operations (no loops) | {OK/WARN/FAIL} | {notes} |
| Cursor-based pagination | {OK/WARN/FAIL/N/A} | {notes} |
| Realtime subscriptions cleaned up | {OK/WARN/FAIL/N/A} | {notes} |
| No redundant `getUser()` calls | {OK/WARN/FAIL} | {notes} |

### Database & RLS

| Check | Status | Notes |
|-------|--------|-------|
| FK columns indexed | {OK/WARN/FAIL} | {notes} |
| Query columns indexed | {OK/WARN/FAIL} | {notes} |
| Composite indexes for common patterns | {OK/WARN/FAIL/N/A} | {notes} |
| RLS uses `(SELECT auth.uid())` | {OK/WARN/FAIL} | {notes} |
| RLS policies specify `TO` role | {OK/WARN/FAIL} | {notes} |
| RLS join direction optimized | {OK/WARN/FAIL/N/A} | {notes} |
| Client filters mirror RLS | {OK/WARN/FAIL} | {notes} |

### Image & Assets

| Check | Status | Notes |
|-------|--------|-------|
| All images use `next/image` | {OK/WARN/FAIL} | {notes} |
| LCP images have `priority` | {OK/WARN/FAIL} | {notes} |
| Responsive images have `sizes` | {OK/WARN/FAIL} | {notes} |
| AVIF format enabled | {OK/WARN/FAIL} | {notes} |
| Fonts use `next/font` | {OK/WARN/FAIL} | {notes} |
| No barrel file imports | {OK/WARN/FAIL} | {notes} |
| `optimizePackageImports` configured | {OK/WARN/FAIL} | {notes} |

### Rendering Strategy

| Check | Status | Notes |
|-------|--------|-------|
| `generateStaticParams` for known routes | {OK/WARN/FAIL/N/A} | {notes} |
| Suspense boundaries on async sections | {OK/WARN/FAIL} | {notes} |
| `loading.tsx` in key routes | {OK/WARN/FAIL} | {notes} |
| No sequential waterfall fetches | {OK/WARN/FAIL} | {notes} |
| `"use client"` at leaf level | {OK/WARN/FAIL} | {notes} |
| Heavy components dynamically imported | {OK/WARN/FAIL} | {notes} |
| Skeletons match content layout | {OK/WARN/FAIL} | {notes} |

### Client-Side Performance

| Check | Status | Notes |
|-------|--------|-------|
| Optimistic UI for mutations | {OK/WARN/FAIL/N/A} | {notes} |
| `useTransition` for expensive updates | {OK/WARN/FAIL/N/A} | {notes} |
| Low-priority links no prefetch | {OK/WARN/FAIL} | {notes} |
| Middleware has `matcher` config | {OK/WARN/FAIL} | {notes} |
| Middleware is lightweight | {OK/WARN/FAIL} | {notes} |
| Production `next.config.js` optimized | {OK/WARN/FAIL} | {notes} |

---

## Positive Highlights

- {Something done well}
- {Something done well}
- {Something done well}

---

## Action Items Summary

### Must Fix (Immediate Impact)

1. {issue title} — `{file}:{line}`

### Should Optimize (Significant Improvement)

1. {issue title} — `{file}:{line}`

### Consider (Nice to Have)

1. {suggestion} — `{file}:{line}`

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

## Cross-Reference

> If a Code Review was also conducted, note any shared findings here:

| Finding | Performance Angle | Code Review Angle |
|---------|-------------------|-------------------|
| {shared finding} | {performance perspective} | {code quality perspective} |

---

*Generated by AI Performance Review Agent. Checklist based on Next.js official docs, Supabase performance guides, Vercel best practices, and Google Core Web Vitals methodology.*
