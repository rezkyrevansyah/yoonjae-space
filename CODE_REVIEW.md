# Backend Code Review — Yoonjaespace
_Reviewed: April 2026_

---

## Ringkasan

Codebase ini sudah punya **arsitektur yang solid** dan beberapa keputusan yang sangat baik: caching layer dengan `unstable_cache` + `React.cache()`, parallel fetching di hampir semua halaman, pemisahan `createAdminClient` vs `createClient` yang benar, dan auth guard berlapis (middleware + page-level). Beberapa hal perlu diperbaiki terutama di area **keamanan mutasi client-side**, **atomicity** pada operasi kompleks, dan **kebersihan kode** seperti duplikasi tipe dan cast `as never`.

---

## 🔴 Critical Issues

### 1. Booking creation tidak atomic — tidak ada rollback

**File:** `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx` — fungsi `handleSubmit`

Proses pembuatan booking dilakukan dalam ~10 langkah insert berurutan dari sisi klien (customer → booking → booking_packages → backgrounds → addons → custom_fields → invoice). **Jika salah satu langkah gagal di tengah jalan, data sebelumnya sudah terlanjur tersimpan** tanpa ada rollback.

Contoh: jika insert `invoices` gagal (langkah 9), booking sudah ada tapi tidak punya invoice → data korup.

**Solusi:** Pindahkan seluruh logika ini ke sebuah **API Route** atau **Database Function (RPC)** di Supabase yang bisa berjalan dalam satu transaksi.

```typescript
// Buat: src/app/api/bookings/create/route.ts
// Jalankan semua insert di server, atau buat satu fungsi RPC di Supabase:
// CREATE OR REPLACE FUNCTION create_full_booking(...) RETURNS uuid AS $$
// BEGIN
//   -- semua insert dalam satu transaksi
// END; $$ LANGUAGE plpgsql;
```

---

### 2. Mutasi sensitif dilakukan langsung dari client dengan anon key

**Files:** `role-management-client.tsx`, `tab-packages.tsx`, `commissions-client.tsx`, `finance-client.tsx`, `bookings-client.tsx`, dll.

Operasi seperti delete role, update package, delete expense, update commission semuanya dilakukan via `createClient()` (anon key) langsung dari browser — **tanpa server-side permission check**. Keamanannya 100% bergantung pada Supabase RLS.

Ini bisa aman jika RLS dikonfigurasi dengan benar, tapi ada dua risiko:
- Jika RLS salah konfigurasi atau ada row yang tidak tercakup policy, data bisa dimanipulasi dari browser DevTools.
- Tidak ada audit trail server-side yang bisa dipercaya — `activity_log` diisi dari client, artinya bisa di-skip atau dipalsukan.

**Solusi prioritas tinggi:** Operasi paling kritis (delete booking, manage roles, manage commissions) sebaiknya dipindah ke API Route dengan auth check eksplisit, seperti yang sudah Anda lakukan untuk `api/users/create` dan `api/users/delete`. Itu sudah contoh yang bagus — tinggal konsisten.

---

### 3. `redirect()` dilakukan SETELAH query berjalan

**Files:** `finance/page.tsx`, `commissions/page.tsx`

```typescript
// commissions/page.tsx — MASALAH:
const { data: settings } = await supabase  // ← query jalan dulu
  .from("settings_general")...

const [currentUser, ...] = await Promise.all([...]);

if (!currentUser) redirect("/login");  // ← baru cek auth
```

Jika user tidak terautentikasi, query ke database tetap dijalankan sebelum redirect. Ini buang resource dan berpotensi error jika RLS tidak mengizinkan query tanpa auth.

**Solusi:**

```typescript
// Cek auth DULU, baru query
const currentUser = await getCurrentUser();
if (!currentUser) redirect("/login");

// Lanjut query lainnya...
const [settings, ...] = await Promise.all([...]);
```

---

## 🟠 High Priority — Performance

### 4. Revenue di dashboard dihitung di JS, bukan di database

**File:** `src/app/(dashboard)/dashboard/page.tsx`

```typescript
// Fetch semua row 'total' dulu:
supabase.from("bookings").select("total").gte(...).lte(...).in("status", PAID_STATUSES)

// Lalu sum di JS:
const estimasiRevenue = (revenueRows ?? []).reduce((sum, r) => sum + r.total, 0);
```

Jika ada ratusan atau ribuan booking per bulan, ini mengirim banyak data yang tidak perlu ke server Next.js hanya untuk dijumlahkan. Gunakan RPC atau aggregate Supabase:

```typescript
// Opsi 1: Supabase aggregate (v2.x sudah support)
const { data } = await supabase
  .from("bookings")
  .select("total.sum()")  // atau gunakan RPC
  .gte("booking_date", monthStart)
  .lte("booking_date", monthEnd)
  .in("status", PAID_STATUSES);
```

---

### 5. `settings_general` di CommissionsPage tidak ikut dalam `Promise.all`

**File:** `src/app/(dashboard)/commissions/page.tsx`

```typescript
// Ini sequential — tunggu settings dulu, baru Promise.all
const { data: settings } = await supabase.from("settings_general").select(...);
const cutoffDay = settings?.commission_cutoff_day ?? 26;
const period = getPeriodRange(month, year, cutoffDay);

const [currentUser, staffUsers, bookingsResult, ...] = await Promise.all([...]);
```

`settings_general` seharusnya masuk `cached-queries.ts` (sudah ada `getCachedSettingsGeneral`) lalu di-fetch bersama query lain. Ini menambah satu round-trip sequential yang tidak perlu.

```typescript
// Solusi: gunakan cache yang sudah ada
import { getCachedSettingsGeneral } from "@/lib/cached-queries";

const [currentUser, settings, staffUsers, bookingsResult, ...] = await Promise.all([
  getCurrentUser(),
  getCachedSettingsGeneral(),  // ← sudah ada!
  ...
]);
const cutoffDay = settings?.commission_cutoff_day ?? 26;
```

---

### 6. Finance page filter income berdasarkan `created_at`, bukan `booking_date`

**File:** `src/app/(dashboard)/finance/page.tsx`

```typescript
supabase.from("bookings")
  .select("...")
  .gte("created_at", `${startDate}T00:00:00`)  // ← created_at
  .lte("created_at", `${endDate}T23:59:59`)
```

Dashboard menggunakan `booking_date` untuk filter bulan yang sama. Finance menggunakan `created_at`. Ini menyebabkan angka antara Dashboard dan Finance bisa berbeda untuk booking yang dibuat di bulan lain tapi jadwalnya bulan ini (atau sebaliknya). Tentukan definisi yang konsisten — kemungkinan besar `booking_date` yang lebih tepat untuk laporan keuangan berdasarkan jadwal.

---

### 7. Module-level `supabase` client dibuat ulang di setiap file

**16+ file client component** menggunakan pola:

```typescript
// Di level module, di luar komponen
const supabase = createClient();
```

`createBrowserClient` dari `@supabase/ssr` sebenarnya sudah mengembalikan singleton, jadi ini tidak menyebabkan multiple instance. Namun pola yang lebih rapi dan eksplisit adalah inisialisasi di dalam komponen atau di satu shared module:

```typescript
// src/lib/supabase-browser.ts
import { createClient } from "@/utils/supabase/client";
export const supabaseBrowser = createClient();
```

Lalu import dari satu tempat di semua komponen.

---

## 🟡 Medium Priority — Code Quality & Maintainability

### 8. `BookingStatus` type didefinisikan dua kali

**Files:** `src/lib/types/database.ts` dan `src/lib/constants.ts`

```typescript
// Di database.ts:
export type BookingStatus = "BOOKED" | "DP_PAID" | "PAID" | ...;

// Di constants.ts:
export type BookingStatus = keyof typeof BOOKING_STATUS;
```

Dua tipe yang sama nama tapi dari file berbeda. Beberapa file import dari `database.ts`, beberapa dari `constants.ts`. Ini rawan mismatch jika salah satu diupdate. **Pilih satu sumber kebenaran** — idealnya `constants.ts` karena sudah punya `BOOKING_STATUS` object, lalu hapus dari `database.ts` dan re-export:

```typescript
// database.ts
export type { BookingStatus } from "@/lib/constants";
```

---

### 9. `as never` dan `as unknown as X` tersebar di 30+ lokasi

Hampir semua hasil query Supabase di-cast dengan `as never` atau `as unknown as BookingRow[]`. Ini karena Supabase tidak otomatis generate types dari schema.

**Solusi jangka panjang:** Generate TypeScript types dari Supabase schema menggunakan Supabase CLI:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts
```

Ini akan memberikan tipe yang presisi untuk semua tabel dan query, menghilangkan kebutuhan manual cast.

---

### 10. Logika `getCurrentUser` diduplikasi di dua tempat

**Files:** `src/lib/get-current-user.ts` (server) dan `src/hooks/use-current-user.ts` (client)

Keduanya melakukan query identik: `auth.getUser()` → query `users` table → map roles. Logika mapping roles khususnya (handle array vs object) harus dijaga konsistensinya di dua tempat.

Pertimbangkan membuat satu helper untuk mapping roles:

```typescript
// src/lib/map-user-role.ts
export function mapRoleData(rolesData: unknown): { name: string; menu_access: string[] } | null {
  const role = (Array.isArray(rolesData) ? rolesData[0] : rolesData) as {...} | null;
  return role;
}
```

---

### 11. `cache-invalidation.ts` bisa diringkas

14 fungsi yang masing-masing hanya satu baris `revalidateTag(CACHE_TAGS.X)`. Bisa disederhanakan:

```typescript
// Buat factory function:
function makeInvalidator(tag: string) {
  return async function() {
    "use server";
    revalidateTag(tag);
  };
}

export const invalidatePackages = makeInvalidator(CACHE_TAGS.PACKAGES);
export const invalidateBackgrounds = makeInvalidator(CACHE_TAGS.BACKGROUNDS);
// dst.
```

Atau cukup export satu fungsi generic yang menerima tag name, lalu panggil dari setiap komponen.

---

### 12. `params` di dynamic pages belum typed sebagai `Promise` (Next.js 15 warning)

**Files:** `bookings/[id]/page.tsx`, `customers/[id]/page.tsx`, `photo-delivery/[id]/page.tsx`, dll.

```typescript
// Sekarang (Next.js 14 style):
export default async function Page({ params }: { params: { id: string } })

// Next.js 15+ membutuhkan:
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
```

Karena masih Next.js 14.2 ini belum breaking, tapi perlu disiapkan sebelum upgrade.

---

## ✅ Yang Sudah Bagus

- **Auth berlapis**: middleware redirect + page-level `getCurrentUser()` guard sudah benar di semua halaman dashboard.
- **React.cache() + unstable_cache combo**: Pattern di `cached-queries.ts` sudah sangat tepat — deduplicates per-request (React.cache) sekaligus persist cross-request (unstable_cache). Komentar penjelasannya pun bagus.
- **Admin client hanya di server**: `createAdminClient()` (service_role key) hanya digunakan di `api/` routes dan `lib/cached-queries.ts` — tidak pernah di client component. `SUPABASE_SERVICE_ROLE_KEY` juga tidak punya prefix `NEXT_PUBLIC_`. Ini benar.
- **API Routes untuk user management**: `/api/users/create` dan `/api/users/delete` sudah punya double auth check (autentikasi + permission) sebelum aksi dilakukan. Ini contoh pattern yang perlu direplikasi untuk operasi sensitif lainnya.
- **Parallel fetching**: `Promise.all()` sudah dipakai konsisten di hampir semua page — bagus.
- **Lean select**: Query Supabase hampir semua sudah spesifik kolom yang dibutuhkan, tidak `select('*')`. Bagus untuk performa.
- **WIB timezone handling**: `dashboard/page.tsx` sudah handle timezone dengan benar menggunakan UTC offset manual. Komentar juga jelas.
- **Type definitions**: `src/lib/types/database.ts` lengkap dan well-organized dengan interface untuk semua entitas.
- **Cache invalidation**: Setiap mutasi di settings/master data sudah diikuti `revalidateTag` yang sesuai.

---

## Prioritas Perbaikan

| # | Issue | Dampak | Effort |
|---|-------|--------|--------|
| 1 | Booking creation tidak atomic | Data korup jika gagal di tengah | Medium |
| 2 | Redirect setelah query (commissions, finance) | Waste resource + potential error | Rendah |
| 3 | `settings_general` sequential di commissions | +1 round-trip per load | Rendah |
| 4 | Revenue sum di JS (dashboard) | Lambat jika data besar | Rendah |
| 5 | Inkonsistensi filter `created_at` vs `booking_date` di finance | Data tidak akurat | Rendah |
| 6 | Duplikasi `BookingStatus` type | Rawan mismatch | Rendah |
| 7 | `as never` / unsafe cast | Hilangkan type safety | Medium (butuh Supabase CLI) |
| 8 | Supabase generated types | Type safety menyeluruh | Medium |
