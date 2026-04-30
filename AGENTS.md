# Yoonjaespace Studio Management

## Quick Facts
- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, Supabase JS
- **Database**: Supabase (PostgreSQL) — NO Prisma, direct @supabase/ssr + @supabase/supabase-js
- **Storage**: Supabase Storage bucket `images-yoonjae`
- **Auth**: Supabase Auth (email + password)
- **Deploy**: Vercel
- **Theme**: Light, red maroon accent (#8B1A1A). Mobile-first.

## Key Directories
- `src/app/(auth)/` — Login page
- `src/app/(dashboard)/` — All authenticated pages with sidebar layout
- `src/app/(public)/customer/` — Public customer page (no auth)
- `src/app/(public)/invoice/` — Public invoice page (no auth)
- `src/app/(public)/mua/` — Public MUA calendar (no auth)
- `src/components/ui/` — ShadCN components
- `src/components/layout/` — Sidebar, header, mobile nav
- `src/utils/supabase/` — client.ts, server.ts, middleware.ts, admin.ts
- `src/lib/types/database.ts` — TypeScript type definitions
- `src/lib/utils.ts` — Utility functions (cn, formatRupiah, formatDate, etc.)
- `src/lib/constants.ts` — BOOKING_STATUS, PRINT_ORDER_STATUS, MENU_ITEMS
- `src/hooks/` — Custom hooks (use-current-user, use-toast)
- `src/middleware.ts` — Next.js middleware for auth protection

## Commands
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run lint` — Run linter

## Code Style
- TypeScript strict mode
- Prefer `interface` over `type` for objects
- Use Server Components by default, Client Components only for interactivity
- All Supabase queries use lean selects (never `select('*')` without reason)
- Format currency as Rupiah: `Rp xxx.xxx`
- Every CRUD operation must log to `activity_log` table

## Skills
Untuk konteks lengkap tentang project ini, database schema, dan instruksi per halaman:
- Baca `.Codex/skills/project-context/SKILL.md` untuk database schema dan business logic
- Baca `.Codex/skills/supabase-patterns/SKILL.md` untuk pattern koneksi Supabase
- Baca skill per halaman di `.Codex/skills/page-*/SKILL.md` saat mengerjakan modul tertentu

## Development Order
Settings → Role & User Mgmt → Bookings → Customer/Invoice → Calendar → Customers → Reminders → Finance → Vendors → Commissions → Activities → Dashboard
