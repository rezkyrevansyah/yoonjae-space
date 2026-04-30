# Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki semua issues dari CODE_REVIEW.md dan FRONTEND_REVIEW.md secara aman dan bertahap tanpa merusak fitur yang sudah berjalan.

**Architecture:** Dibagi 4 fase berdasarkan risiko dan effort — mulai dari quick wins (no-risk UI improvements), lanjut ke correctness fixes (bug/inconsistency), performance improvements, lalu architecture refactor yang lebih besar.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS, ShadCN UI

**Source reviews:** `CODE_REVIEW.md`, `FRONTEND_REVIEW.md`

---

## FASE 1 — Quick Wins (< 1 jam, zero risk)

### Task 1: Install nextjs-toploader — Navigation Progress Bar

**Files:**
- Modify: `src/app/layout.tsx`

> **Impact:** App langsung terasa 2x lebih responsif. Begitu user klik link manapun, langsung ada bar merah tipis di atas.

- [ ] **Step 1: Install package**

```bash
cd D:/projects/yoonjae-space
npm install nextjs-toploader
```

Expected: package masuk ke `node_modules`, `package.json` updated.

- [ ] **Step 2: Tambahkan ke layout.tsx**

Buka `src/app/layout.tsx`. Cari import section di bagian atas, tambahkan:

```tsx
import NextTopLoader from "nextjs-toploader";
```

Lalu cari `<body>` tag dan tambahkan `<NextTopLoader>` sebagai child pertama:

```tsx
<body className={inter.className}>
  <NextTopLoader color="#8B1A1A" height={3} showSpinner={false} />
  {children}
  {/* komponen lain yang sudah ada tetap di sini */}
</body>
```

- [ ] **Step 3: Test secara manual**

Jalankan dev server jika belum jalan:
```bash
npm run dev
```

Buka browser, klik beberapa menu di sidebar. Harus ada progress bar merah tipis di atas halaman saat navigasi.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx package.json package-lock.json
git commit -m "feat: add navigation progress bar with nextjs-toploader"
```

---

### Task 2: Page Transition Animation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Tambahkan CSS animation ke globals.css**

Buka `src/app/globals.css`. Tambahkan di bagian paling bawah file:

```css
@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

main {
  animation: page-in 0.18s ease-out;
}
```

- [ ] **Step 2: Tambahkan ke tailwind.config.ts**

Buka `tailwind.config.ts`. Di dalam `theme.extend`, tambahkan:

```ts
keyframes: {
  "page-in": {
    from: { opacity: "0", transform: "translateY(6px)" },
    to: { opacity: "1", transform: "translateY(0)" },
  },
},
animation: {
  "page-in": "page-in 0.18s cubic-bezier(0.25, 0.1, 0.25, 1) both",
},
```

- [ ] **Step 3: Test secara manual**

Navigasi antar halaman — konten baru harus fade-in dengan sedikit slide up. Tidak boleh terasa laggy, harus smooth.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat: add page transition fade-in animation"
```

---

### Task 3: Fix Font Display Swap

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update Inter font config**

Buka `src/app/layout.tsx`. Cari deklarasi `Inter`, ubah menjadi:

```typescript
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: add font display swap to prevent FOIT"
```

---

### Task 4: Fix Math.random() di Calendar Loading (Hydration Mismatch)

**Files:**
- Modify: `src/app/(dashboard)/calendar/loading.tsx`

- [ ] **Step 1: Baca file saat ini**

Buka `src/app/(dashboard)/calendar/loading.tsx` dan identifikasi semua baris yang menggunakan `Math.random()`.

- [ ] **Step 2: Ganti Math.random() dengan pola deterministik**

Setiap `Math.random() > 0.6` atau `Math.random() > 0.8` ganti dengan expression berbasis index/day yang deterministic. Contoh pattern:

```tsx
// Ganti ini:
{Math.random() > 0.6 && <Skeleton className="h-5 w-full rounded" />}
{Math.random() > 0.8 && <Skeleton className="h-5 w-full rounded" />}

// Dengan ini (gunakan index variable dari loop parent, misal `day`):
{(day % 3 === 0) && <Skeleton className="h-5 w-full rounded" />}
{(day % 5 === 0) && <Skeleton className="h-5 w-full rounded" />}
```

Jika tidak dalam loop, gunakan constant array:
```tsx
// Buat array di luar komponen:
const SKELETON_PATTERN = [true, false, true, false, false, true, false, true, false, false, true, false, false, false, true, true, false, true, false, false, true, false, false, true, false, false, false, true, false, false, false];
// Lalu gunakan index: SKELETON_PATTERN[day % SKELETON_PATTERN.length]
```

- [ ] **Step 3: Verifikasi tidak ada console warning**

```bash
npm run dev
```

Buka halaman calendar. Buka DevTools console. Tidak boleh ada hydration mismatch warning.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/calendar/loading.tsx
git commit -m "fix: replace Math.random() in calendar loading to prevent hydration mismatch"
```

---

### Task 5: Fix Activities Search — Ganti onBlur dengan Debounce

**Files:**
- Modify: `src/app/(dashboard)/activities/_components/activities-client.tsx`

- [ ] **Step 1: Temukan search handler**

Buka `src/app/(dashboard)/activities/_components/activities-client.tsx`. Cari input search yang menggunakan `onBlur`.

- [ ] **Step 2: Tambahkan debounce useEffect**

Tambahkan `useEffect` untuk debounce (pastikan `useEffect` sudah di-import):

```typescript
// Tambahkan setelah state declarations:
useEffect(() => {
  const t = setTimeout(() => setSearch(searchInput), 300);
  return () => clearTimeout(t);
}, [searchInput]);
```

- [ ] **Step 3: Hapus onBlur dari input**

Cari input element dan hapus `onBlur` handler:

```tsx
// Sebelum:
<Input
  value={searchInput}
  onChange={e => setSearchInput(e.target.value)}
  onBlur={() => setSearch(searchInput)}
  placeholder="Cari aktivitas..."
/>

// Sesudah:
<Input
  value={searchInput}
  onChange={e => setSearchInput(e.target.value)}
  placeholder="Cari aktivitas..."
/>
```

- [ ] **Step 4: Test manual**

Ketik di search box activities. Search harus auto-trigger setelah 300ms tanpa perlu klik di luar input.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/activities/_components/activities-client.tsx
git commit -m "fix: replace onBlur with debounce in activities search"
```

---

### Task 6: Fix Supabase Client Inside Component — new-booking-client.tsx

**Files:**
- Modify: `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`

- [ ] **Step 1: Pindahkan createClient() ke level module**

Buka `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`. Cari baris `const supabase = createClient()` yang ada di dalam komponen (sekitar line 129).

Potong baris tersebut dan paste di level module (luar fungsi komponen), setelah semua `import` statements:

```typescript
// Letakkan ini setelah semua import, sebelum komponen:
const supabase = createClient();

export function NewBookingClient(...) {
  // supabase tidak lagi didefinisikan di sini
```

- [ ] **Step 2: Pastikan tidak ada error TypeScript**

```bash
npm run lint
```

Tidak boleh ada error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx
git commit -m "fix: move supabase client initialization to module level in new-booking-client"
```

---

## FASE 2 — Correctness Fixes (Bug & Inconsistency)

### Task 7: Fix Redirect Order di commissions/page.tsx

**Files:**
- Modify: `src/app/(dashboard)/commissions/page.tsx`

- [ ] **Step 1: Baca file dan identifikasi urutan**

Buka `src/app/(dashboard)/commissions/page.tsx`. Perhatikan: ada query ke `settings_general` yang berjalan SEBELUM `getCurrentUser()` dicek.

- [ ] **Step 2: Pindahkan auth check ke paling atas**

Pastikan `getCurrentUser()` adalah hal PERTAMA yang di-await, dan `if (!currentUser) redirect("/login")` langsung mengikutinya, sebelum query apapun:

```typescript
export default async function CommissionsPage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Baru setelah ini lakukan query lainnya
  // ...
}
```

- [ ] **Step 3: Pastikan tidak ada breaking change**

```bash
npm run build
```

Tidak boleh ada error TypeScript atau build error.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/commissions/page.tsx
git commit -m "fix: check auth before running queries in commissions page"
```

---

### Task 8: Fix settings_general Sequential Query di Commissions

**Files:**
- Modify: `src/app/(dashboard)/commissions/page.tsx`

> Lanjutan dari Task 7. `settings_general` sekarang di-fetch sequential (await sendiri), padahal ada `getCachedSettingsGeneral` di `cached-queries.ts` yang bisa ikut `Promise.all`.

- [ ] **Step 1: Import getCachedSettingsGeneral**

Di `src/app/(dashboard)/commissions/page.tsx`, tambahkan import (cek apakah sudah ada):

```typescript
import { getCachedSettingsGeneral } from "@/lib/cached-queries";
```

- [ ] **Step 2: Masukkan ke Promise.all**

Cari `Promise.all` yang sudah ada. Tambahkan `getCachedSettingsGeneral()` ke dalamnya:

```typescript
const [currentUser, settings, staffUsers, bookingsResult, /* ... hasil lainnya */] = await Promise.all([
  getCurrentUser(),
  getCachedSettingsGeneral(),
  // ... query yang sudah ada sebelumnya
]);

const cutoffDay = settings?.commission_cutoff_day ?? 26;
const period = getPeriodRange(month, year, cutoffDay);
```

- [ ] **Step 3: Hapus baris await settings_general yang lama**

Hapus:
```typescript
const { data: settings } = await supabase.from("settings_general").select(...)
```

Yang sudah tidak diperlukan lagi setelah diganti dengan `getCachedSettingsGeneral()`.

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/commissions/page.tsx
git commit -m "perf: use cached settings_general in commissions page parallel fetch"
```

---

### Task 9: Fix Redirect Order di finance/page.tsx

**Files:**
- Modify: `src/app/(dashboard)/finance/page.tsx`

- [ ] **Step 1: Pindahkan auth check ke paling atas**

Buka `src/app/(dashboard)/finance/page.tsx`. Pastikan `getCurrentUser()` dan redirect dijalankan PERTAMA sebelum query apapun:

```typescript
export default async function FinancePage({ searchParams }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Query lainnya setelah ini
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/finance/page.tsx
git commit -m "fix: check auth before running queries in finance page"
```

---

### Task 10: Fix Finance Filter — created_at → booking_date

**Files:**
- Modify: `src/app/(dashboard)/finance/page.tsx`

> Dashboard filter pakai `booking_date`, Finance pakai `created_at`. Harus konsisten — `booking_date` yang benar untuk laporan keuangan berdasarkan jadwal.

- [ ] **Step 1: Temukan query yang menggunakan created_at**

Buka `src/app/(dashboard)/finance/page.tsx`. Cari query ke tabel `bookings` yang menggunakan `.gte("created_at", ...)` atau `.lte("created_at", ...)`.

- [ ] **Step 2: Ganti dengan booking_date**

```typescript
// Sebelum:
.gte("created_at", `${startDate}T00:00:00`)
.lte("created_at", `${endDate}T23:59:59`)

// Sesudah:
.gte("booking_date", startDate)
.lte("booking_date", endDate)
```

> Catatan: `booking_date` adalah `date` field (bukan `timestamptz`), jadi cukup pakai format `YYYY-MM-DD` tanpa time component.

- [ ] **Step 3: Verifikasi angka di Finance konsisten dengan Dashboard**

Buka halaman Finance dan Dashboard, bandingkan angka revenue bulan yang sama. Harusnya konsisten sekarang.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/page.tsx
git commit -m "fix: use booking_date instead of created_at for finance period filter"
```

---

### Task 11: Fix BookingStatus Type Duplication

**Files:**
- Modify: `src/lib/types/database.ts`
- Modify: `src/lib/constants.ts` (verifikasi saja)

- [ ] **Step 1: Verifikasi definisi di kedua file**

Buka `src/lib/constants.ts` — pastikan ada:
```typescript
export const BOOKING_STATUS = { ... } as const;
export type BookingStatus = keyof typeof BOOKING_STATUS;
```

Buka `src/lib/types/database.ts` — cari definisi `BookingStatus` yang duplikat.

- [ ] **Step 2: Hapus duplikat di database.ts, ganti dengan re-export**

Di `src/lib/types/database.ts`, hapus baris:
```typescript
export type BookingStatus = "BOOKED" | "DP_PAID" | "PAID" | ...;
```

Ganti dengan re-export dari constants:
```typescript
export type { BookingStatus } from "@/lib/constants";
```

- [ ] **Step 3: Build check — pastikan semua import masih resolved**

```bash
npm run build
```

Jika ada error "cannot re-export type from non-module", pastikan `constants.ts` menggunakan `export type BookingStatus` atau gunakan:
```typescript
export type { BookingStatus } from "@/lib/constants";
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "fix: consolidate BookingStatus type to single source of truth in constants.ts"
```

---

### Task 12: Fix tab-progress Double-Fetch

**Files:**
- Modify: `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx`

- [ ] **Step 1: Tambahkan useRef untuk prevent double-fetch**

Buka `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx`. Tambahkan `useRef` (pastikan di-import dari React):

```typescript
const hasFetchedRef = useRef(false);
```

- [ ] **Step 2: Update useEffect untuk cek ref**

Cari `useEffect` yang fetch `booking_status_dates`. Tambahkan guard di awal:

```typescript
useEffect(() => {
  if (hasFetchedRef.current) return;
  hasFetchedRef.current = true;

  supabase
    .from("booking_status_dates")
    .select("status_type, status_date")
    .eq("booking_id", booking.id)
    .then(({ data }) => {
      // handler yang sudah ada
    });
}, [booking.id]);
```

- [ ] **Step 3: Test manual**

Buka detail booking, klik tab Progress, klik Overview, klik Progress lagi. Buka DevTools Network tab — harus hanya ada 1 request ke `booking_status_dates`, bukan 2.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx
git commit -m "fix: prevent double-fetch in tab-progress with useRef guard"
```

---

## FASE 3 — Performance Improvements

### Task 13: Calendar — Stale-While-Revalidate Pattern

**Files:**
- Modify: `src/app/(dashboard)/calendar/_components/calendar-client.tsx`

> Saat ini saat navigasi minggu/bulan, konten kalender menghilang diganti loading. Ini terasa lambat.

- [ ] **Step 1: Rename state dan ubah loading behavior**

Buka `src/app/(dashboard)/calendar/_components/calendar-client.tsx`. Cari state `loading`:

```typescript
// Sebelum:
const [loading, setLoading] = useState(false);

// Sesudah (rename untuk kejelasan):
const [isFetching, setIsFetching] = useState(false);
```

Update semua referensi `loading` → `isFetching` dan `setLoading` → `setIsFetching` di file ini.

- [ ] **Step 2: Ubah render — tampilkan data lama saat fetching**

Cari bagian render yang menyembunyikan konten saat loading. Ganti dengan opacity pattern:

```tsx
// Sebelum (konten hilang saat loading):
if (loading) return <LoadingSpinner />;
// atau: {loading && <Overlay />}

// Sesudah (konten tetap terlihat, hanya redup):
<div className={cn(
  "transition-opacity duration-150",
  isFetching && "opacity-50 pointer-events-none"
)}>
  {/* calendar content — tetap render dengan bookings lama */}
</div>
```

- [ ] **Step 3: Pastikan tidak ada blank state saat navigasi**

Test: buka calendar, navigasi ke minggu berikutnya. Kalender lama harus tetap terlihat (sedikit redup) sambil data baru di-fetch, lalu update.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/calendar/_components/calendar-client.tsx
git commit -m "feat: implement stale-while-revalidate pattern in calendar navigation"
```

---

### Task 14: Dashboard — Revenue Sum di Database, Bukan JS

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

> Saat ini fetch semua row `total` lalu dijumlahkan di JS. Harusnya database yang SUM.

- [ ] **Step 1: Temukan query revenue saat ini**

Buka `src/app/(dashboard)/dashboard/page.tsx`. Cari query yang fetch `bookings` dengan `.select("total")` untuk revenue calculation.

- [ ] **Step 2: Ganti dengan RPC atau count-based approach**

Opsi yang paling clean untuk Supabase JS:

```typescript
// Buat RPC di Supabase (lihat Step 3 dulu)
// Atau gunakan: buat fungsi di Supabase Dashboard → SQL Editor

// Query dengan RPC:
const { data: revenueData } = await supabase
  .rpc("get_monthly_revenue", {
    p_start: monthStart,
    p_end: monthEnd,
    p_statuses: PAID_STATUSES,
  });

const estimasiRevenue = revenueData ?? 0;
```

- [ ] **Step 3: Buat RPC function di Supabase**

Buka Supabase Dashboard → SQL Editor. Jalankan:

```sql
CREATE OR REPLACE FUNCTION get_monthly_revenue(
  p_start date,
  p_end date,
  p_statuses text[]
)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM bookings
  WHERE booking_date >= p_start
    AND booking_date <= p_end
    AND status = ANY(p_statuses)
$$ LANGUAGE sql STABLE;
```

- [ ] **Step 4: Update dashboard/page.tsx**

Hapus baris JS `.reduce()` untuk sum revenue. Gunakan hasil dari RPC langsung.

- [ ] **Step 5: Build check**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "perf: move revenue calculation from JS to database RPC"
```

---

### Task 15: Sidebar — useTransition untuk Instant Navigation Feedback

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Tambahkan imports yang diperlukan**

Buka `src/components/layout/sidebar.tsx`. Tambahkan ke import React/Next.js:

```typescript
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
```

Jika `usePathname` sudah ada, jangan duplikasi import.

- [ ] **Step 2: Tambahkan state dan transition**

Di dalam komponen sidebar, tambahkan:

```typescript
const router = useRouter();
const [isPending, startTransition] = useTransition();
const [pendingHref, setPendingHref] = useState<string | null>(null);
```

- [ ] **Step 3: Ganti Link dengan button handler**

Cari tempat menu items di-render dengan `<Link>`. Ganti dengan button yang handle navigasi:

```tsx
<button
  key={item.href}
  onClick={() => {
    setPendingHref(item.href);
    startTransition(() => {
      router.push(item.href);
    });
  }}
  className={cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
    isActive || pendingHref === item.href
      ? "bg-maroon-50 text-maroon-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
  )}
>
  {/* isi item yang sudah ada */}
</button>
```

> Catatan: sesuaikan `isActive` check dengan logika yang sudah ada di sidebar.

- [ ] **Step 4: Reset pendingHref saat navigasi selesai**

Tambahkan `useEffect` untuk reset state setelah navigasi:

```typescript
const pathname = usePathname();
useEffect(() => {
  setPendingHref(null);
}, [pathname]);
```

- [ ] **Step 5: Test manual**

Klik menu sidebar. Sidebar item harus langsung berubah ke active state (merah) tanpa menunggu halaman selesai load.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add instant navigation feedback in sidebar with useTransition"
```

---

## FASE 4 — Architecture Refactor (Higher Effort)

### Task 16: Customers — Buat Supabase View customer_stats

**Files:**
- Modify: `src/app/(dashboard)/customers/page.tsx`
- Modify: `src/app/(dashboard)/customers/_components/customers-client.tsx`
- Database: buat view `customer_stats` di Supabase

> Query saat ini fetch semua booking per customer untuk dihitung di JS. Ini O(customers × avg_bookings). View akan mengubahnya menjadi O(customers).

- [ ] **Step 1: Buat view di Supabase**

Buka Supabase Dashboard → SQL Editor. Jalankan:

```sql
CREATE OR REPLACE VIEW customer_stats AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.email,
  c.instagram,
  c.address,
  c.domicile,
  c.lead_id,
  c.notes,
  c.created_at,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.total), 0) AS total_spend,
  MAX(b.booking_date) AS last_visit
FROM customers c
LEFT JOIN bookings b ON b.customer_id = c.id
GROUP BY c.id;
```

- [ ] **Step 2: Test view di Supabase**

```sql
SELECT * FROM customer_stats LIMIT 5;
```

Harus return data dengan kolom `total_bookings`, `total_spend`, `last_visit`.

- [ ] **Step 3: Update customers/page.tsx**

Buka `src/app/(dashboard)/customers/page.tsx`. Cari query yang ke tabel `customers` dengan nested `bookings(...)`. Ubah untuk query dari view:

```typescript
const { data, count, error } = await supabase
  .from("customer_stats")
  .select(
    "id, name, phone, email, instagram, domicile, lead_id, total_bookings, total_spend, last_visit",
    { count: "exact" }
  )
  .order("name")
  .range(from, to);
```

- [ ] **Step 4: Update customers-client.tsx**

Buka `src/app/(dashboard)/customers/_components/customers-client.tsx`. Cari bagian yang menghitung `total_bookings`, `total_spend`, `last_visit` dari array `bookings`. Ganti dengan nilai langsung dari view:

```typescript
// Sebelum (hitung manual di JS):
const totalBookings = customer.bookings?.length ?? 0;
const totalSpend = customer.bookings?.reduce((sum, b) => sum + b.total, 0) ?? 0;
const lastVisit = customer.bookings?.sort(...)[0]?.booking_date;

// Sesudah (ambil langsung dari view):
const totalBookings = customer.total_bookings ?? 0;
const totalSpend = customer.total_spend ?? 0;
const lastVisit = customer.last_visit;
```

- [ ] **Step 5: Update TypeScript interface**

Di `src/lib/types/database.ts` atau di file customers, pastikan interface yang digunakan untuk customer sudah punya field baru:

```typescript
interface CustomerStats {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  domicile: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
  total_bookings: number;
  total_spend: number;
  last_visit: string | null;
}
```

- [ ] **Step 6: Build check**

```bash
npm run build
```

- [ ] **Step 7: Test manual**

Buka halaman customers. Data harus tampil benar dengan angka total bookings, total spend, dan last visit yang sama seperti sebelumnya.

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/customers/page.tsx src/app/(dashboard)/customers/_components/customers-client.tsx
git commit -m "perf: use customer_stats view to replace O(n) JS aggregation in customers page"
```

---

### Task 17: Settings — Pass Initial Data dari Server

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/settings/_components/settings-client.tsx` (atau file wrapper settings)
- Modify: `src/app/(dashboard)/settings/_components/tab-packages.tsx`

> Settings tabs saat ini: user klik tab → download JS chunk → fetch data. Total ~500ms. Dengan initial data dari server, step terakhir hilang.

- [ ] **Step 1: Fetch packages dan addons di settings/page.tsx**

Buka `src/app/(dashboard)/settings/page.tsx`. Tambahkan fetch di server dengan `getCachedPackages()` dan `getCachedAddons()` (sudah ada di `cached-queries.ts`):

```typescript
import { getCachedPackages, getCachedAddons } from "@/lib/cached-queries";

// Di dalam Promise.all yang sudah ada:
const [currentUser, packages, addons] = await Promise.all([
  getCurrentUser(),
  getCachedPackages(),
  getCachedAddons(),
]);

// Pass ke client component:
return (
  <SettingsClient
    currentUser={currentUser}
    initialPackages={packages}
    initialAddons={addons}
  />
);
```

- [ ] **Step 2: Update SettingsClient props**

Buka file settings client component (cek nama persis filenya). Tambahkan props `initialPackages` dan `initialAddons` ke interface:

```typescript
interface SettingsClientProps {
  currentUser: CurrentUser;
  initialPackages: Package[];
  initialAddons: Addon[];
}
```

Pass props ini ke `TabPackages` dan `TabAddons` saat di-render.

- [ ] **Step 3: Update tab-packages.tsx untuk terima initialPackages**

Buka `src/app/(dashboard)/settings/_components/tab-packages.tsx`. Tambahkan prop `initialPackages`:

```typescript
interface TabPackagesProps {
  // props yang sudah ada...
  initialPackages?: Package[];
}

export function TabPackages({ initialPackages = [], ...props }) {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  // Hapus atau guard fetch awal jika initialPackages sudah ada:
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (isInitialMount.current && initialPackages.length > 0) {
      isInitialMount.current = false;
      return; // skip fetch — sudah punya data dari server
    }
    isInitialMount.current = false;
    // fetch seperti biasa
  }, []);
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Test manual**

Buka Settings → klik tab Packages. Harus langsung tampil data tanpa loading state.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx src/app/(dashboard)/settings/_components/
git commit -m "perf: prefetch packages and addons data in settings server component"
```

---

### Task 18: Booking Creation — Atomic via API Route

**Files:**
- Create: `src/app/api/bookings/create/route.ts`
- Modify: `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`

> **⚠️ TASK PALING KOMPLEKS** — Ini refactor besar. Lakukan di branch terpisah. Seluruh proses create booking (~10 insert) dipindah ke server API Route dalam satu transaksi.

- [ ] **Step 1: Buat branch baru**

```bash
git checkout -b feat/atomic-booking-creation
```

- [ ] **Step 2: Pelajari flow create booking saat ini**

Buka `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`. Baca dan catat urutan insert:
1. Upsert customer
2. Insert booking
3. Insert booking_packages
4. Insert backgrounds
5. Insert addons
6. Insert custom_fields
7. Insert invoice
8. Activity log
9. dst.

- [ ] **Step 3: Buat Supabase RPC Function**

Buka Supabase Dashboard → SQL Editor. Buat function yang menghandle semua insert dalam satu transaksi. Skeleton:

```sql
CREATE OR REPLACE FUNCTION create_full_booking(
  p_customer_name text,
  p_customer_phone text,
  p_booking_date date,
  p_total numeric,
  p_packages jsonb,
  p_backgrounds jsonb,
  p_addons jsonb,
  p_custom_fields jsonb,
  p_invoice_data jsonb
  -- tambahkan parameter lain sesuai kebutuhan
)
RETURNS uuid AS $$
DECLARE
  v_customer_id uuid;
  v_booking_id uuid;
  v_invoice_id uuid;
BEGIN
  -- 1. Upsert customer
  INSERT INTO customers (name, phone, ...) 
  VALUES (p_customer_name, p_customer_phone, ...)
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_customer_id;
  
  -- 2. Insert booking
  INSERT INTO bookings (customer_id, booking_date, total, ...)
  VALUES (v_customer_id, p_booking_date, p_total, ...)
  RETURNING id INTO v_booking_id;
  
  -- 3. Insert packages (loop jsonb array)
  INSERT INTO booking_packages (booking_id, package_id, ...)
  SELECT v_booking_id, (pkg->>'package_id')::uuid, ...
  FROM jsonb_array_elements(p_packages) AS pkg;
  
  -- 4. Insert invoice
  INSERT INTO invoices (booking_id, ...)
  VALUES (v_booking_id, ...)
  RETURNING id INTO v_invoice_id;
  
  RETURN v_booking_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- rollback otomatis karena dalam transaksi
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> Sesuaikan dengan semua insert yang ada di `handleSubmit` di `new-booking-client.tsx`.

- [ ] **Step 4: Buat API Route**

Buat file `src/app/api/bookings/create/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createClient();

  const { data: bookingId, error } = await supabase
    .rpc("create_full_booking", {
      p_customer_name: body.customerName,
      p_customer_phone: body.customerPhone,
      p_booking_date: body.bookingDate,
      p_total: body.total,
      p_packages: body.packages,
      p_backgrounds: body.backgrounds,
      p_addons: body.addons,
      p_custom_fields: body.customFields,
      p_invoice_data: body.invoiceData,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookingId });
}
```

- [ ] **Step 5: Update new-booking-client.tsx**

Ganti `handleSubmit` yang berisi 10 insert berurutan dengan satu `fetch` call ke API route:

```typescript
const response = await fetch("/api/bookings/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customerName: formData.customerName,
    customerPhone: formData.customerPhone,
    bookingDate: formData.bookingDate,
    total: formData.total,
    packages: formData.packages,
    backgrounds: formData.backgrounds,
    addons: formData.addons,
    customFields: formData.customFields,
    invoiceData: formData.invoiceData,
  }),
});

if (!response.ok) {
  const { error } = await response.json();
  throw new Error(error);
}

const { bookingId } = await response.json();
router.push(`/bookings/${bookingId}`);
```

- [ ] **Step 6: Test end-to-end**

Test buat booking baru dari awal sampai berhasil. Cek di Supabase Table Editor bahwa semua table terisi dengan benar.

Test error case: matikan sementara koneksi atau gunakan invalid data → harus tidak ada data partial yang tersimpan.

- [ ] **Step 7: Build check**

```bash
npm run build
```

- [ ] **Step 8: Commit dan PR**

```bash
git add src/app/api/bookings/create/route.ts src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx
git commit -m "feat: make booking creation atomic via API Route + Supabase RPC"
```

---

## Ringkasan Prioritas

| # | Task | Fase | Effort | Impact |
|---|------|------|--------|--------|
| 1 | Install nextjs-toploader | 1 | 5 menit | ⭐⭐⭐⭐⭐ |
| 2 | Page transition CSS | 1 | 10 menit | ⭐⭐⭐⭐ |
| 3 | Font display:swap | 1 | 2 menit | ⭐⭐ |
| 4 | Fix Math.random() di calendar loading | 1 | 5 menit | ⭐⭐⭐ |
| 5 | Activities debounce | 1 | 10 menit | ⭐⭐ |
| 6 | Supabase client level module | 1 | 2 menit | ⭐ |
| 7 | Redirect order — commissions | 2 | 5 menit | ⭐⭐⭐ |
| 8 | settings_general ke Promise.all — commissions | 2 | 10 menit | ⭐⭐ |
| 9 | Redirect order — finance | 2 | 5 menit | ⭐⭐⭐ |
| 10 | Finance filter booking_date | 2 | 5 menit | ⭐⭐⭐⭐ |
| 11 | BookingStatus type dedup | 2 | 10 menit | ⭐⭐ |
| 12 | tab-progress double-fetch | 2 | 10 menit | ⭐⭐ |
| 13 | Calendar stale-while-revalidate | 3 | 30 menit | ⭐⭐⭐⭐ |
| 14 | Revenue sum di DB | 3 | 20 menit | ⭐⭐⭐ |
| 15 | Sidebar useTransition | 3 | 20 menit | ⭐⭐⭐⭐ |
| 16 | Customers → Supabase View | 4 | 60 menit | ⭐⭐⭐⭐⭐ |
| 17 | Settings initial data dari server | 4 | 30 menit | ⭐⭐⭐ |
| 18 | Booking atomic (API Route) | 4 | 2-3 jam | ⭐⭐⭐⭐⭐ (critical) |

**Rekomendasi urutan kerja:**
- **Hari ini:** Task 1-6 (Fase 1, ~35 menit total, zero risk)
- **Minggu ini:** Task 7-15 (Fase 2 & 3)
- **Sprint tersendiri:** Task 16-18 (Fase 4, butuh testing lebih hati-hati)
