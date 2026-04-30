# Code Review — `main` branch

**Repository:** `rezkyrevansyah/yoonjae-space`  
**Latest commit:** `c0d5e13` — "feat: polish dashboard booking finance and settings flows"  
**Review date:** 2026-04-30  
**Scope:** Architecture, security, API routes, Supabase clients, caching layer, middleware, public pages.

---

## Overview

This is a Next.js 14 App Router studio management app (Yoonjaespace) using Supabase for auth/DB, TypeScript, Tailwind, and ShadCN. The codebase is well-structured overall. Recent work focused on security hardening (IDOR fix via `public_token`, file upload validation, RLS corrections). Architecture decisions — two-layer caching (`React.cache` + `unstable_cache`), lean selects, activity logging — are solid.

---

## 🔴 Critical Issues

### 1. `/api/mua-bookings` uses `createAdminClient()` on a public endpoint

**File:** `src/app/api/mua-bookings/route.ts:14`

```ts
const supabase = createAdminClient(); // bypasses ALL RLS
```

This is the most serious issue. A commit (`18e4d8c`) was supposed to switch this to the anon/publishable key but a subsequent commit (`ea7ce86`) restored the admin client with the comment *"bypass RLS policies for public endpoints"* — which is the wrong approach. RLS should be the access control for public endpoints, not bypassed. Any anonymous internet user can query this endpoint for a date range and get all non-cancelled bookings including customer names.

**Fix:** Replace `createAdminClient()` with `createPublicClient()` (which already exists in `src/utils/supabase/public.ts`) and configure a proper RLS policy that restricts what the anon role can see on the `bookings` table.

---

### 2. No validation on `from`/`to` date params in `mua-bookings`

**File:** `src/app/api/mua-bookings/route.ts:7-10`

The raw string params are passed directly to `.gte()` / `.lte()`. A caller can send `from=1900-01-01&to=9999-12-31` to scrape all historical bookings. At minimum, validate ISO date format and enforce a max range (e.g., 3 months).

---

## 🟡 Medium Issues

### 3. Auth/permission check is duplicated in every API route

**Files:** `src/app/api/users/create/route.ts`, `src/app/api/users/delete/route.ts`

Both routes have ~15 lines of identical auth + role permission check logic. When new API routes are added the same pattern will be copy-pasted, and a bug in one copy won't be fixed in others.

**Fix:** Extract into a shared helper:

```ts
// src/lib/api-auth.ts
export async function requirePermission(permission: string): Promise<{ caller: CallerData } | Response>
```

---

### 4. API routes return `307 redirect` instead of `401` for unauthenticated requests

**File:** `src/utils/supabase/middleware.ts:29-31`

The middleware matcher covers `/api/*` routes. When an unauthenticated request hits `/api/users/create`, the middleware's `!user && !isPublic` check fires and returns a `307 → /login` HTML redirect — not a JSON `401`. API consumers (fetch calls from the client) receive a redirect to an HTML page instead of an error response.

**Fix:** Add `/api` to the middleware public route exclusion:

```ts
const isPublic = publicRoutes.some(...) || request.nextUrl.pathname.startsWith("/api");
```

The API routes do their own auth check anyway, so they're still protected.

---

### 5. Middleware comment says "api routes (if any)"

**File:** `src/middleware.ts:8-13`

The comment in the `matcher` config implies API routes are excluded, but they're not. The comment is misleading and could cause confusion when adding new routes.

---

### 6. `any` type casts for Supabase join results

**Files:** `src/app/api/users/create/route.ts`, `src/app/api/users/delete/route.ts`, `src/lib/get-current-user.ts`

Multiple places use `as unknown` + cast for the `roles` join result:

```ts
const callerRolesData = callerData?.roles as unknown;
const callerRole = (Array.isArray(...) ? ...[0] : ...) as { name: string; menu_access: string[] } | null;
```

This pattern appears in at least 3 files. The proper fix is to type Supabase responses using generated types (`supabase gen types`). This is a type-safety gap — if the DB schema changes, TypeScript won't catch it.

---

### 7. No rate limiting on sensitive API routes

**File:** `src/app/api/users/create/route.ts`

`/api/users/create` creates Supabase Auth users. Without rate limiting, this is an account creation abuse vector. Consider adding `@upstash/ratelimit` or a simple in-memory guard for production.

---

## 🟡 Architecture Notes

### 8. `cached-queries.ts` uses admin client for shared cache — future risk

**File:** `src/lib/cached-queries.ts:22-26`

The comment correctly explains *why* admin client is used inside `unstable_cache` (can't call `cookies()` inside). This is a valid pattern for truly shared/public master data. However, `_getCachedActiveUsers` caches `users` table data (names + emails) this way — shared across all requests. If this data ever becomes per-user-scoped, the sharing would be a privacy leak. Worth a note in the code.

---

### 9. `logo.png` (5MB) stored inside `src/app/(public)/`

**File:** `src/app/(public)/logo.png`

A 5MB image committed directly to the source tree bloats the repo and won't benefit fully from Next.js's image optimization pipeline. It should be in `public/` (static serving) or Supabase Storage (with a URL stored in settings).

---

## ✅ What's Done Well

- **IDOR fix with `public_token`** — replacing internal booking UUIDs in public URLs is the right approach.
- **Two-layer caching** (`React.cache` + `unstable_cache`) with proper tag-based invalidation is well-implemented.
- **Lean Supabase selects** — no `select('*')` anywhere; all queries name explicit columns.
- **Auth rollback in user creation** — if the DB insert fails after auth user creation, the auth user is deleted. Good defensive pattern.
- **Activity logging** — every CRUD mutation logs to `activity_log`. Consistent.
- **Dashboard layout** — double redirect guard (middleware + layout-level `redirect("/login")`) is belt-and-suspenders.
- **File upload validation** — restricting to JPEG/PNG/WebP/GIF with 5MB cap is appropriate.
- **`public_token` for customer/invoice pages** — `/customer/[token]` and `/invoice/[token]` no longer expose internal UUIDs.

---

## Summary of Action Items (Priority Order)

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Switch `mua-bookings` from `createAdminClient` to `createPublicClient` + add RLS policy | 🔴 Critical | `src/app/api/mua-bookings/route.ts` |
| 2 | Validate & clamp `from`/`to` date range in `mua-bookings` | 🔴 Critical | `src/app/api/mua-bookings/route.ts` |
| 3 | Extract auth/permission check into shared helper | 🟡 Medium | `src/app/api/users/*/route.ts` |
| 4 | Exclude `/api` from middleware redirect (return 401 not 307) | 🟡 Medium | `src/utils/supabase/middleware.ts` |
| 5 | Fix Supabase join typing (use generated types) | 🟡 Medium | Multiple files |
| 6 | Add rate limiting to `/api/users/create` | 🟡 Medium | `src/app/api/users/create/route.ts` |
| 7 | Move `logo.png` out of source tree | 🟢 Minor | `src/app/(public)/logo.png` |

> **Most urgent:** Item 1 — the admin client on a public API route means all booking data is publicly readable today.
