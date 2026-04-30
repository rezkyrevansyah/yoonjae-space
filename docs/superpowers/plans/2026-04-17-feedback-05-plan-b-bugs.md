# Feedback 05 — Plan B: Bug Fixes (Mobile UI + Data Display + Role)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki 6 bug dari Feedback 05 yang tersisa setelah Plan A: end time di tabel booking, urutan kategori paket, redirect role non-admin, filter tanggal mobile, jam buka/tutup mobile, dan tampilan multi-paket.

**Architecture:** Setiap task adalah fix independen pada file yang berbeda. Tidak ada perubahan schema DB. Task 2 (FB-08) adalah yang paling kompleks karena memerlukan passing data baru ke komponen step.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS

**Source:** `FEEDBACK_05.md` — FB-04, FB-05, FB-06, FB-08, FB-12, FB-23

---

## Files yang Dimodifikasi

| File | Bug |
|------|-----|
| `src/app/(dashboard)/bookings/_components/bookings-client.tsx` | FB-05, FB-06, FB-12 |
| `src/app/(dashboard)/bookings/page.tsx` | FB-12 |
| `src/app/(dashboard)/bookings/new/_components/step-packages-addons.tsx` | FB-08 |
| `src/app/(dashboard)/bookings/new/page.tsx` | FB-08 |
| `src/lib/cached-queries.ts` | FB-08 |
| `src/app/(dashboard)/settings/_components/tab-general.tsx` | FB-04 |
| `src/app/page.tsx` | FB-23 |
| `src/app/(dashboard)/dashboard/page.tsx` | FB-23 |

---

## Task 1: FB-06 — Tampilkan End Time di Tabel dan Card Bookings

**Problem:** Kolom "Tanggal & Waktu" di tabel hanya menampilkan `start_time`. `end_time` sudah di-fetch (ada di `BookingRow` interface) tapi tidak dirender.

**Files:**
- Modify: `src/app/(dashboard)/bookings/_components/bookings-client.tsx:380-382` (tabel)
- Modify: `src/app/(dashboard)/bookings/_components/bookings-client.tsx:468` (mobile card)

- [ ] **Step 1: Buka file dan cari baris start_time di tabel**

  Buka `src/app/(dashboard)/bookings/_components/bookings-client.tsx`.
  Cari baris sekitar line 380:
  ```tsx
  <p className="text-gray-500">{formatTime(b.start_time)}</p>
  ```

- [ ] **Step 2: Ganti tampilan waktu di tabel menjadi range**

  Ganti blok `<TableCell>` di baris sekitar 380-383 menjadi:

  ```tsx
  <TableCell className="text-sm">
    <p>{formatDate(b.booking_date)}</p>
    <p className="text-gray-500">{formatTime(b.start_time)} – {formatTime(b.end_time)}</p>
  </TableCell>
  ```

- [ ] **Step 3: Cari baris start_time di mobile card**

  Cari baris sekitar line 468:
  ```tsx
  <p>{formatDate(b.booking_date)} · {formatTime(b.start_time)}</p>
  ```

- [ ] **Step 4: Ganti tampilan waktu di mobile card menjadi range**

  ```tsx
  <p>{formatDate(b.booking_date)} · {formatTime(b.start_time)} – {formatTime(b.end_time)}</p>
  ```

- [ ] **Step 5: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

  Tidak boleh ada error baru.

- [ ] **Step 6: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/_components/bookings-client.tsx"
  git commit -m "fix(FB-06): show end time alongside start time in bookings table and mobile cards"
  ```

---

## Task 2: FB-08 — Perbaiki Urutan Kategori Paket di New Booking Step 3

**Problem:** Di Settings > Packages, kategori diurutkan berdasarkan `package_categories.sort_order`. Tapi di step 3 New Booking, `StepPackagesAddons` mengurutkan kategori berdasarkan first-appearance dari packages' own `sort_order` — bukan `package_categories.sort_order`. Hasilnya urutan kategori bisa berbeda.

**Root cause:** Tidak ada data `package_categories` yang di-pass ke step component.

**Fix:** Fetch `package_categories` di `new/page.tsx`, pass ke `NewBookingClient`, lalu ke `StepPackagesAddons`, dan gunakan order tersebut untuk sort grup kategori.

**Files:**
- Modify: `src/lib/cached-queries.ts` — tambah `getCachedPackageCategories()`
- Modify: `src/app/(dashboard)/bookings/new/page.tsx` — fetch dan pass `packageCategories`
- Modify: `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx` — terima dan pass `packageCategories`
- Modify: `src/app/(dashboard)/bookings/new/_components/step-packages-addons.tsx` — update `groupBy` + Props

- [ ] **Step 1: Buka cached-queries.ts dan tambah fungsi baru**

  Buka `src/lib/cached-queries.ts`. Cari bagian `// ── Master Data` dan tambahkan setelah blok `_getCachedAddons`:

  ```typescript
  const _getCachedPackageCategories = unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("package_categories")
        .select("id, name, sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      return data ?? [];
    },
    ["package-categories-active"],
    { tags: [CACHE_TAGS.PACKAGES], revalidate: 3600 }
  );

  export const getCachedPackageCategories = async () => _getCachedPackageCategories();
  ```

- [ ] **Step 2: Verify CACHE_TAGS.PACKAGES exists**

  Cari baris `CACHE_TAGS` di file yang sama. Pastikan `PACKAGES` sudah ada:
  ```typescript
  PACKAGES: "packages",
  ```
  Jika belum ada, tambahkan. Jika sudah ada, lanjut ke step berikutnya.

- [ ] **Step 3: Buka new/page.tsx dan tambah fetch packageCategories**

  Buka `src/app/(dashboard)/bookings/new/page.tsx`.
  Cari import cached-queries dan tambahkan `getCachedPackageCategories`:
  ```typescript
  import { getCachedPackages, getCachedAddons, getCachedBackgrounds, getCachedLeads, getCachedPhotoFors, getCachedCustomFields, getCachedStudioInfo, getCachedHolidays, getCachedSettingsGeneral, getCachedPackageCategories } from "@/lib/cached-queries";
  ```

  Lalu di dalam `Promise.all(...)`, tambahkan `getCachedPackageCategories()`:
  ```typescript
  const [
    packages,
    addons,
    packageCategories,
    backgrounds,
    leads,
    photoFors,
    customFields,
    studioInfo,
    holidays,
    settingsGeneral,
    users,
    domicileOptions,
  ] = await Promise.all([
    getCachedPackages(),
    getCachedAddons(),
    getCachedPackageCategories(),
    // ... sisanya sesuai urutan yang sudah ada
  ]);
  ```

  > Catatan: Sesuaikan urutan destructuring dengan urutan di `Promise.all`. Cek berapa banyak item di Promise.all yang sudah ada dan tambahkan `getCachedPackageCategories()` setelah `getCachedAddons()`.

- [ ] **Step 4: Pass packageCategories ke NewBookingClient di new/page.tsx**

  Di return statement, tambahkan prop `packageCategories`:
  ```tsx
  <NewBookingClient
    ...
    packageCategories={packageCategories}
  />
  ```

- [ ] **Step 5: Update Props interface di new-booking-client.tsx**

  Buka `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`.
  Cari interface `Props` (sekitar awal file) dan tambahkan field:
  ```typescript
  interface Props {
    // ... existing fields
    packageCategories: { id: string; name: string; sort_order: number }[];
  }
  ```

  Lalu di function signature, destructure `packageCategories`:
  ```typescript
  export function NewBookingClient({
    currentUser,
    packages,
    packageCategories,
    // ... rest
  }: Props) {
  ```

  Lalu temukan tempat di mana `StepPackagesAddons` di-render (cari `<StepPackagesAddons`) dan tambahkan prop:
  ```tsx
  <StepPackagesAddons
    data={packagesAddonsData}
    onChange={setPackagesAddonsData}
    packages={packages as Package[]}
    addons={addons as Addon[]}
    packageCategories={packageCategories}
  />
  ```

- [ ] **Step 6: Update StepPackagesAddons Props dan groupBy**

  Buka `src/app/(dashboard)/bookings/new/_components/step-packages-addons.tsx`.

  **6a. Update Props interface:**
  ```typescript
  interface Props {
    data: PackagesAddonsFormData;
    onChange: (data: PackagesAddonsFormData) => void;
    packages: Package[];
    addons: Addon[];
    packageCategories: { id: string; name: string; sort_order: number }[];
  }
  ```

  **6b. Update function signature:**
  ```typescript
  export function StepPackagesAddons({ data, onChange, packages, addons, packageCategories }: Props) {
  ```

  **6c. Update groupBy dan usage:**

  Ganti fungsi `groupBy` di awal file dengan versi yang menerima category order:
  ```typescript
  function groupByWithOrder<T extends { category: string }>(
    items: T[],
    categoryOrder: string[]
  ): [string, T[]][] {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = item.category || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      const aOrder = ai === -1 ? 999 : ai;
      const bOrder = bi === -1 ? 999 : bi;
      return aOrder - bOrder;
    });
  }
  ```

  **6d. Update useMemo di dalam komponen:**
  ```typescript
  const categoryOrder = useMemo(
    () => packageCategories.map((c) => c.name),
    [packageCategories]
  );
  const packageGroups = useMemo(
    () => groupByWithOrder(packages, categoryOrder),
    [packages, categoryOrder]
  );
  const addonGroups = useMemo(
    () => groupByWithOrder(addons, categoryOrder),
    [addons, categoryOrder]
  );
  ```

  > Hapus fungsi `groupBy` yang lama (tidak dipakai lagi).

- [ ] **Step 7: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -20
  ```

- [ ] **Step 8: Build check**

  ```bash
  cd D:/projects/yoonjae-space && npm run build 2>&1 | grep -E "(Error|error|✓ Compiled)" | head -10
  ```

  Harus ada `✓ Compiled successfully`.

- [ ] **Step 9: Commit**

  ```bash
  git add "src/lib/cached-queries.ts" "src/app/(dashboard)/bookings/new/page.tsx" "src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx" "src/app/(dashboard)/bookings/new/_components/step-packages-addons.tsx"
  git commit -m "fix(FB-08): sort package categories by package_categories.sort_order in new booking step"
  ```

---

## Task 3: FB-23 — Redirect Role Non-Admin ke Halaman Pertama yang Diizinkan

**Problem:** `src/app/page.tsx` selalu redirect ke `/dashboard` untuk user yang sudah login. User dengan role fotografer (menu_access: `["calendar", "photo-delivery"]`) landing di dashboard yang menampilkan revenue sensitif.

**Fix:** Di `page.tsx`, gunakan `getCurrentUser()` untuk cek `menu_access`. Jika tidak include `"dashboard"`, redirect ke `MENU_ITEMS.find(m => m.slug === menu_access[0])?.href`.
Tambahkan juga proteksi di `dashboard/page.tsx`.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Buka src/app/page.tsx**

  File saat ini:
  ```typescript
  import { redirect } from "next/navigation";
  import { createClient } from "@/utils/supabase/server";

  export default async function RootPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  }
  ```

- [ ] **Step 2: Ganti isi page.tsx dengan role-aware redirect**

  ```typescript
  import { redirect } from "next/navigation";
  import { createClient } from "@/utils/supabase/server";
  import { getCurrentUser } from "@/lib/get-current-user";
  import { MENU_ITEMS } from "@/lib/constants";

  export default async function RootPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      redirect("/login");
    }

    // If user has dashboard access, go to dashboard
    if (currentUser.menu_access.includes("dashboard")) {
      redirect("/dashboard");
    }

    // Otherwise redirect to first allowed page
    const firstSlug = currentUser.menu_access[0];
    const firstItem = MENU_ITEMS.find((m) => m.slug === firstSlug);
    redirect(firstItem?.href ?? "/dashboard");
  }
  ```

- [ ] **Step 3: Buka dashboard/page.tsx dan tambahkan guard**

  Buka `src/app/(dashboard)/dashboard/page.tsx`.
  Cari baris awal yang memanggil `getCurrentUser()` (sekitar line 35-50). Setelah `getCurrentUser()` berhasil, tambahkan guard sebelum query data:

  ```typescript
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Proteksi: redirect jika role tidak punya akses dashboard
  if (!currentUser.menu_access.includes("dashboard")) {
    const firstSlug = currentUser.menu_access[0];
    const firstItem = MENU_ITEMS.find((m) => m.slug === firstSlug);
    redirect(firstItem?.href ?? "/login");
  }
  ```

  Tambahkan import `MENU_ITEMS` jika belum ada:
  ```typescript
  import { MENU_ITEMS } from "@/lib/constants";
  ```

- [ ] **Step 4: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add "src/app/page.tsx" "src/app/(dashboard)/dashboard/page.tsx"
  git commit -m "fix(FB-23): redirect non-dashboard roles to their first allowed page after login"
  ```

---

## Task 4: FB-05 — Perbaiki Filter Tanggal Mobile di Halaman Bookings

**Problem:** Dua date picker "Dari" dan "Sampai" side-by-side di mobile menggunakan wrapper `flex gap-2 sm:contents`. Pada layar kecil, kedua input terlalu sempit dan bertabrakan.

**Fix:** Ubah wrapper agar stack vertikal di mobile (`flex-col`) dan tetap menggunakan `sm:contents` untuk desktop.

**File:**
- Modify: `src/app/(dashboard)/bookings/_components/bookings-client.tsx:292`

- [ ] **Step 1: Cari wrapper date range**

  Buka `src/app/(dashboard)/bookings/_components/bookings-client.tsx`.
  Cari baris sekitar 292:
  ```tsx
  <div className="flex gap-2 sm:contents min-w-0 overflow-hidden">
  ```

- [ ] **Step 2: Ganti className wrapper**

  ```tsx
  <div className="flex flex-col sm:contents min-w-0">
  ```

  Ini membuat kedua input stack vertikal di mobile, dan di sm+ keduanya menjadi direct flex-children dari parent (efek `sm:contents`).

- [ ] **Step 3: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/_components/bookings-client.tsx"
  git commit -m "fix(FB-05): stack date range filter vertically on mobile in bookings page"
  ```

---

## Task 5: FB-04 — Perbaiki Layout Jam Buka/Tutup di Settings Mobile

**Problem:** Di `tab-general.tsx`, Jam Buka dan Jam Tutup menggunakan `grid grid-cols-2 gap-3` yang tidak stack di mobile — dua input menjadi terlalu sempit di layar kecil.

**Fix:** Ubah ke `grid grid-cols-1 sm:grid-cols-2 gap-3`.

**File:**
- Modify: `src/app/(dashboard)/settings/_components/tab-general.tsx:182`

- [ ] **Step 1: Cari grid jam buka/tutup**

  Buka `src/app/(dashboard)/settings/_components/tab-general.tsx`.
  Cari baris sekitar line 182:
  ```tsx
  <div className="grid grid-cols-2 gap-3">
  ```
  (Tepat sebelum `<Label>Jam Buka</Label>`)

- [ ] **Step 2: Tambahkan responsive breakpoint**

  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  ```

- [ ] **Step 3: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(dashboard)/settings/_components/tab-general.tsx"
  git commit -m "fix(FB-04): stack jam buka/tutup inputs vertically on mobile in settings"
  ```

---

## Task 6: FB-12 — Tampilkan Semua Paket di List Bookings (Multi-Paket)

**Problem:** Di tabel bookings dan mobile cards, nama paket diambil dari `b.packages?.name` yang merujuk ke kolom `package_id` (backward-compat legacy field — hanya menyimpan paket pertama). Booking dengan 2 paket hanya menampilkan 1 nama.

**Fix:** Tambahkan `booking_packages(packages(name))` ke query, buat field `packageNames` di `BookingRow`, dan render semua nama dipisah koma.

**Files:**
- Modify: `src/app/(dashboard)/bookings/page.tsx` — tambah `booking_packages` ke initial query
- Modify: `src/app/(dashboard)/bookings/_components/bookings-client.tsx` — update interface + render

- [ ] **Step 1: Update BookingRow interface di bookings-client.tsx**

  Buka `src/app/(dashboard)/bookings/_components/bookings-client.tsx`.
  Cari interface `BookingRow` (line 57) dan tambahkan field:
  ```typescript
  interface BookingRow {
    id: string;
    booking_number: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    print_order_status: string | null;
    is_rescheduled: boolean;
    total: number;
    created_at: string;
    customers: { name: string } | null;
    packages: { name: string } | null;
    booking_packages: { packages: { name: string } | null }[];
    staff: { name: string } | null;
  }
  ```

- [ ] **Step 2: Update fetchBookings query di bookings-client.tsx**

  Cari baris `select(` di dalam `fetchBookings` (sekitar line 130). Tambahkan `booking_packages(packages(name))`:
  ```typescript
  .select(
    `id, booking_number, booking_date, start_time, end_time, status, print_order_status, is_rescheduled, total, created_at,
     customers(name),
     packages(name),
     booking_packages(packages(name)),
     staff:users!bookings_staff_id_fkey(name)`,
    { count: "exact" }
  )
  ```

- [ ] **Step 3: Tambahkan helper untuk render nama paket**

  Di dalam komponen (sebelum return), tambahkan helper function:
  ```typescript
  function getPackageNames(b: BookingRow): string {
    if (b.booking_packages && b.booking_packages.length > 0) {
      const names = b.booking_packages
        .map((bp) => bp.packages?.name)
        .filter(Boolean) as string[];
      if (names.length > 0) return names.join(", ");
    }
    return b.packages?.name ?? "-";
  }
  ```

- [ ] **Step 4: Update render di tabel (desktop)**

  Cari baris sekitar line 377:
  ```tsx
  <p className="text-sm font-medium text-gray-800 mt-0.5">{b.packages?.name ?? "-"}</p>
  ```

  Ganti dengan:
  ```tsx
  <p className="text-sm font-medium text-gray-800 mt-0.5">{getPackageNames(b)}</p>
  ```

- [ ] **Step 5: Update render di mobile card**

  Cari baris sekitar line 469:
  ```tsx
  <p>{b.packages?.name ?? "-"}</p>
  ```

  Ganti dengan:
  ```tsx
  <p>{getPackageNames(b)}</p>
  ```

- [ ] **Step 6: Update BookingRow interface di page.tsx**

  Buka `src/app/(dashboard)/bookings/page.tsx`.
  Cari interface `BookingRow` (line 16) dan tambahkan:
  ```typescript
  booking_packages: { packages: { name: string } | null }[];
  ```

- [ ] **Step 7: Update initial server query di page.tsx**

  Cari `.select(` di initialQuery (line 42) dan tambahkan `booking_packages(packages(name))`:
  ```typescript
  .select(
    `id, booking_number, booking_date, start_time, end_time, status, print_order_status, is_rescheduled, total, created_at,
     customers(name),
     packages(name),
     booking_packages(packages(name)),
     staff:users!bookings_staff_id_fkey(name)`,
    { count: "exact" }
  )
  ```

- [ ] **Step 8: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -20
  ```

- [ ] **Step 9: Build check**

  ```bash
  cd D:/projects/yoonjae-space && npm run build 2>&1 | grep -E "(Error|error|✓ Compiled)" | head -10
  ```

- [ ] **Step 10: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/page.tsx" "src/app/(dashboard)/bookings/_components/bookings-client.tsx"
  git commit -m "fix(FB-12): show all package names for multi-package bookings in list view"
  ```

---

## Checklist Self-Review

- [x] FB-06: `end_time` di-render di tabel dan mobile card ✓
- [x] FB-08: `package_categories.sort_order` digunakan untuk urutan kategori ✓
- [x] FB-23: Non-dashboard role di-redirect ke halaman pertama yang diizinkan ✓
- [x] FB-05: Date filter mobile stack vertikal ✓
- [x] FB-04: Jam Buka/Tutup stack di mobile ✓
- [x] FB-12: Multi-paket tampil semua di list bookings ✓
