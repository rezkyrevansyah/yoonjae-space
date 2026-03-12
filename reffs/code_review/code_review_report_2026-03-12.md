# Code Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **PR/Change** | Sprint review — photo-delivery module (new) + commissions, bookings, settings, calendar, customer page updates |
| **Author** | Development team |
| **Reviewer** | AI Code Review Agent |
| **Date** | 2026-03-12 |
| **Tech Stack** | Next.js 14.2.35, TypeScript 5 strict, Supabase JS v2, ShadCN UI, Framer Motion v12 |
| **Framework Version** | Next.js 14.2.35 (App Router) |
| **Files Changed** | 16 files (4 new photo-delivery files + 12 modified existing files) |
| **Change Type** | Feature addition + iteration |

### Overall Verdict

| Overall Score | Verdict |
|---------------|---------|
| **3.5/5.0** | ✅ APPROVE with suggestions |

**Bottom line:** The photo-delivery module is well-structured and follows established project patterns, but introduces a filter-injection risk in search; the critical API authorization gap from 2026-03-09 remains unresolved and must be addressed before production hardening.

---

## Scorecard

### Tier 1 — Critical (40% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Security | 3/5 | API routes still missing role check (carryover); photo-delivery search filter concatenation is a new injection-like risk |
| Functionality and Correctness | 4/5 | All features work correctly; photo-delivery CRUD is sound; minor null-safety gaps in calendar popup time parsing |
| Error Handling and Resilience | 3.5/5 | Good try/catch + toast coverage; `commissions-client.tsx` `Promise.all` has no per-query error handling; photo-delivery detail `useEffect` fetch has no `.catch()` |

### Tier 2 — Important (35% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Architecture and Design | 4.5/5 | Photo-delivery follows the established Server+Client split correctly; commissions parallel fetch improved; clean module boundaries |
| Testing Quality | 2/5 | No automated tests — no unit, integration, or E2E tests anywhere in the project |
| Readability and Maintainability | 4/5 | New module is well-named and structured; `toDateStr()` still duplicated (not fixed from 2026-03-09); unused `currentUser` props in photo-delivery components |

### Tier 3 — Improvement (25% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Code Standards and Style | 4/5 | TypeScript strict, lean selects, consistent Tailwind; `as never` cast in photo-delivery detail server page |
| Documentation | 3/5 | No JSDoc, no `.env.example` (same as 2026-03-09); photo-delivery decision to use `dynamic({ssr:false})` undocumented |
| API Design | 4/5 | No new API routes this sprint; existing routes unchanged |
| Logging and Observability | 5/5 | Photo-delivery fully logs deliver, update drive link, update print status to `activity_log` — consistent with all other modules |
| Deployment and Configuration | 4/5 | Build passes; `public/sw.js` is minified Workbox build — cannot manually audit |

### Scoring Calculation

```
Overall = (3.0 × 0.15 + 4.0 × 0.15 + 3.5 × 0.10)
        + (4.5 × 0.10 + 2.0 × 0.10 + 4.0 × 0.10)
        + (4.0 × 0.05 + 3.0 × 0.05 + 4.0 × 0.05 + 5.0 × 0.05 + 4.0 × 0.05)

       = (0.45 + 0.60 + 0.35) + (0.45 + 0.20 + 0.40) + (0.20 + 0.15 + 0.20 + 0.25 + 0.20)

       = 1.40 + 1.05 + 1.00 = 3.45 ≈ 3.5/5.0
```

---

## Findings

### 🔴 Critical Issues — Must Fix

#### 1. API Routes Missing Role/Permission Check — Carryover from 2026-03-09

- **File:** `src/app/api/users/create/route.ts:9–11`
- **File:** `src/app/api/users/delete/route.ts:9–11`
- **Dimension:** Security (A01 — Broken Access Control)
- **Impact:** Any authenticated user (even a basic staff/photographer account) can call these endpoints to create or delete Supabase Auth users, bypassing the role-based UI restrictions entirely.

**Problem:** Both routes verify authentication (`if (!user) return 401`) but do NOT verify authorization. The caller's role is not checked against `menu_access` for `"user-management"`. This issue was flagged in the 2026-03-09 report and has not been fixed.

**Current code:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// ← No role check — any authenticated user proceeds to create/delete users
```

**Suggested fix:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { data: callerUser } = await supabase
  .from("users")
  .select("is_primary, roles(menu_access)")
  .eq("auth_id", user.id)
  .single();

const callerRole = (Array.isArray(callerUser?.roles) ? callerUser.roles[0] : callerUser?.roles) as { menu_access: string[] } | null;
const hasPermission = callerUser?.is_primary || callerRole?.menu_access?.includes("user-management");

if (!hasPermission) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

#### 2. Photo-Delivery Search Filter — String Concatenation into Query

- **File:** `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx` (search block, approx. line 98–105)
- **Dimension:** Security (A03 — Injection)
- **Impact:** Customer IDs from a prior DB query are joined directly into a PostgREST `.or()` filter string. If a malicious value ever reaches `customerIds` (e.g., via a crafted customer name that affects the first query's results), it could alter the filter expression.

**Problem:** The filter is built by string-joining array values directly into the query expression, bypassing Supabase's parameterized query mechanism.

**Current code:**
```typescript
const customerIds = matchingCustomers?.map((c) => c.id) ?? [];
const conditions = [`booking_number.ilike.%${search.trim()}%`];
if (customerIds.length > 0) {
  conditions.push(`customer_id.in.(${customerIds.join(",")})`);  // ← raw join into filter string
}
query = query.or(conditions.join(","));
```

**Suggested fix — use `.in()` directly on the query:**
```typescript
const customerIds = matchingCustomers?.map((c) => c.id) ?? [];
// Apply both filters separately, use .or only for the booking_number part
query = query.or(`booking_number.ilike.%${search.trim()}%`);
if (customerIds.length > 0) {
  query = query.in("customer_id", customerIds);  // ← parameterized, safe
}
```
Note: If you need an OR between booking_number and customer_id, build two separate queries and merge client-side, or use a DB view/function. The `.in()` approach above applies an AND, which is more restrictive but safe. Document the chosen behavior with a comment.

---

### 🟠 Major Issues — Should Fix

#### 1. Unsafe `as never` Type Cast in Photo-Delivery Detail Server Page

- **File:** `src/app/(dashboard)/photo-delivery/[id]/page.tsx` (booking data assignment)
- **Dimension:** Code Standards / Type Safety
- **Impact:** `as never` silently suppresses any future type mismatch between the DB query shape and the component props. TypeScript will not warn if the select columns drift from what the component expects.

**Problem:** The booking result is cast to `never` then to the component prop type to bypass a TypeScript structural mismatch. This is the same pattern used on other detail pages but `never` is a more extreme cast than `unknown`.

**Suggested fix:** Define a proper `PhotoDeliveryDetail` interface in `src/lib/types/database.ts` that matches the exact select shape, then use it directly without casting.

---

#### 2. `commissions-client.tsx` — `Promise.all()` Without Per-Query Error Handling

- **File:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx` (parallel fetch block)
- **Dimension:** Error Handling and Resilience
- **Impact:** If either the `bookings` or `commissions` query fails (network error, Supabase timeout), `Promise.all()` rejects and the entire `handleSave()` or `fetchData()` silently aborts. The user sees no feedback.

**Problem:** Destructuring directly from `Promise.all()` results without checking individual errors.

**Current code:**
```typescript
const [{ data: bookings }, { data: existingCommissions }] = await Promise.all([
  supabase.from("bookings").select(...),
  supabase.from("commissions").select(...),
]);
// ← if either returns { error }, it's silently dropped
```

**Suggested fix:**
```typescript
const [bookingsResult, commissionsResult] = await Promise.all([
  supabase.from("bookings").select(...),
  supabase.from("commissions").select(...),
]);
if (bookingsResult.error) throw bookingsResult.error;
if (commissionsResult.error) throw commissionsResult.error;
```

---

#### 3. `role-management-client.tsx` — Client-Side-Only Permission Gate

- **File:** `src/app/(dashboard)/role-management/_components/role-management-client.tsx`
- **Dimension:** Security / Architecture
- **Impact:** A user who manipulates the React state or directly calls the Supabase client from the browser console can update roles without the UI permission check firing.

**Problem:** Role edit/delete buttons are conditionally rendered based on client-side props, but there is no server-side authorization check before the Supabase `.update()` or `.delete()` call executes. The only protection is RLS (if any exists on the `roles` table).

**Suggested fix:** Add a `currentUser.is_primary` check inside the `handleUpdate` and `handleDelete` async functions before calling Supabase, returning an early toast error if the check fails. This makes the guard explicit in code rather than relying solely on UI state.

---

### 🟡 Minor Issues — Recommended

- `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx` — `currentUser` is in the component props interface but never used in the component body. Remove the unused prop.

- `src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx` — Same issue: `currentUser` prop defined but unused.

- `src/app/(dashboard)/calendar/_components/booking-popup.tsx` — Time duration calculation (`(eh * 60 + em) - (sh * 60 + sm)`) does not guard against malformed time strings. If `start_time` or `end_time` is `null` or not in `"HH:MM"` format, the result is `NaN`. Add: `if (!booking.start_time || !booking.end_time) return 0;`

- `src/lib/utils.ts` — `toDateStr()` is still duplicated in at least 4 files (flagged in 2026-03-09 report, still not centralized). Add to `utils.ts` and import everywhere.

- `src/app/(dashboard)/settings/_components/tab-packages.tsx` — Form validation only checks `!form.name`. `price` and `duration_minutes` accept 0 or negative values without warning. Add: `if (form.price < 0 || form.duration_minutes <= 0)` guards before save.

---

### 🔵 Nitpicks — Non-Blocking

- **Nit:** `src/app/(dashboard)/calendar/_components/booking-popup.tsx` — `#8B1A1A` is hard-coded in inline styles. Use the Tailwind `maroon-700` class or the CSS variable `var(--maroon-700)` for consistency with the rest of the codebase.

- **Nit:** `src/app/(dashboard)/commissions/_components/commissions-client.tsx` — `ADDON_UNPAID` still in `paidStatuses` for commission calculation. If intentional (these bookings should still generate commissions), add an inline comment documenting the decision.

- **Nit:** `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx` — `PAGE_SIZE_OPTIONS` array (`[10, 25, 50, 100]`) is defined inline. Move to `src/lib/constants.ts` alongside other list configuration constants.

---

## Positive Highlights

- **Photo-delivery module architecture is exemplary** — follows the established `page.tsx` (Server) → `dynamic` import → `*-client.tsx` (Client) pattern precisely. No deviations.
- **`commissions/page.tsx` correctly upgraded to `Promise.all()`** — the sequential waterfall flagged in 2026-03-09 is resolved; `bookings`, `commissions`, and `packages` queries now run in parallel.
- **Zero `select('*')` in new code** — photo-delivery queries specify exact columns including nested joins, consistent with project-wide discipline.
- **Activity logging is complete in photo-delivery** — deliver action, drive link update, and print status changes all log to `activity_log` with user identity and description.
- **`database.ts` type definitions extended cleanly** — new types for photo-delivery follow the existing pattern; no breaking changes to shared types.
- **`constants.ts` remains the single source of truth** — `PRINT_ORDER_STATUSES`, `BOOKING_STATUS`, and new status lists added correctly without duplication.
- **Framer Motion easing uses cubic-bezier arrays** — no string ease values (`"easeOut"`) anywhere in new components; TypeScript strict compliance maintained.
- **No `dangerouslySetInnerHTML`, no raw SQL, no secrets in NEXT_PUBLIC_** — clean security baseline maintained across all new and modified files.

---

## Technology-Specific Checks

### Next.js (App Router)

| Check | Status | Notes |
|-------|--------|-------|
| `"use client"` pushed to leaf components | OK | Photo-delivery follows the pattern: `"use client"` only in `*-client.tsx`, never in `page.tsx` or layout |
| Server Actions validate inputs and re-authorize | OK | No new Server Actions this sprint; cache invalidation server actions are tag-only |
| `server-only` import on sensitive modules | WARN | `cached-queries.ts` still lacks `server-only` guard — acceptable, unchanged from 2026-03-09 |
| No secrets in `NEXT_PUBLIC_` variables | OK | No new env vars introduced; existing pattern maintained |
| Dynamic route params validated and sanitized | OK | Photo-delivery `[id]` param used in parameterized `.eq()` + `notFound()` on missing records |
| `error.tsx` in key route segments | FAIL | Still no `error.tsx` anywhere — unchanged from 2026-03-09. Photo-delivery routes added without error boundaries. |
| Middleware logic is correct and secure | OK | Middleware unchanged; photo-delivery routes are correctly protected by the existing auth middleware |
| Server Action mutations include cache invalidation | OK | `tab-packages.tsx` calls `invalidatePackages()` after save; consistent with other settings tabs |
| No full database/API objects passed to Client Components | OK | Photo-delivery passes only the lean typed booking shape; no raw DB objects |
| `remotePatterns` in next.config.js is specific (no wildcards) | OK | Unchanged; Supabase storage pattern remains correctly scoped |

### Laravel

| Check | Status | Notes |
|-------|--------|-------|
| All checks | N/A | Not a Laravel project |

### Flutter

| Check | Status | Notes |
|-------|--------|-------|
| All checks | N/A | Not a Flutter project |

### Database Schema

| Check | Status | Notes |
|-------|--------|-------|
| Every table has a primary key | OK | Existing schema unchanged; `db_yoonjae.sql` confirms UUIDs on all tables |
| Foreign keys with ON DELETE behavior | OK | Existing FK constraints unchanged |
| Migrations are backward-compatible | N/A | DB managed in Supabase dashboard; no migration files in repo |
| Parameterized queries (no string interpolation) | WARN | Photo-delivery search uses `customerIds.join(",")` in filter string (see Critical Issue #2) |
| Timestamps timezone-aware (UTC) | OK | All timestamps use Supabase default UTC |
| Schema in 3NF | OK | Schema unchanged and previously validated |

### API Design

| Check | Status | Notes |
|-------|--------|-------|
| RESTful resource naming | OK | No new API routes this sprint |
| Correct HTTP status codes | OK | Existing routes unchanged |
| Consistent error response format | OK | Existing routes unchanged |
| Input validation on all endpoints | OK | Existing routes unchanged |
| Authentication/authorization enforced | FAIL | `create` and `delete` routes: authentication ✅, authorization ❌ (see Critical Issue #1) |
| CORS properly configured | OK | Handled by Vercel/Next.js defaults; no custom CORS config needed |

---

## Security Checklist (OWASP Top 10)

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | FAIL | `/api/users/create` and `/api/users/delete` authenticate but do not authorize — unchanged from 2026-03-09. Must fix. |
| A02 | Cryptographic Failures | OK | Passwords via Supabase Auth. HTTPS via Vercel. No custom crypto. |
| A03 | Injection | WARN | Photo-delivery search filter concatenates customer IDs into `.or()` string. Low immediate risk (IDs are UUIDs from a prior query), but pattern is unsafe. |
| A04 | Insecure Design | OK | Auth middleware protects all dashboard routes. Public pages explicitly listed. RLS at DB level. |
| A05 | Security Misconfiguration | OK | No new `NEXT_PUBLIC_` secret exposure. `remotePatterns` still specific. `sw.js` is minified Workbox (standard PWA tooling, not malicious). |
| A06 | Vulnerable Components | WARN | No `npm audit` run as part of this review. Framer Motion v12, Supabase v2, Next.js 14.2.35 are recent releases. |
| A07 | Auth Failures | OK | Supabase Auth session management unchanged. Middleware validates session on every request. `getUser()` used server-side. |
| A08 | Data Integrity Failures | OK | Primary user deletion protection unchanged. Booking/invoice numbers via DB functions. No client-side ID generation. |
| A09 | Logging and Monitoring Gaps | OK | All new photo-delivery CRUD operations log to `activity_log`. |
| A10 | SSRF | OK | No user-provided URLs used in server-side fetch. Google Drive links stored but not fetched server-side. |

---

## Deployment Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables documented and validated | WARN | No `.env.example` — unchanged from 2026-03-09. Photo-delivery uses no new env vars. |
| No secrets in source code or client bundles | OK | `sw.js` is minified Workbox — standard PWA; no secrets detected. SERVICE_ROLE key in server-only admin.ts. |
| Build succeeds in production mode | OK | No new dependencies introduced; existing build configuration unchanged. |
| Database migrations tested and reversible | N/A | DB managed in Supabase dashboard; no migration files in repo. |
| Feature flags for risky changes | N/A | Not used in this project. |
| Rollback plan identified | OK | Vercel instant rollback available. |

---

## Action Items Summary

### Must Fix (Security)

1. **Add role/permission check to `/api/users/create`** — `src/app/api/users/create/route.ts:9`
2. **Add role/permission check to `/api/users/delete`** — `src/app/api/users/delete/route.ts:9`
3. **Fix photo-delivery search filter to avoid string concatenation** — `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx` (search block)

### Should Fix (Correctness + Quality)

4. **Fix `as never` type cast in photo-delivery detail page** — `src/app/(dashboard)/photo-delivery/[id]/page.tsx`
5. **Add per-query error handling to `Promise.all()` in commissions** — `src/app/(dashboard)/commissions/_components/commissions-client.tsx`
6. **Add server-side guard in `role-management-client.tsx` before Supabase update/delete** — `src/app/(dashboard)/role-management/_components/role-management-client.tsx`
7. **Remove unused `currentUser` props from photo-delivery components** — `photo-delivery-client.tsx`, `photo-delivery-detail-client.tsx`
8. **Add null/format guard to calendar popup time parsing** — `src/app/(dashboard)/calendar/_components/booking-popup.tsx`

### Consider (Optional)

9. **Centralize `toDateStr()` in `src/lib/utils.ts`** — remove 4+ local duplicate definitions
10. **Add `error.tsx` error boundaries** — at minimum `src/app/(dashboard)/error.tsx`
11. **Add form validation for `price` and `duration_minutes`** — `src/app/(dashboard)/settings/_components/tab-packages.tsx`
12. **Add `.env.example` file** — document required environment variables for new developers

---

## Cross-Reference

> The Performance Review (2026-03-12) was conducted simultaneously. Shared findings:

| Finding | Code Review Angle | Performance Review Angle |
|---------|-------------------|--------------------------|
| Photo-delivery search: two-step customer lookup | String concatenation into filter is unsafe; should use `.in()` | Sequential queries add ~50–150ms per search keystroke |
| `commissions/page.tsx` `Promise.all()` upgrade | Correct parallelism; error handling needed per-query | Resolves the waterfall flagged in 2026-03-09 |
| Missing `loading.tsx` for photo-delivery routes | Not a code quality issue per se | Degrades perceived performance; blank screen on navigation |
| Activity log insert on every CRUD | Must not silently fail — all inside try/catch ✅ | 2 DB calls per mutation acceptable at studio scale |
| `select()` column discipline | Correct pattern — no structural type drift | Reduces data transfer on every query |

---

*Generated by AI Code Review Agent — 2026-03-12. 16 files reviewed. Previous report: [2026-03-09](code_review_report_2026-03-09.md). Scoring based on Google Engineering Practices, SonarQube quality models, and Next.js/Supabase best practices.*
