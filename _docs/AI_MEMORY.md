# Yoonjaespace Project Memory

## Project Status
- **Completed Steps**: Settings (all 10 tabs), Role Management (+ Edit), User Management, Bookings (List, Create, Detail)
- **Next Step**: STEP 6 — Customer/Invoice public pages → Calendar → Customers
- Build always passes (warnings only from react-hooks/exhaustive-deps, already downgraded to warn)

## Tech Stack
- Next.js 14 (App Router), TypeScript strict, Tailwind CSS
- ShadCN UI (all components manually written, NOT via shadcn CLI)
- @supabase/ssr + @supabase/supabase-js
- Framer Motion, Lucide React, react-hook-form + zod
- react-day-picker v9 (uses `Chevron` component, NOT `IconLeft`/`IconRight`)

## Key Patterns
- Supabase roles join returns array type from TS perspective → cast via `as unknown` then handle array/object
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not anon key) used in browser/server clients
- Dashboard layout fetches user + studio info server-side and passes as prop to Sidebar/Header
- Middleware at `src/middleware.ts` protects all non-public routes
- Every CRUD → log to `activity_log` table
- RLS policies already added for all tables in Supabase SQL Editor

## File Structure
```
src/
  app/
    (auth)/login/                          ← server component, fetches logo from DB
    (auth)/login/_components/login-client.tsx  ← client form
    (dashboard)/layout.tsx                 ← fetches user + studio logo in parallel
    (dashboard)/settings/_components/      ← 9 tab components
    (dashboard)/role-management/_components/role-management-client.tsx
    (dashboard)/user-management/_components/user-management-client.tsx
    api/users/create/route.ts              ← admin client, creates Supabase Auth + users row
    api/users/delete/route.ts              ← admin client, deletes both
    (public)/customer/[bookingId]/
    (public)/invoice/[bookingId]/
    (public)/mua/
  components/
    ui/                     ← all ShadCN components
    layout/                 ← sidebar.tsx, header.tsx, mobile-nav.tsx (all support logoUrl + studioName)
  lib/
    types/database.ts       ← all TypeScript types
    utils.ts                ← cn, formatRupiah, formatDate, generateTimeSlots
    constants.ts            ← BOOKING_STATUS, PRINT_ORDER_STATUS, MENU_ITEMS
  hooks/
    use-current-user.ts
    use-toast.ts
  utils/supabase/           ← client.ts, server.ts, middleware.ts, admin.ts
  middleware.ts             ← Next.js auth middleware
```

## Important Fixes Applied
- `public/` folder created (was missing, caused 500 errors)
- `next.config.mjs` has `remotePatterns` for Supabase storage hostname
- `.eslintrc.json` downgrades `react-hooks/exhaustive-deps` to warning
- Lucide icons don't accept `title` prop — remove if added
- Sidebar/login logo now dynamic from `settings_studio_info.logo_url`
- UserRow interface exported from user-management-client.tsx (not from database.ts)

## Color Theme
- Primary: `bg-maroon-700` = #8B1A1A, hover: `bg-maroon-600` = #B22222
- Accent bg: `bg-maroon-50` = #FEF2F2
- CSS vars set in globals.css for ShadCN compatibility

## Development Order (from CLAUDE.md)
Settings ✅ → Role & User Mgmt ✅ → Bookings ✅ → **Customer/Invoice** → Calendar → Customers → Reminders → Finance → Vendors → Commissions → Activities → Dashboard

## Supabase Info
- Project URL: https://ihjjojscswntqmakacas.supabase.co
- Uses PUBLISHABLE key (not anon), SERVICE_ROLE key only in admin.ts
- Storage bucket: `images-yoonjae`
- DB helper functions: `generate_booking_number()`, `generate_invoice_number()`

## Notes
- Keep Next.js 14 (not 15) — breaking changes not worth it mid-development
- Skills at `.claude/skills/page-*/SKILL.md` — always read before each module
