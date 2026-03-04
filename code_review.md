# Code Review Report

## Summary

| Field | Details |
|-------|---------|
| **Project** | Yoonjaespace Studio Management |
| **PR/Change** | Full project baseline audit |
| **Author** | Unknown (repository owner) |
| **Reviewer** | AI Code Review Agent (Claude Code) |
| **Date** | 2026-03-03 |
| **Tech Stack** | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase (PostgreSQL), shadcn/ui (Radix), Framer Motion, PWA |
| **Files Changed** | ~170 files (full repo) |
| **Change Type** | feature / refactor (project baseline) |

### Overall Verdict

| Overall Score | Verdict |
|---------------|---------|
| **3.35/5.0** | ⚠️ REQUEST CHANGES |

**Bottom line:** Secara umum arsitektur dan kualitas kode sudah kuat, namun ada satu isu keamanan kritis (service role key Supabase tersimpan di repo) dan beberapa gap error-handling/logging yang perlu diperbaiki sebelum dianggap production‑ready.

---

## Scorecard

### Tier 1 - Critical (40% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Security | 2/5 | Middleware auth, pemisahan admin client, dan public pages relatif aman, tetapi service role key Supabase tersimpan di repo (`SUPABASE_SERVICE_ROLE_KEY` di skill file) yang berpotensi membuka akses penuh ke database jika repo bocor. |
| Functionality and Correctness | 4/5 | Flow utama (login, booking create/list/detail, invoice/customer page publik, finance) terlihat konsisten dengan schema dan business rules; ada sedikit potensi edge case di beberapa tempat (misalnya asumsi shape data invoice) namun umumnya minor. |
| Error Handling and Resilience | 3/5 | Banyak operasi penting sudah dibungkus try/catch + toast, tetapi beberapa modul (finance, sebagian API/queries) tidak memeriksa error Supabase sama sekali sehingga kegagalan bisa silent. |

### Tier 2 - Important (35% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Architecture and Design | 4/5 | Struktur folder rapi (segmen App Router per area, utils Supabase terpisah, caching `getCurrentUser`/studio info), pemisahan Server vs Client component cukup disiplin; masih ada sedikit inkonsistensi kecil pada penamaan/konvensi log. |
| Performance and Scalability | 4/5 | Query Supabase umumnya lean-select, menggunakan pagination dan filter, serta caching di level server; belum terlihat N+1 yang berat, namun beberapa filter or/ilike berpotensi mahal jika index DB belum optimal. |
| Testing Quality | 1/5 | Tidak ditemukan test (unit/integration/e2e); untuk aplikasi bisnis kritikal seperti ini sebaiknya ada minimal test untuk auth, booking create, dan finance. |
| Readability and Maintainability | 5/5 | Penamaan jelas, komponen dipecah per langkah/tab, hooks/utilitas digunakan dengan baik, serta banyak UI yang konsisten sehingga relatif mudah dirawat dan dikembangkan. |

### Tier 3 - Improvement (25% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Code Standards and Style | 5/5 | Mengikuti gaya Next.js + TypeScript modern, linting aktif, penggunaan `interface`/type yang konsisten, serta pattern Supabase sesuai guideline internal proyek. |
| Documentation | 4/5 | Dokumentasi tingkat proyek sangat baik (`CLAUDE.md`, skill SKILL.md, context DB), namun dokumentasi inline di beberapa flow kompleks (mis. perhitungan waktu/komisi) bisa ditambah sedikit penjelasan “why”. |
| API Design | 4/5 | API internal via Supabase table/func cukup konsisten; satu route Next API untuk create user sudah memvalidasi input dan mengembalikan status HTTP yang tepat, meski belum ada lapisan versioning formal. |
| Logging and Observability | 4/5 | Pola `activity_log` sudah diterapkan di banyak CRUD (bookings, expenses, user creation), dan halaman Activities memberikan visibilitas baik; masih ada beberapa operasi yang belum tercatat dengan action yang konsisten. |
| Deployment and Configuration | 3/5 | Konfigurasi Next (PWA, remotePatterns) rapi dan environment variable dipakai untuk Supabase, namun adanya service role key di repo dan belum adanya validasi env di runtime menurunkan skor. |

---

## Findings

### Critical Issues - Must Fix

#### 1. Supabase service role key tersimpan di repository

- **File:** `.claude/skills/supabase-patterns/SKILL.md:8-13`
- **Dimension:** Security
- **Impact:** Jika repository ini bocor (publik atau dibagikan ke pihak yang tidak seharusnya), `SUPABASE_SERVICE_ROLE_KEY` memberikan akses penuh ke database Supabase (bypass RLS, bisa baca/tulis semua tabel), yang berpotensi menyebabkan kebocoran data customer, booking, dan transaksi keuangan.

**Problem:** Skill file `supabase-patterns` menyimpan nilai lengkap `SUPABASE_SERVICE_ROLE_KEY` secara hardcoded sebagai contoh konfigurasi env. Meskipun ini berada di folder dokumentasi, repository tetap berisi secret produksi yang seharusnya hanya hidup di environment hosting atau secret manager.

**Current code:**
```md
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloampvanNjc3dudHFtYWthY2FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI4OTE5OSwiZXhwIjoyMDg3ODY1MTk5fQ.UzjbQZq_W6Y7APjYpMMGx8kIevQvq41xaL2fdC5ofi4
```

**Suggested fix:**
```md
# .env.example (tanpa nilai asli)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # JANGAN commit nilai aslinya

# Langkah tambahan:
# 1. Rotate SUPABASE_SERVICE_ROLE_KEY di dashboard Supabase (Security → API).
# 2. Update secret di Vercel / environment hosting lain.
# 3. Pastikan key lama dicabut dan tidak bisa lagi mengakses DB.
```

---

### Major Issues - Should Fix Before Merge

#### 1. Nama action di activity_log untuk create user tidak konsisten

- **File:** `src/app/api/users/create/route.ts:67-75`
- **Dimension:** Logging and Observability / Architecture
- **Impact:** Halaman Activities mengandalkan nilai `action` untuk pewarnaan dan filter (`CREATE`, `UPDATE`, `DELETE`, `LOGIN`). Penggunaan action khusus `create_user` akan tampil dengan style default dan tidak ikut terfilter ketika user mencari “Create”, sehingga menyulitkan audit aktivitas terkait user management.

**Problem:** API `POST /api/users/create` menulis log activity dengan `action: "create_user"` sementara modul lain menggunakan enum singkat `CREATE/UPDATE/DELETE/LOGIN`. Ini membuat konsumen log harus memahami dua skema berbeda.

**Suggested fix:** Gunakan action enum yang sama dengan modul lain, dan pindahkan tipe event spesifik ke `entity` atau `description`. Contoh:
```ts
await supabase.from("activity_log").insert({
  user_id: callerData?.id ?? null,
  user_name: callerData?.name ?? "System",
  user_role: callerRole?.name ?? null,
  action: "CREATE",            // konsisten dengan modul lain
  entity: "users",
  entity_id: newUser.id,
  description: `Membuat user baru: ${name} (${email})`,
});
```

#### 2. Operasi finance (insert/update/delete expenses) belum menangani error Supabase

- **File:** `src/app/(dashboard)/finance/_components/finance-client.tsx:152-229`
- **Dimension:** Error Handling and Resilience / Functionality
- **Impact:** Jika terjadi error jaringan atau constraint error di tabel `expenses`, user tidak akan mendapat feedback apa pun, dan state tampilan bisa tidak sinkron dengan data DB. Hal ini berisiko menimbulkan laporan keuangan yang salah tanpa disadari.

**Problem:** Fungsi `handleDeleteExpense` dan `handleSaveExpense` memanggil Supabase tanpa try/catch dan tanpa memeriksa `error` return value. Di sisi lain, modul bookings sudah menggunakan pola try/catch + toast yang baik.

**Suggested fix:** Selaraskan dengan pola error-handling di modul bookings. Contoh:
```ts
async function handleDeleteExpense(expense: Expense) {
  if (!confirm(`Hapus pengeluaran "${expense.description}"?`)) return;
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    if (error) throw error;

    await supabase.from("activity_log").insert({ /* ... */ });
    fetchData();
  } catch (err) {
    console.error(err);
    // gunakan toast jika tersedia
    // toast({ title: "Error", description: "Gagal menghapus pengeluaran", variant: "destructive" });
  }
}
```

#### 3. Activities log fetch tidak memeriksa error Supabase

- **File:** `src/app/(dashboard)/activities/_components/activities-client.tsx:71-88`
- **Dimension:** Error Handling and Resilience
- **Impact:** Jika query ke `activity_log` gagal, UI akan menampilkan daftar kosong tanpa penjelasan, yang berpotensi menyesatkan user (tampak seperti tidak ada aktivitas, padahal query gagal).

**Problem:** `fetchLogs` memanggil Supabase dan langsung meng-set data tanpa memeriksa `error`. Komponen lain (bookings, new booking) sudah menggunakan pola error handling yang lebih defensif.

**Suggested fix:** Tambahkan pemeriksaan error dan feedback ke user:
```ts
const { data, count, error } = await query;
if (error) {
  console.error(error);
  // if you have toast: toast({ title: "Error", description: "Gagal memuat activity log", variant: "destructive" });
  setLogs([]);
  setTotal(0);
  return;
}
setLogs(data ?? []);
setTotal(count ?? 0);
```

---

### Minor Issues - Recommended

- **File:** `src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx:69-76` — Penentuan `invoiceDate` menggunakan tanggal hari ini jika `invoice.invoice_date` tidak ada; akan lebih jelas jika ini di-handle di server (data selalu memiliki `invoice_date`) sehingga komponen publik tidak perlu fallback yang berpotensi menyesatkan.
- **File:** `src/app/(dashboard)/finance/_components/finance-client.tsx:103-120` — `PackageStat.package_id` diisi dengan nama paket karena tidak ada `package_id` di select; ini bekerja untuk tampilan, tetapi lebih bersih jika query Supabase juga mengembalikan `packages(id, name)` dan `package_id` benar-benar ID.

---

### Nitpicks - Non-Blocking

- **Nit:** `src/app/(dashboard)/bookings/_components/bookings-client.tsx:170-168` — Penamaan state `search` dan `searchInput` sudah jelas, namun komentar singkat bahwa `search` adalah nilai debounced akan membantu pembaca baru.
- **Nit:** `src/app/(dashboard)/layout.tsx:12-17` — Komentar yang menjelaskan penggunaan `cache` dan `unstable_cache` sudah baik; bisa dipertimbangkan untuk memindahkan penjelasan lebih detail ke file utilitas (`cached-queries`) agar layout tetap sangat ringkas.

---

## Positive Highlights

- Implementasi flow booking (multi-step wizard, perhitungan durasi & konflik jadwal, integrasi ke invoice & customer public page) sangat matang dan mengikuti business rule yang sudah terdokumentasi.
- Pola Supabase (client/server/middleware/admin) konsisten dengan best practice, termasuk caching user di server dan penggunaan lean select dengan alias join yang jelas.
- UX dan UI mobile-first sangat bagus, terutama untuk halaman publik (Customer Page, Invoice) dan halaman Activities yang memberikan visibility audit log yang kuat.

---

## Technology-Specific Checks

### Next.js Specific

| Check | Status | Notes |
|-------|--------|-------|
| Server/Client Component boundaries correct | OK | Halaman utama menggunakan Server Components, interaktivitas dipindahkan ke client components (mis. `LoginClient`, `BookingsClient`, `FinanceClient`). |
| use client pushed to leaf components | OK | `use client` hanya muncul di komponen UI interaktif; layout dan page utama umumnya tetap server-side. |
| Server Actions validate inputs and re-auth | N/A | Tidak menggunakan Server Actions Next.js, mutasi data dilakukan via Supabase client (client/server) dan satu Next API route. |
| server-only import on sensitive modules | WARN | Admin client Supabase hanya digunakan di server/API, namun belum menggunakan paket `server-only` untuk mencegah import dari client secara tidak sengaja. |
| No secrets in NEXT_PUBLIC_ variables | OK | Kode hanya menggunakan `NEXT_PUBLIC_*` untuk URL dan publishable key; service role key diakses via `SUPABASE_SERVICE_ROLE_KEY` (namun nilainya saat ini tersimpan di repo). |
| next/image used with proper attributes | OK | Komponen publik dan login menggunakan `next/image` dengan `width`/`height` atau `fill` yang benar. |
| Caching strategy appropriate | OK | `getCurrentUser` dibungkus `React.cache()` dan studio info memakai cache utilities; query lain di-fetch on-demand di client sesuai kebutuhan. |
| loading.tsx / error.tsx in key routes | WARN | `loading.tsx` sudah ada untuk banyak segmen, namun `error.tsx` khusus belum terlihat sehingga error runtime mungkin tidak ter-handle dengan UX khusus. |
| Middleware is lightweight | OK | Middleware hanya meng-handle update session Supabase dan redirect login/dashboard tanpa melakukan fetch mahal lain. |
| Dynamic route params validated | OK | Route dinamis (bookingId, id) selalu digunakan sebagai UUID untuk query Supabase; validasi tambahan (mis. 404 jika data tidak ada) sebaiknya dijaga konsisten di semua page. |

### Laravel Specific

| Check | Status | Notes |
|-------|--------|-------|
| Thin controllers (logic in Services/Actions) | N/A | Tidak menggunakan Laravel. |
| Form Requests for validation | N/A | Tidak menggunakan Laravel. |
| Eager loading with() — no N+1 | N/A | Tidak menggunakan Laravel. |
| fillable / guarded on all models | N/A | Tidak menggunakan Laravel. |
| Authorization via Policies/Gates | N/A | Tidak menggunakan Laravel. |
| API Resources for response formatting | N/A | Tidak menggunakan Laravel. |
| Queue jobs have tries/backoff/failed() | N/A | Tidak menggunakan Laravel. |
| Rate limiting on auth and API routes | N/A | Tidak menggunakan Laravel. |
| No raw SQL with string interpolation | N/A | Tidak menggunakan Laravel. |
| Migrations have down() and FK constraints | N/A | Tidak menggunakan Laravel. |

### Flutter Specific

| Check | Status | Notes |
|-------|--------|-------|
| Clean architecture layers respected | N/A | Tidak menggunakan Flutter. |
| Domain layer free of Flutter imports | N/A | Tidak menggunakan Flutter. |
| No business logic in build() methods | N/A | Tidak menggunakan Flutter. |
| BLoC/Cubit single responsibility | N/A | Tidak menggunakan Flutter. |
| const constructors used where possible | N/A | Tidak menggunakan Flutter. |
| ListView.builder for long lists | N/A | Tidak menggunakan Flutter. |
| Stream/subscription cleanup | N/A | Tidak menggunakan Flutter. |
| setState() not high in widget tree | N/A | Tidak menggunakan Flutter. |
| No print statements in production | N/A | Tidak menggunakan Flutter. |
| equatable used for BLoC states | N/A | Tidak menggunakan Flutter. |

### Database Specific

| Check | Status | Notes |
|-------|--------|-------|
| Proper indexes on queried columns | WARN | Tidak terlihat definisi index di repo; asumsi ditangani via migration Supabase, namun query dengan filter `booking_date`, `status`, dan `customer_id` akan diuntungkan jika diindex. |
| Foreign keys with ON DELETE behavior | OK | Pola insert `booking_backgrounds`, `booking_addons`, `booking_custom_fields` mengasumsikan FK cascade yang sudah didefinisikan di DB schema skill. |
| Migrations are backward-compatible | N/A | Migrasi tidak ada di repo; diasumsikan dikelola langsung di Supabase. |
| Parameterized queries (no interpolation) | OK | Semua akses DB melalui Supabase client (`.eq`, `.gte`, `.or`, `.rpc`) tanpa string interpolation mentah. |
| Pagination on large result sets | OK | Halaman bookings dan activity log menggunakan `.range`/`PAGE_SIZE` untuk pagination. |
| No N+1 query patterns | OK | List bookings dan finance menggabungkan relasi via select nested (`customers`, `packages`, `users`) sehingga tidak memicu N+1. |
| Connection pool configured | N/A | Dikelola oleh Supabase sebagai managed service. |
| Timestamps timezone-aware (UTC) | WARN | Schema di skill menyebut penggunaan tipe timestamp; tidak ada konversi eksplisit di kode sehingga penting memastikan default DB adalah UTC. |

### API Design Specific

| Check | Status | Notes |
|-------|--------|-------|
| RESTful resource naming (plural, no verbs) | OK | Satu API route `api/users/create` sedikit bercampur antara resource dan verb, namun fungsi utamanya jelas dan scope-nya sempit. |
| Correct HTTP status codes | OK | Route `POST /api/users/create` menggunakan 401, 400, dan 500 dengan tepat sesuai jenis error. |
| Consistent error response format | WARN | Response error berupa `{ error: string }`; belum mengikuti format RFC 7807, namun konsisten di dalam route tersebut. |
| Pagination on list endpoints | N/A | API routing untuk list data sebagian besar via Supabase langsung dari client/server, bukan REST endpoint khusus. |
| Input validation on all endpoints | OK | Route `users/create` memvalidasi field wajib dan memeriksa error dari Supabase; validasi tambahan (panjang password, format phone) bisa dipertimbangkan. |
| Authentication/authorization enforced | OK | Middleware Supabase dan pengecekan user di route memastikan hanya user terautentikasi yang bisa memanggil API sensitif. |
| Rate limiting configured | N/A | Tidak ada konfigurasi rate limiting di level Next.js yang terlihat; kemungkinan mengandalkan proteksi Supabase dan platform hosting. |
| CORS properly configured | N/A | Tidak ada config CORS eksplisit di repo; diasumsikan memakai default platform (Vercel + Supabase). |

---

## Security Checklist (OWASP Top 10)

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | OK | Middleware memaksa login untuk semua route non-publik dan public pages hanya read-only berdasarkan `bookingId`. |
| A02 | Cryptographic Failures | WARN | Penggunaan HTTPS via Vercel/Supabase sudah standar, namun penyimpanan service role key di repo termasuk kategori poor secret handling. |
| A03 | Injection | OK | Query hanya melalui Supabase client dengan parameter terikat; tidak ada SQL/string building manual. |
| A04 | Insecure Design | WARN | Desain mengandalkan Supabase RLS (tidak terlihat di repo), dan adanya service role key di dokumentasi menunjukkan perlu review menyeluruh konfigurasi keamanan di dashboard Supabase. |
| A05 | Security Misconfiguration | WARN | `next.config.mjs` remotePatterns cukup ketat, tetapi secret di file skill dan ketiadaan validasi env runtime mengindikasikan konfigurasi security belum sepenuhnya tertutup. |
| A06 | Vulnerable Components | FAIL | Service role key Supabase yang valid tersimpan di repo sehingga komponen database menjadi rentan jika key tidak segera di-rotate. |
| A07 | Auth Failures | OK | Login memakai Supabase Auth dengan middleware refresh session; route publik jelas dipisahkan. |
| A08 | Data Integrity Failures | OK | Aktivitas penting (booking, expenses, user create) dicatat ke `activity_log`, membantu audit integritas data. |
| A09 | Logging and Monitoring Gaps | WARN | Activity log kuat, namun tidak semua kegagalan (misalnya error Supabase di finance/activities) tercatat atau diberi sinyal ke user. |
| A10 | SSRF | N/A | Tidak ada fitur yang menerima URL eksternal untuk di-fetch server-side; penggunaan storage Supabase hanya untuk upload/getPublicUrl. |

---

## Deployment Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables documented and validated | WARN | Env sudah dijelaskan di skill, tetapi tidak ada utilitas runtime (mis. `zod` schema) untuk memvalidasi bahwa semua env wajib sudah ter-set di production. |
| No secrets in source code or client bundles | FAIL | Service role key Supabase disimpan di repository; meski tidak digunakan dari client, keberadaannya di source sudah melanggar best practice. |
| Build succeeds in production mode | OK | Konfigurasi Next.js sederhana dan mengikuti template resmi; tidak ada custom build step berisiko. |
| Database migrations tested and reversible | N/A | Migrasi dikelola di Supabase, tidak ada file migrasi di repo untuk direview. |
| Health check endpoints functional | N/A | Tidak ada healthcheck custom; kesehatan aplikasi diasumsikan dari status Vercel/Supabase. |
| Graceful shutdown handling | N/A | Ditangani oleh platform (Vercel serverless/edge); tidak ada long-lived server di repo. |
| Feature flags for risky changes | N/A | Tidak ada mekanisme feature flag eksplisit; untuk saat ini scope fitur masih manageable. |
| Rollback plan identified | WARN | Tidak ada dokumentasi proses rollback; mengingat ketergantungan pada Supabase schema, sebaiknya dipikirkan strategi rollback (backup DB dan revert deploy). |

---

## Action Items Summary

### Must Fix (Before Merge)

1. Rotasi dan hapus `SUPABASE_SERVICE_ROLE_KEY` yang tersimpan di repo, ganti dengan placeholder env dan pastikan key lama dicabut sepenuhnya — `.claude/skills/supabase-patterns/SKILL.md:8-13`.

### Should Fix (Recommended)

1. Selaraskan nilai `action` di `activity_log` untuk create user agar menggunakan enum `CREATE` seperti modul lain — `src/app/api/users/create/route.ts:67-75`.
2. Tambahkan error handling (try/catch + feedback user) untuk operasi insert/update/delete di modul Finance dan Activities — `src/app/(dashboard)/finance/_components/finance-client.tsx` dan `src/app/(dashboard)/activities/_components/activities-client.tsx`.

### Consider (Optional)

1. Perkuat pengetesan otomatis (minimal smoke test untuk login, create booking, dan laporan finance) dan tambah validasi runtime untuk environment variables kritikal.

---

*Review generated by AI Code Review Agent via Claude Code CLI. Scoring methodology based on Google Engineering Practices, SonarQube quality models, and Vercel performance rules.*
