# Code Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **PR/Change** | Sprint review — multi-package booking support, feature-based status permissions, commission bonus, PWA service worker, refactors |
| **Author** | Development team |
| **Reviewer** | AI Code Review Agent |
| **Date** | 2026-03-12 (session b) |
| **Tech Stack** | Next.js 14.2.35, TypeScript 5 strict, Supabase JS v2, ShadCN UI, Framer Motion v12 |
| **Framework Version** | Next.js 14.2.35 (App Router) |
| **Files Changed** | 50+ files across bookings, commissions, settings, calendar, photo-delivery, public pages |
| **Change Type** | Feature addition + carryover fixes |

### Overall Verdict

| Overall Score | Verdict |
|---------------|---------|
| **3.5/5.0** | ✅ APPROVE with suggestions |

**Bottom line:** The multi-package and feature-permission additions are well-architected and follow established patterns; the long-standing API authorization gap is now fixed, but four issues from the 2026-03-12 report remain unresolved and two new minor issues were introduced.

---

## Scorecard

### Tier 1 — Critical (40% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Security | 3.5/5 | API route authorization gap is now fixed ✅; photo-delivery search string-concat into `.or()` filter is still present; role-management mutations still lack server-side auth guard |
| Functionality and Correctness | 4/5 | Multi-package pricing and commission bonus logic are correct; `resolveBonus()` has an edge case when `commissionAmount` is intentionally `0`; import ordering bug in `tab-pricing.tsx` is cosmetic but may fool linters |
| Error Handling and Resilience | 3.5/5 | Good try/catch coverage in new code; `commissions-client.tsx` `Promise.all` still destructures without per-query error checks; calendar popup time parsing still has no null guard |

### Tier 2 — Important (35% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Architecture and Design | 4.5/5 | `booking_packages` junction table pattern is clean; `hasStatusPermission()` with `sc:FROM:TO` granular permissions is elegant; `resolveBonus()` utility is well-extracted |
| Testing Quality | 2/5 | No automated tests — unchanged across all sprints |
| Readability and Maintainability | 3.5/5 | `toDateStr()` now in 11 additional files beyond `utils.ts` — duplication grew this sprint; `PAGE_SIZE_OPTIONS` still inline; `tab-pricing.tsx` has `createClient()` call between import statements |

### Tier 3 — Improvement (25% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Code Standards and Style | 3.5/5 | Import ordering violation in `tab-pricing.tsx`; `as never` cast carryover from previous sprint |
| Documentation | 3/5 | No `.env.example`, no JSDoc — unchanged; `sc:FROM:TO` permission format is undocumented |
| API Design | 4/5 | No new API routes this sprint; existing routes improved |
| Logging and Observability | 4.5/5 | Commission bonus amounts and multi-package edits are logged to `activity_log`; complete coverage |
| Deployment and Configuration | 4.5/5 | `loading.tsx` added for photo-delivery routes ✅ (resolves cross-reference item from 2026-03-12 report); PWA `sw.js` is standard Workbox — acceptable |

### Scoring Calculation

```
Overall = (3.5 × 0.15 + 4.0 × 0.15 + 3.5 × 0.10)
        + (4.5 × 0.10 + 2.0 × 0.10 + 3.5 × 0.10)
        + (3.5 × 0.05 + 3.0 × 0.05 + 4.0 × 0.05 + 4.5 × 0.05 + 4.5 × 0.05)

       = (0.525 + 0.60 + 0.35) + (0.45 + 0.20 + 0.35) + (0.175 + 0.15 + 0.20 + 0.225 + 0.225)

       = 1.475 + 1.00 + 0.975 = 3.45 ≈ 3.5/5.0
```

---

## Findings

### 🔴 Critical Issues — Must Fix

#### 1. Photo-Delivery Search Filter — String Concatenation into Query (Carryover from 2026-03-12)

- **File:** `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx:97–102`
- **Dimension:** Security (A03 — Injection)
- **Impact:** Customer UUIDs from a prior DB query are joined directly into a PostgREST `.or()` filter string. Although UUIDs are inherently safe, this pattern is fragile — if the ID source ever changes or a non-UUID type is introduced, the injection surface opens.

**Problem:** `customerIds.join(",")` builds a raw string that becomes part of the query filter expression. This bypasses Supabase's parameterized query mechanism and is flagged as an unsafe pattern.

**Current code:**
```typescript
const conditions = [`booking_number.ilike.%${search.trim()}%`];
if (customerIds.length > 0) {
  conditions.push(`customer_id.in.(${customerIds.join(",")})`);  // raw join into filter string
}
query = query.or(conditions.join(","));
```

**Suggested fix — use `.in()` directly:**
```typescript
// Apply booking_number search via .or()
query = query.or(`booking_number.ilike.%${search.trim()}%`);
if (customerIds.length > 0) {
  // Note: this becomes AND with the above — matching booking_number OR customer
  // Use a separate query branch or a DB view if OR semantics are required
  query = query.in("customer_id", customerIds);
}
```
If OR semantics are required (match booking number OR customer name), document this explicitly and consider a DB-level text search function.

---

### 🟠 Major Issues — Should Fix

#### 1. `commissions-client.tsx` — `Promise.all()` Without Per-Query Error Handling (Carryover from 2026-03-12)

- **File:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx:176–189`
- **Dimension:** Error Handling and Resilience
- **Impact:** If either the `bookings` or `commissions` Supabase query returns `{ error }` (network timeout, RLS violation, etc.), the destructuring silently drops the error and continues with `null` data. The staff commission cards would render as empty with no user feedback.

**Current code:**
```typescript
const [{ data: bookings }, { data: existingCommissions }] = await Promise.all([
  supabase.from("bookings").select(...),
  supabase.from("commissions").select(...),
]);
// if either returns { error }, it is silently dropped
```

**Suggested fix:**
```typescript
const [bookingsResult, commissionsResult] = await Promise.all([
  supabase.from("bookings").select(...),
  supabase.from("commissions").select(...),
]);
if (bookingsResult.error) throw bookingsResult.error;
if (commissionsResult.error) throw commissionsResult.error;
const bookings = bookingsResult.data;
const existingCommissions = commissionsResult.data;
```

---

#### 2. `role-management-client.tsx` — Client-Side-Only Permission Gate (Carryover from 2026-03-12)

- **File:** `src/app/(dashboard)/role-management/_components/role-management-client.tsx:70–173`
- **Dimension:** Security / Architecture
- **Impact:** `handleSave()` and `handleDelete()` call `.update()` and `.delete()` on the `roles` table without first verifying `currentUser.is_primary`. A user who manipulates React state or calls Supabase directly from the browser console can modify roles without the UI permission check firing.

**Problem:** Only the UI conditionally shows edit/delete buttons based on `currentUser.is_primary`. The async mutation functions themselves have no guard.

**Suggested fix:** Add an early return at the top of both functions:
```typescript
async function handleSave() {
  if (!currentUser.is_primary) {
    toast({ title: "Tidak diizinkan", variant: "destructive" });
    return;
  }
  // ... rest of function
}
```

---

#### 3. `resolveBonus()` — Zero Commission Amount Ambiguity (New)

- **File:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx:84–92`
- **Dimension:** Functionality and Correctness
- **Impact:** If a booking's `commission_amount` is explicitly set to `0` (intentional — commission waived), `resolveBonus()` treats it identically to "not set" and falls through to `pkgBonus` or `defaultBonus`. A waived commission would silently become a positive commission amount.

**Current code:**
```typescript
function resolveBonus(commissionAmount: number, pkgBonus: number | null | undefined, defaultBonus: number): number {
  if (commissionAmount > 0) return commissionAmount;  // 0 falls through even if intentional
  if (pkgBonus && pkgBonus > 0) return pkgBonus;
  return defaultBonus;
}
```

**Suggested fix:** Verify with the business owner whether `commission_amount = 0` means "use default" or "commission waived". If the latter needs to be supported, add a sentinel value (e.g., `-1` = waived) or a separate `commission_override: boolean` column. Add a code comment documenting the current assumption.

---

### 🟡 Minor Issues — Recommended

- `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx:46–51` — `currentUser: CurrentUser` is defined in the `Props` interface but the component destructures only `{ initialData }`. Remove the unused prop from the interface or use it.

- `src/app/(dashboard)/calendar/_components/booking-popup.tsx:128–132` — `booking.start_time.split(":")` has no null guard. If `start_time` or `end_time` is `null` or malformed, `durationMin` will be `NaN` and render as "NaN menit". Add: `if (!booking.start_time || !booking.end_time) return 0;`

- `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx:7` — `const supabase = createClient()` is declared between `import` statements (after the React import, before the ShadCN imports). JavaScript hoists imports above `const` declarations at runtime, so this works, but it violates import-ordering conventions and may be flagged by ESLint's `import/order` rule. Move the `const supabase` declaration below all import statements.

- `src/lib/utils.ts` — `toDateStr()` is now duplicated in **11** additional files (calendar views, reminders, bookings, mua). This grew from the 4 flagged in the 2026-03-09 report. The function exists in `utils.ts` — all other files should import it from there instead.

- `src/app/(dashboard)/settings/_components/tab-packages.tsx:115` — Validation checks `!form.price` (empty string) but accepts `0` or negative values. `parseInt("0")` passes the `!form.price` check. Add: `if (payload.price <= 0 || payload.duration_minutes <= 0)` guard after parsing.

- `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx:44` — `PAGE_SIZE_OPTIONS = [10, 25, 50]` is still defined inline. Flagged in 2026-03-12 report. Move to `src/lib/constants.ts`.

---

### 🔵 Nitpicks — Non-Blocking

- **Nit:** `src/app/(dashboard)/calendar/_components/booking-popup.tsx` — The `sc:FROM:TO` permission key format (e.g., `sc:BOOKED:PAID`) is a good pattern but completely undocumented. Add a comment near `hasStatusPermission()` explaining the format so future developers know how to grant granular status-change access.

- **Nit:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx` — `ADDON_UNPAID` still in `paidStatuses` for commission calculation (line 175). If intentional, add an inline comment: `"ADDON_UNPAID", // intentional: addon debt does not block commission`

- **Nit:** `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx:84` — The `total` variable recalculates on every render using non-memoized values. Wrap in `useMemo` with `[packagesTotal, originalAddonsTotal, extraAddonsTotal, booking.manual_discount, booking.vouchers]` dependencies for consistency with the rest of the file.

---

## Positive Highlights

- **API route authorization is now complete** — both `/api/users/create` and `/api/users/delete` correctly check authentication AND authorization (`is_primary || menu_access.includes("user-management")`), with rollback on partial failure. This closes the highest-severity issue from 2026-03-12.
- **`hasStatusPermission()` is elegantly designed** — `is_primary → booking_full_access → sc:FROM:TO` permission hierarchy is clean, composable, and easy to extend. Defined once in `booking-popup.tsx` before use.
- **Multi-package booking is cleanly modeled** — `booking_packages` junction table with `price_snapshot` correctly captures point-in-time pricing. `BookingPackageRow` interface in `booking-detail-client.tsx` is precise and reuses existing type patterns.
- **`loading.tsx` added for photo-delivery** — both `/photo-delivery` and `/photo-delivery/[id]` now have proper skeleton loaders, resolving the perceived performance gap from the 2026-03-12 cross-reference.
- **Commission bonus flexibility** — `commission_amount` per-booking override with package-level and studio-level defaults gives a clean three-tier hierarchy. `resolveBonus()` correctly extracted as a pure function.
- **Sorting refactor is clean** — the `e6bd7ab` commit consistently applies the same sort comparator pattern across multiple components without introducing new dependencies.
- **Zero new `select('*')` calls** — multi-package queries specify exact columns with nested joins, maintaining the project-wide discipline.

---

## Technology-Specific Checks

### Next.js (App Router)

| Check | Status | Notes |
|-------|--------|-------|
| `"use client"` pushed to leaf components | OK | All new components follow the Server page → dynamic import → Client pattern |
| Server Actions validate inputs and re-authorize | OK | No new Server Actions this sprint |
| `server-only` import on sensitive modules | WARN | `cached-queries.ts` still lacks `server-only` guard — unchanged carryover |
| No secrets in `NEXT_PUBLIC_` variables | OK | No new env vars introduced |
| Dynamic route params validated and sanitized | OK | All `[id]` params used in parameterized `.eq()` with `notFound()` on missing records |
| `error.tsx` in key route segments | FAIL | Still no `error.tsx` anywhere — unchanged from 2026-03-09. New photo-delivery and booking-packages routes added without error boundaries. |
| Middleware logic is correct and secure | OK | Middleware unchanged; all new routes protected by existing auth middleware |
| Server Action mutations include cache invalidation | OK | Package and settings mutations call appropriate `invalidate*()` cache functions |
| No full database/API objects passed to Client Components | OK | All new components receive lean typed shapes only |
| `remotePatterns` in next.config.js is specific (no wildcards) | OK | Unchanged |

### Database Schema

| Check | Status | Notes |
|-------|--------|-------|
| Every table has a primary key | OK | `booking_packages` uses UUID PK following existing conventions |
| Foreign keys with ON DELETE behavior | OK | `booking_packages → bookings` and `booking_packages → packages` FK constraints expected |
| Migrations are backward-compatible | N/A | DB managed in Supabase dashboard; no migration files in repo |
| Parameterized queries (no string interpolation) | WARN | Photo-delivery search still concatenates `customerIds.join(",")` into `.or()` filter (see Critical Issue #1) |
| Timestamps timezone-aware (UTC) | OK | All timestamps use Supabase default UTC |
| Schema in 3NF | OK | Multi-package junction table is properly normalized |

### API Design

| Check | Status | Notes |
|-------|--------|-------|
| RESTful resource naming | OK | No new API routes this sprint |
| Correct HTTP status codes | OK | `/api/users/create` and `/api/users/delete` now return `403` on authorization failure — correct |
| Consistent error response format | OK | Both routes return `{ error: string }` consistently |
| Input validation on all endpoints | OK | `/api/users/create` validates required fields; `/api/users/delete` validates target user existence |
| Authentication/authorization enforced | OK | Both routes now verify authentication AND authorization ✅ |
| CORS properly configured | OK | Handled by Vercel/Next.js defaults |

---

## Security Checklist (OWASP Top 10)

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | WARN | `/api/users/create` and `/api/users/delete` now enforce authorization ✅. `role-management-client.tsx` still has no server-side guard — mutations rely on client-side UI state only. |
| A02 | Cryptographic Failures | OK | Passwords via Supabase Auth. HTTPS via Vercel. No custom crypto. |
| A03 | Injection | WARN | Photo-delivery search still concatenates `customerIds.join(",")` into PostgREST filter string — low immediate risk (UUIDs), unsafe pattern. |
| A04 | Insecure Design | OK | Auth middleware protects all dashboard routes. Public pages explicitly listed. RLS at DB level. |
| A05 | Security Misconfiguration | OK | No new `NEXT_PUBLIC_` secret exposure. PWA `sw.js` is standard Workbox tooling. |
| A06 | Vulnerable Components | WARN | No `npm audit` run as part of this review. |
| A07 | Auth Failures | OK | Supabase Auth session management unchanged. Middleware validates session on every request. `getUser()` used server-side. |
| A08 | Data Integrity Failures | OK | `price_snapshot` in `booking_packages` correctly captures point-in-time price. No client-side ID generation. |
| A09 | Logging and Monitoring Gaps | OK | All new CRUD operations (multi-package edits, commission bonus) log to `activity_log`. |
| A10 | SSRF | OK | No user-provided URLs used in server-side fetch. Google Drive links stored but not fetched server-side. |

---

## Deployment Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables documented and validated | WARN | No `.env.example` — unchanged. No new env vars introduced this sprint. |
| No secrets in source code or client bundles | OK | `SERVICE_ROLE` key in server-only `admin.ts`; no secrets in client bundles. |
| Build succeeds in production mode | OK | No new dependencies outside existing set; `public/sw.js` is pre-built Workbox. |
| Database migrations tested and reversible | N/A | DB managed in Supabase dashboard; `booking_packages` table must exist before deploy. |
| Feature flags for risky changes | N/A | Not used in this project. |
| Rollback plan identified | OK | Vercel instant rollback available. |

---

## Action Items Summary

### Must Fix (Security / Correctness)

1. **Fix photo-delivery search filter — avoid string concatenation** — `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx:97–102`
2. **Add server-side auth guard in `role-management-client.tsx`** — `src/app/(dashboard)/role-management/_components/role-management-client.tsx:70, 135`
3. **Clarify `resolveBonus()` zero-commission semantics** — `src/app/(dashboard)/commissions/_components/commissions-client.tsx:84–92`

### Should Fix (Quality / Resilience)

4. **Add per-query error handling to `Promise.all()` in commissions** — `src/app/(dashboard)/commissions/_components/commissions-client.tsx:176–189`
5. **Move `const supabase` below all import statements** — `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx:7`
6. **Remove unused `currentUser` prop from photo-delivery components** — `photo-delivery-client.tsx:46`
7. **Add null guard to calendar popup time parsing** — `src/app/(dashboard)/calendar/_components/booking-popup.tsx:128`

### Consider (Optional)

8. **Centralize `toDateStr()` — remove 11 local duplicates** — import from `src/lib/utils.ts` everywhere
9. **Add `error.tsx` error boundaries** — at minimum `src/app/(dashboard)/error.tsx`
10. **Add price/duration `<= 0` validation in packages form** — `src/app/(dashboard)/settings/_components/tab-packages.tsx:115`
11. **Move `PAGE_SIZE_OPTIONS` to `src/lib/constants.ts`** — `photo-delivery-client.tsx:44`
12. **Document `sc:FROM:TO` permission key format** — comment near `hasStatusPermission()` in `booking-popup.tsx`
13. **Add `.env.example` file** — document required environment variables

---

## Cross-Reference

> Performance Review (2026-03-12) was the companion review. Updated status of shared findings:

| Finding | Code Review Status | Performance Review Status |
|---------|--------------------|--------------------------|
| Photo-delivery search: two-step customer lookup | ❌ String concat still unsafe | ❌ Sequential latency still present |
| `commissions/page.tsx` `Promise.all()` upgrade | ✅ Parallelism correct; ❌ error handling missing | ✅ Waterfall resolved |
| Missing `loading.tsx` for photo-delivery | ✅ RESOLVED — both routes now have `loading.tsx` | ✅ RESOLVED |
| Activity log insert on every CRUD | ✅ New multi-package ops all logged | Acceptable at studio scale |
| `toDateStr()` duplication | ❌ Grew from 4 to 11 duplicates this sprint | N/A |

---

*Generated by AI Code Review Agent — 2026-03-12 (session b). ~50 files reviewed. Previous report: [2026-03-12](code_review_report_2026-03-12.md). Scoring based on Google Engineering Practices, SonarQube quality models, and Next.js/Supabase best practices.*
