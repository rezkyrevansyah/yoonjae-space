# Frontend Performance Review — Yoonjaespace
_Goal: Zero-loading feel, instant navigation, users amazed by speed_
_Reviewed: April 2026_

---

## Ringkasan

Fondasi sudah **sangat solid**: skeleton screens di semua halaman, PWA dengan aggressive caching, dynamic imports untuk settings tabs, image optimization, dan debounce di search. Tapi untuk mencapai **"zero loading" yang bikin user amazed**, ada beberapa gap besar — yang paling kritis: **tidak ada feedback visual saat navigasi**, **tidak ada page transition**, dan **customer list melakukan query yang sangat berat**. Perbaikan-perbaikan ini yang akan memberikan lompatan paling besar dalam perceived performance.

---

## 🔴 PALING PRIORITAS — Yang Paling Terasa Pengguna

### 1. Tidak Ada Navigation Loading Indicator

**Ini yang paling terasa.** Saat user klik menu di sidebar, **tidak ada feedback visual apapun** — page diam saja selama 500ms–2s sambil server fetch data, lalu tiba-tiba berganti. User tidak tahu apakah klik-nya diterima.

`loading.tsx` skeleton baru muncul setelah Next.js mulai navigasi, tapi ada jeda kosong sebelum itu. Untuk dashboard management app yang dipakai setiap hari, ini terasa lambat meski sebenarnya cepat.

**Solusi: Tambahkan progress bar navigasi.** Install `nextjs-toploader`:

```bash
npm install nextjs-toploader
```

```tsx
// src/app/layout.tsx
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <NextTopLoader color="#8B1A1A" height={3} showSpinner={false} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

Hasilnya: begitu user klik link manapun, langsung ada bar merah tipis di atas halaman yang bergerak. **Ini alone sudah membuat app terasa 2x lebih cepat** karena feedback instan.

---

### 2. Tidak Ada Page Transition Animation

Sekarang perpindahan halaman **abrupt** — konten langsung berganti tanpa transisi. Ini terasa kasar.

Tambahkan fade-in sederhana ke main content. Cukup CSS, tidak perlu Framer Motion:

```css
/* src/app/globals.css — tambahkan ini */
@keyframes page-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

main {
  animation: page-in 0.18s ease-out;
}
```

Atau jika mau per-komponen, tambahkan class `animate-page-in` ke container utama setiap halaman:

```css
.animate-page-in {
  animation: page-in 0.18s cubic-bezier(0.25, 0.1, 0.25, 1) both;
}
```

Perlu juga tambahkan di `tailwind.config.ts`:

```ts
keyframes: {
  "page-in": {
    from: { opacity: "0", transform: "translateY(6px)" },
    to:   { opacity: "1", transform: "translateY(0)" },
  },
},
animation: {
  "page-in": "page-in 0.18s cubic-bezier(0.25, 0.1, 0.25, 1) both",
},
```

---

### 3. Sidebar Active State — Tidak Ada Transisi Saat Navigasi

Saat navigasi, sidebar item langsung "loncat" ke active state baru tanpa animasi. Terasa kasar karena perubahan warna terlalu tiba-tiba.

Sidebar sudah punya `transition-colors` yang bagus untuk hover. Tapi kurang satu hal: **instant visual feedback saat diklik** sebelum navigasi selesai.

```tsx
// src/components/layout/sidebar.tsx
// Tambahkan useRouter dan state untuk pending navigation

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

// Di dalam komponen:
const [isPending, startTransition] = useTransition();
const [pendingHref, setPendingHref] = useState<string | null>(null);

// Ganti Link biasa dengan handler yang memberi feedback instan:
<button
  key={item.slug}
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
```

Dengan `useTransition`, React akan menandai navigasi sebagai non-urgent dan sidebar bisa langsung bereaksi visual.

---

## 🟠 High Priority — Performance Issues

### 4. Customers: Query Berat — Fetch Semua Booking Per Customer

**File:** `customers/page.tsx` dan `customers-client.tsx`

```typescript
// Query ini fetch SEMUA booking untuk setiap customer di halaman:
supabase.from("customers").select(`
  id, name, phone, ...
  bookings(total, booking_date)  // ← semua booking, tidak ada LIMIT
`)
```

Jika ada customer dengan 50+ booking, semua 50 ikut di-fetch hanya untuk dihitung di JS. Dengan 25 customer per halaman, ini bisa berarti fetch 1000+ baris hanya untuk menampilkan 3 angka.

**Solusi: Buat Supabase View atau RPC:**

```sql
-- Buat view di Supabase:
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

Lalu query dari view:
```typescript
supabase
  .from("customer_stats")
  .select("id, name, phone, email, instagram, domicile, lead_id, total_bookings, total_spend, last_visit", { count: "exact" })
  .order("name")
  .range(0, PAGE_SIZE - 1)
```

**Dampak:** Query turun dari O(customers × avg_bookings) menjadi O(customers). Halaman customers akan jauh lebih cepat.

---

### 5. `force-dynamic` di Semua Halaman — Tidak Ada Caching

```typescript
// Ada di SEMUA halaman dashboard:
export const dynamic = "force-dynamic";
```

Ini benar untuk halaman yang butuh data real-time (bookings, calendar, finance). Tapi beberapa halaman bisa memanfaatkan caching lebih agresif:

- `activities/page.tsx` — bisa pakai ISR (`revalidate: 60`) karena tidak butuh real-time
- `role-management/page.tsx` — data jarang berubah, bisa cache lebih lama
- `user-management/page.tsx` — sama

Untuk halaman yang memang butuh `force-dynamic`, pastikan server query cepat dengan index database yang tepat (lihat bagian database di `CODE_REVIEW.md`).

---

### 6. `tab-progress.tsx` — Fetch di Setiap Tab Switch

```typescript
// tab-progress.tsx — useEffect ini jalan setiap kali tab "Progress" dibuka:
useEffect(() => {
  supabase
    .from("booking_status_dates")
    .select("status_type, status_date")
    .eq("booking_id", booking.id)
    .then(({ data }) => { ... });
}, [booking.id]);
```

Jika user klik tab Progress → Overview → Progress lagi, fetch terjadi dua kali. Gunakan flag untuk hanya fetch sekali:

```typescript
const [statusDates, setStatusDates] = useState<Record<string, string>>({});
const hasFetchedRef = useRef(false);

useEffect(() => {
  if (hasFetchedRef.current) return;
  hasFetchedRef.current = true;

  supabase
    .from("booking_status_dates")
    .select("status_type, status_date")
    .eq("booking_id", booking.id)
    .then(({ data }) => { ... });
}, [booking.id]);
```

---

### 7. Calendar — Konten Hilang Saat Loading

```typescript
// calendar-client.tsx
const [loading, setLoading] = useState(false);

// Lalu di render: jika loading, konten hilang atau ada overlay
```

Saat user navigasi ke minggu/bulan berikut, **kalender sebelumnya hilang** diganti loading state. Ini terasa lambat meski fetch-nya cepat.

Pola yang lebih baik: **stale-while-revalidate** — tampilkan data lama sambil fetch data baru:

```typescript
const [bookings, setBookings] = useState<CalendarBooking[]>(initialBookings);
const [isFetching, setIsFetching] = useState(false); // renamed dari loading

// Di render: tampilkan bookings lama dengan opacity berkurang, bukan hilang
return (
  <div className={cn("transition-opacity duration-150", isFetching && "opacity-50 pointer-events-none")}>
    {/* calendar content with bookings (stale data still visible) */}
  </div>
);
```

Dengan ini kalender tetap terlihat saat navigasi, hanya sedikit redup, lalu update ke data baru.

---

### 8. Activities Search — `onBlur` Bukan Debounce

```typescript
// activities-client.tsx — user harus klik di luar search box untuk trigger search
onChange={e => setSearchInput(e.target.value)}
onBlur={() => setSearch(searchInput)}
```

Ini inconsisten dengan semua halaman lain (bookings, photo-delivery) yang menggunakan debounce 300ms. Ganti dengan pola yang sama:

```typescript
// Tambahkan di activities-client.tsx
useEffect(() => {
  const t = setTimeout(() => setSearch(searchInput), 300);
  return () => clearTimeout(t);
}, [searchInput]);

// Hapus onBlur dari input:
<Input
  value={searchInput}
  onChange={e => setSearchInput(e.target.value)}
  // onBlur dihapus
  placeholder="Cari aktivitas..."
/>
```

---

## 🟡 Medium Priority — Polish & UX

### 9. `Math.random()` di Calendar Loading — Hydration Mismatch

```typescript
// calendar/loading.tsx — MASALAH:
{Math.random() > 0.6 && <Skeleton className="h-5 w-full rounded" />}
{Math.random() > 0.8 && <Skeleton className="h-5 w-full rounded" />}
```

`Math.random()` dipanggil saat SSR dan saat client hydration — hasilnya berbeda, menyebabkan **hydration mismatch warning** di console. Ganti dengan pola deterministik:

```tsx
// Gunakan index untuk menentukan apakah cell punya booking
{(day % 3 === 0) && <Skeleton className="h-5 w-full rounded" />}
{(day % 5 === 0) && <Skeleton className="h-5 w-full rounded" />}
```

---

### 10. Settings Tabs — Double Loading Saat Pertama Buka

Settings tabs menggunakan `dynamic()` (lazy load JS) + setiap tab fetch data sendiri saat pertama dibuka. Sequence-nya:

1. User klik tab "Packages"
2. Download JS chunk → ~200ms
3. Tab component mount → fetch data dari Supabase → ~300ms  
4. Total: 500ms+ untuk tab pertama

**Solusi: Prefetch data di server** untuk tab yang paling sering dibuka. Di `SettingsPage`, pass initial data ke `TabPackages`:

```tsx
// settings/page.tsx — fetch data packages di server:
const [currentUser, packages, addons] = await Promise.all([
  getCurrentUser(),
  getCachedPackages(), // sudah ada di cached-queries!
  getCachedAddons(),
]);

return <SettingsClient currentUser={currentUser} initialPackages={packages} initialAddons={addons} />;
```

Lalu di `tab-packages.tsx`, gunakan `initialPackages` sebagai initial state.

---

### 11. Inter Font — Tambahkan `display: 'swap'`

```typescript
// src/app/layout.tsx
const inter = Inter({ subsets: ["latin"] });  // ← tanpa display swap
```

Tanpa `display: 'swap'`, browser bisa menampilkan teks invisible (FOIT) saat font loading. Tambahkan:

```typescript
const inter = Inter({
  subsets: ["latin"],
  display: "swap",         // ← tambahkan ini
  preload: true,
});
```

---

### 12. Mobile Sheet — Tutup Dulu, Baru Navigasi

```typescript
// mobile-nav.tsx
<Link
  href={item.href}
  onClick={() => setOpen(false)}  // sheet tutup, lalu navigasi
>
```

Secara teknis ini sudah bagus — sheet tutup saat link diklik. Tapi pada mobile ada delay kecil karena sheet animation sedang berjalan sambil Next.js juga memproses navigasi. Tidak critical, tapi bisa ditingkatkan dengan menambahkan feedback kecil:

```tsx
<Link
  href={item.href}
  onClick={() => {
    // Tutup sheet langsung tanpa animasi untuk navigasi yang lebih cepat
    setOpen(false);
  }}
  className={cn(
    "...",
    // Tambahkan active:scale-95 untuk mobile tap feedback
    "active:scale-[0.97] transition-transform"
  )}
>
```

---

### 13. `new-booking-client.tsx` — Supabase Client Dibuat Inside Component

```typescript
// new-booking-client.tsx — createClient() di dalam komponen!
export function NewBookingClient(...) {
  const supabase = createClient();  // ← line 129, inside component
```

Ini berbeda dengan semua file lain yang membuat `const supabase = createClient()` di level module. Artinya client baru dibuat setiap kali komponen re-render. Pindahkan ke level module:

```typescript
const supabase = createClient(); // level module, di luar komponen
```

---

## ✅ Yang Sudah Bagus — Pertahankan

- **Skeleton loading di setiap halaman** — `loading.tsx` untuk semua route sudah perfect. Pengguna langsung melihat struktur halaman meski data belum datang. ✅
- **PWA dengan `aggressiveFrontEndNavCaching: true`** — Navigasi ke halaman yang sudah pernah dikunjungi sangat cepat dari cache service worker. ✅
- **`isInitialMount` pattern** — Skip refetch di semua client component saat hydration. Server data langsung dipakai, tidak ada double-fetch. ✅
- **Debounce 300ms** — Sudah ada di bookings, photo-delivery, dan step-customer-data. ✅
- **Dynamic imports untuk settings tabs** — 10+ tabs tidak semua di-load di awal. ✅
- **`optimizePackageImports: ["lucide-react"]`** — Tree-shaking icon library. ✅
- **Image AVIF/WebP + `priority` pada logo** — Image loading optimal. ✅
- **`useCallback` + `useRef` untuk stable fetch functions** — Mencegah infinite loop di `useEffect`. ✅
- **Calendar: adaptive select fields** — Day view fetch full data, week/month view fetch lightweight data. ✅
- **Parallel `Promise.all` di semua server pages** — Tidak ada sequential fetch yang tidak perlu. ✅

---

## Urutan Implementasi yang Disarankan

Untuk impact paling cepat, kerjakan dalam urutan ini:

| # | Perbaikan | Impact | Effort | Waktu |
|---|-----------|--------|--------|-------|
| 1 | Install `nextjs-toploader` di `layout.tsx` | ⭐⭐⭐⭐⭐ | 5 menit | Hari ini |
| 2 | CSS page transition `page-in` ke `main` | ⭐⭐⭐⭐ | 10 menit | Hari ini |
| 3 | Fix `Math.random()` di calendar loading | ⭐⭐⭐ | 5 menit | Hari ini |
| 4 | Fix activities search → debounce | ⭐⭐ | 10 menit | Hari ini |
| 5 | Calendar stale-while-revalidate pattern | ⭐⭐⭐⭐ | 30 menit | Minggu ini |
| 6 | `useTransition` di sidebar navigation | ⭐⭐⭐⭐ | 20 menit | Minggu ini |
| 7 | Customers → Supabase View untuk stats | ⭐⭐⭐⭐⭐ | 1 jam (DB + code) | Minggu ini |
| 8 | Fix `tab-progress` double-fetch | ⭐⭐ | 10 menit | Minggu ini |
| 9 | Settings: pass initial data dari server | ⭐⭐⭐ | 30 menit | Bulan ini |
| 10 | Font `display: swap` | ⭐⭐ | 2 menit | Hari ini |

**Item 1 dan 2 adalah yang paling cost-effective** — effort minimal, dampak visual maksimal. Setelah dua itu, website sudah terasa jauh lebih "premium" dan responsif.
