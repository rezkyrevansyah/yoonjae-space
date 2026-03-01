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
- `src/app/customer/` — Public customer page (no auth)
- `src/app/invoice/` — Public invoice page (no auth)
- `src/app/mua/` — Public MUA calendar (no auth)
- `src/components/ui/` — ShadCN components
- `src/components/layout/` — Sidebar, header, mobile nav
- `src/utils/supabase/` — client.ts, server.ts, middleware.ts, admin.ts
- `src/types/` — TypeScript type definitions
- `src/hooks/` — Custom hooks

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
- Baca `.claude/skills/project-context/SKILL.md` untuk database schema dan business logic
- Baca `.claude/skills/supabase-patterns/SKILL.md` untuk pattern koneksi Supabase
- Baca skill per halaman di `.claude/skills/page-*/SKILL.md` saat mengerjakan modul tertentu

## Development Order
Settings → Role & User Mgmt → Bookings → Customer/Invoice → Calendar → Customers → Reminders → Finance → Vendors → Commissions → Activities → Dashboard
