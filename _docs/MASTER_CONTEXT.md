# Yoonjaespace Studio Management — Master Context Document

> **Tujuan dokumen ini**: Di-paste di awal setiap sesi prompting ke AI agent agar konteks proyek selalu terjaga meskipun dikerjakan step-by-step per modul.

---

## 1. Project Overview

Yoonjaespace adalah dashboard web app untuk mengelola operasional studio foto. Digunakan oleh owner dan staff yang **mayoritas mengakses via handphone**, sehingga tampilan mobile-first dan performa cepat menjadi prioritas utama.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + ShadCN UI |
| Animation | Framer Motion |
| Database & Auth | Supabase (JS client, NO Prisma) |
| Storage | Supabase Storage (bucket: `images-yoonjae`) |
| Deployment | Vercel |

**Koneksi DB**: Langsung via `@supabase/supabase-js` — tidak pakai API routes untuk CRUD kecuali untuk operasi sensitif (user management). Prioritas: kecepatan akses data.

---

## 3. Architecture Decisions

### Performance Strategy
- **Server Components** untuk initial page load (SSR fetch data)
- **Client Components** hanya untuk interactive elements
- **Parallel queries** — fetch multiple tables sekaligus dengan `Promise.all()`
- **Lean selects** — hanya select kolom yang dibutuhkan, hindari `select('*')`
- **Optimistic UI updates** — UI update dulu, sync ke DB di background
- **SWR/React Query** — client-side caching & revalidation

### Design Theme
- Light theme with red maroon accent (dari brand Yoonjaespace — logo merah metalik/maroon)
- Primary: #8B1A1A (deep red/maroon)
- Primary hover: #B22222 (firebrick)
- Primary light bg: #FEF2F2 (red-50)
- Accent: #DC2626 (badges/alerts)
- Background: #FFFFFF, Surface: #F9FAFB, Border: #E5E7EB
- Text: #111827 (primary), #6B7280 (secondary)
- Clean, modern, minimal — mobile-first

### Storage Strategy (Logo & Foto Studio)
- Path fixed: `studio/logo` dan `studio/front-photo`
- Upload pakai `upsert: true` agar file lama otomatis terganti
- Cache busting: append `?t={timestamp}` di URL

### Auth Strategy
- Supabase Auth untuk login (email + password)
- App-level `users` table linked ke `auth.users` via `auth_id`
- Role-based access control via `roles` table + `menu_access` JSON
- Middleware check auth di semua routes kecuali Customer Page & Invoice

---

## 4. Page List & Dependencies

| # | Page | Route | Depends On |
|---|------|-------|------------|
| 1 | Login | `/login` | Auth |
| 2 | Dashboard | `/dashboard` | Bookings, Settings |
| 3 | Bookings List | `/bookings` | Bookings |
| 4 | Create Booking | `/bookings/new` | Settings (packages, backgrounds, addons, custom fields, leads, photo_for, holidays, time slots), Customers |
| 5 | Booking Detail | `/bookings/[id]` | Bookings, Customers, Packages, Addons |
| 6 | Customer Page (public) | `/customer/[bookingId]` | Bookings, Studio Info, Settings |
| 7 | Invoice Page | `/invoice/[bookingId]` | Bookings, Studio Info |
| 8 | Calendar | `/calendar` | Bookings |
| 9 | MUA Page (public) | `/mua` | Bookings (filtered: has MUA addon) |
| 10 | Customers | `/customers` | Customers, Bookings |
| 11 | Reminders | `/reminders` | Bookings, Reminder Templates |
| 12 | Finance | `/finance` | Bookings, Expenses, Vendors, Packages |
| 13 | Vendors | `/vendors` | Vendors, Expenses |
| 14 | Commissions | `/commissions` | Users, Bookings, Expenses |
| 15 | Activities | `/activities` | Activity Log |
| 16 | User Management | `/user-management` | Users, Roles, Auth |
| 17 | Role Management | `/role-management` | Roles |
| 18 | Settings | `/settings` | All settings tables |

---

## 5. Database Schema Summary

### Settings / Config
- `settings_general` — singleton: open/close time, payment default, time slot interval
- `studio_holidays` — multi-row: tanggal libur studio
- `settings_studio_info` — singleton: nama, alamat, kontak, logo, foto studio
- `settings_reminder_templates` — singleton: 3 template WhatsApp message
- `packages` — CRUD: paket foto
- `backgrounds` — CRUD: pilihan background
- `addons` — CRUD: add-on layanan
- `vouchers` — CRUD: voucher diskon
- `custom_fields` — CRUD: dynamic form fields
- `leads` — CRUD: sumber customer
- `photo_for` — CRUD: tipe foto

### User & Auth
- `roles` — role + menu_access (JSON array of slugs)
- `users` — linked to auth.users, has role_id

### Core Business
- `customers` — identified by unique phone number
- `bookings` — main entity, linked to customer, package, staff
- `booking_backgrounds` — many-to-many
- `booking_addons` — with price snapshot, paid status, extra flag
- `booking_custom_fields` — dynamic field values
- `invoices` — metadata (render is frontend)

### Finance
- `expenses` — manual entries + auto from commissions
- `commissions` — per staff per period (26th-25th cycle)

### Support
- `booking_reminders` — tracking reminder sends
- `activity_log` — system-wide audit trail

---

## 6. Key Business Logic

### Booking Status Flow
```
BOOKED → PAID → SHOOT_DONE → PHOTOS_DELIVERED → ADDON_UNPAID → CLOSED → CANCELED
```
- If Settings `default_payment_status` = 'paid', new booking starts at PAID
- ADDON_UNPAID triggered when extra addon added but not paid
- CANCELED can happen from any status

### Print Order Status (sub-flow)
```
SELECTION → VENDOR → PRINTING → RECEIVE → PACKING → SHIPPED → DONE
```
- Activated via "Start Print" button at SHOOT_DONE
- Visible on Customer Page in real-time

### Commission Period
- Calculated from 26th of current month to 25th of next month
- When marked as paid → auto-create expense in Finance

### Time Slot Logic
- Available slots = open_time to close_time, step = time_slot_interval
- Holiday dates from studio_holidays → show alert, block booking
- End time auto-calculated: start_time + package.duration_minutes + extra_time

### Customer Identification
- Phone number is unique identifier
- Duplicate phone check on both Create Booking and Add Customer

### Reminder Templates
- Support variables: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}
- Open WhatsApp with pre-filled message via `wa.me` API

---

## 7. Mobile-First Priorities

- All layouts must work well on 375px+ width
- Tables → responsive cards on mobile
- Bottom navigation or collapsible sidebar on mobile
- Touch-friendly buttons (min 44px tap targets)
- Minimal loading states — use skeleton loaders
- Pull-to-refresh where appropriate

---

## 8. Development Order

1. Project Setup + Layout + Sidebar + Auth
2. Settings Page (all tabs) — foundation for everything
3. Role & User Management
4. Bookings (Create + List + Detail + Status management)
5. Customer Page + Invoice (public)
6. Calendar + MUA Page
7. Customers Page
8. Reminders
9. Finance
10. Commissions
11. Activities
12. Dashboard (aggregation)

---

## 9. Prompting Strategy

Saat prompting ke AI agent per modul:

1. **Selalu paste dokumen ini** sebagai context awal
2. **Sertakan use case detail** untuk modul yang sedang dikerjakan (dari dokumen penjelasan)
3. **Sertakan referensi desain** (screenshot) jika ada
4. **Sebutkan tabel DB** yang relevan untuk modul tersebut
5. **Sebutkan relasi** ke modul lain yang sudah/belum diimplementasi

Contoh prompt:
```
[Paste Master Context]

Sekarang kerjakan modul: Create New Booking Page

Tabel yang dipakai: bookings, booking_backgrounds, booking_addons, booking_custom_fields, customers, packages, backgrounds, addons, vouchers, custom_fields, leads, photo_for, settings_general, studio_holidays

Use case detail:
[Paste bagian Create New Booking dari dokumen penjelasan]

Referensi desain:
[Attach screenshot]

Yang sudah diimplementasi: Settings Page, Auth, Layout

Catatan: Pastikan mobile-first, performa cepat, dan validasi phone number unique.
```
