# Yoonjaespace Studio Management — Step-by-Step Development Guide

> Dokumen ini berisi panduan lengkap untuk membangun Yoonjaespace Studio Management App.
> Setiap step berisi: **apa yang di-prompt ke AI**, **apa yang dilakukan manual**, dan **checklist verifikasi**.

---

## Informasi Proyek

| Item | Detail |
|------|--------|
| Nama Project | yoonjaespace-studio |
| Tech Stack | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, Supabase JS |
| Database | Supabase (PostgreSQL) |
| Storage Bucket | images-yoonjae |
| Auth | Supabase Auth (email + password) |
| Deployment | Vercel |
| Owner Account | yoonjae@gmail.com / admin123 |
| Theme | Light theme, aksen merah (dari logo Yoonjaespace) |
| Prioritas | Mobile-first, performa cepat |

### Supabase Credentials (untuk .env.local)

```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase dashboard → Settings → API>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<publishable / anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server-side only, NEVER expose to browser>
```

⚠️  Do not commit real key values. Rotate any key that has ever been committed (Supabase dashboard → Settings → API → Reset).

---

## Cara Menggunakan Dokumen Ini

1. Kerjakan berurutan dari Step 0 sampai Step 12
2. Setiap step ada bagian PROMPT (paste ke AI agent) dan MANUAL (kamu lakukan sendiri)
3. Selalu paste Master Context di awal setiap sesi prompting baru
4. Setelah setiap step, jalankan Checklist sebelum lanjut ke step berikutnya
5. Jika ada error, kirimkan error message ke AI beserta konteks step yang sedang dikerjakan

---

## STEP 0: Setup Database (MANUAL)

> Step ini sepenuhnya manual — dilakukan di Supabase Dashboard.

### Manual Actions

1. Buka https://supabase.com/dashboard lalu pilih project Yoonjaespace
2. Buka SQL Editor
3. Paste dan jalankan isi file 001_yoonjaespace_schema.sql (yang sudah diberikan sebelumnya)
4. Tunggu sampai semua query berhasil (tidak ada error merah)

### Verifikasi

- [ ] Buka Table Editor, pastikan ada 24 tabel
- [ ] Settings: settings_general, studio_holidays, settings_studio_info, settings_reminder_templates
- [ ] Master Data: packages, backgrounds, addons, vouchers, custom_fields, leads, photo_for
- [ ] Auth: roles, users
- [ ] Core: customers, vendors, bookings, booking_backgrounds, booking_addons, booking_custom_fields
- [ ] Finance: expenses, commissions
- [ ] Support: booking_reminders, activity_log, invoices
- [ ] Cek tabel roles: harus ada 1 row "Owner" dengan is_system = true
- [ ] Cek tabel settings_general: harus ada 1 row default
- [ ] Cek tabel settings_studio_info: harus ada 1 row default
- [ ] Cek tabel settings_reminder_templates: harus ada 1 row default
- [ ] Buka Storage: pastikan bucket images-yoonjae sudah ada dan policies sudah ter-set

### Troubleshooting

- type "booking_status" already exists: tabel sudah pernah dibuat. Drop semua dulu atau buat project Supabase baru.
- permission denied: pastikan menjalankan di SQL Editor sebagai postgres role (default).

---

## STEP 1: Project Setup + Supabase Client

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 1 — Project Setup + Supabase Client

Buatkan project Next.js 14 (App Router) dengan konfigurasi berikut:

Tech stack:
- Next.js 14, TypeScript, Tailwind CSS
- ShadCN UI (init dan install semua komponen dasar: button, input, dialog, sheet, select, table, card, badge, tabs, dropdown-menu, toast, skeleton, separator, checkbox, label, textarea, popover, calendar, command, avatar, tooltip, switch, alert-dialog, scroll-area, form)
- Framer Motion
- @supabase/ssr dan @supabase/supabase-js
- Lucide React untuk icons

Supabase client setup (PENTING ikuti pattern ini):

1. utils/supabase/client.ts — browser client pakai createBrowserClient
2. utils/supabase/server.ts — server client pakai createServerClient dengan cookies
3. utils/supabase/middleware.ts — middleware client untuk auth session refresh
4. utils/supabase/admin.ts — admin client pakai service role key (untuk user management)

Env variables yang dipakai:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (BUKAN anon key biasa)
- SUPABASE_SERVICE_ROLE_KEY

Pattern koneksi Supabase (untuk performa cepat):
- Server Components: fetch data via server client (SSR)
- Client Components: fetch via browser client
- Parallel queries pakai Promise.all() untuk multiple table fetch
- Lean selects: hanya select kolom yang dibutuhkan
- Optimistic updates untuk write operations

Folder structure:
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx (sidebar + mobile nav)
      dashboard/page.tsx
      bookings/page.tsx
      bookings/new/page.tsx
      bookings/[id]/page.tsx
      calendar/page.tsx
      customers/page.tsx
      customers/[id]/page.tsx
      reminders/page.tsx
      finance/page.tsx
      vendors/page.tsx
      commissions/page.tsx
      activities/page.tsx
      user-management/page.tsx
      role-management/page.tsx
      settings/page.tsx
    (public)/
      customer/[bookingId]/page.tsx
      invoice/[bookingId]/page.tsx
      mua/page.tsx
    layout.tsx
    page.tsx (redirect ke /dashboard atau /login)
  components/
    ui/ (ShadCN components)
    layout/sidebar.tsx, mobile-nav.tsx, header.tsx
    shared/ (reusable components)
  lib/
    types/database.ts (TypeScript types sesuai schema)
    utils.ts
    constants.ts
  hooks/use-current-user.ts
  middleware.ts (Next.js middleware untuk auth protection)

middleware.ts (root):
- Cek Supabase auth session
- Jika tidak ada session -> redirect ke /login
- Jika ada session -> lanjut
- KECUALI routes: /login, /customer/*, /invoice/*, /mua/* (public)

Buat juga TypeScript types di lib/types/database.ts yang merepresentasikan semua tabel dari schema.

Color theme (Tailwind config):
- Light theme
- Primary/accent: merah maroon (#8B1A1A atau sesuaikan dari logo Yoonjaespace)
- Background: putih/light gray
- Text: dark gray/black
- Sidebar: white/off-white dengan border

Jangan buat konten halaman dulu, cukup placeholder "Coming Soon" untuk setiap page.
TAPI pastikan routing, layout, sidebar, dan auth middleware sudah berfungsi.
```

### Manual Actions (setelah AI selesai)

1. Buat file .env.local di root project dengan credentials di atas
2. Upload logo Yoonjaespace ke folder public/ sebagai logo.png
3. Jalankan npm run dev dan test:
   - Buka http://localhost:3000 -> harus redirect ke /login
   - Buka http://localhost:3000/customer/test -> harus bisa diakses (public)

### Verifikasi

- [ ] npm run dev berjalan tanpa error
- [ ] Routing bekerja (/, /login, /dashboard, dll)
- [ ] Middleware redirect ke /login saat belum login
- [ ] Public routes (/customer/*, /invoice/*, /mua/*) bisa diakses tanpa login
- [ ] Sidebar muncul di halaman dashboard (desktop dan mobile)
- [ ] ShadCN components ter-install (cek folder components/ui/)
- [ ] TypeScript types ter-generate sesuai schema
- [ ] Theme merah maroon terlihat di sidebar/accent

---

## STEP 2: Auth — Login Page + Seed Owner Account

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 2 — Auth (Login Page + Owner Account Seeding)

Yang sudah diimplementasi: Project setup, folder structure, Supabase client, middleware, layout, sidebar, TypeScript types

Buatkan:

1. LOGIN PAGE (/login)
   - Tampilan: clean, centered, mobile-friendly
   - Logo Yoonjaespace di atas (dari /logo.png)
   - Form: email + password
   - Button Login
   - Loading state saat login
   - Error handling (wrong email/password, network error)
   - Setelah login berhasil -> redirect ke /dashboard
   - Pakai Supabase Auth signInWithPassword
   - Warna aksen merah maroon sesuai theme

2. LOGOUT FUNCTIONALITY
   - Button logout di sidebar (paling bawah)
   - Pakai Supabase Auth signOut
   - Setelah logout -> redirect ke /login

3. SEED SCRIPT untuk Owner Account
   - Buat file: scripts/seed-owner.ts
   - Script ini:
     a. Create user di Supabase Auth: email yoonjae@gmail.com, password admin123
     b. Get role "Owner" dari tabel roles
     c. Insert ke tabel users: nama "Yoonjaespace Owner", email yoonjae@gmail.com, role_id = Owner role, is_primary = true, auth_id = auth user id
   - Pakai Supabase service role key (admin client)
   - Buat juga perintah npm script di package.json: "seed:owner"

4. HOOK: use-current-user
   - Custom hook yang:
     a. Get current auth session
     b. Fetch user data dari tabel users (join dengan roles)
     c. Return: user data, role, menu_access, loading state
   - Cache hasilnya agar tidak fetch ulang setiap render

5. UPDATE SIDEBAR
   - Tampilkan menu berdasarkan menu_access dari role user yang login
   - Menu yang tidak ada di menu_access -> hidden
   - Tampilkan nama user dan role di bagian bawah sidebar (di atas logout button)

Referensi desain sidebar:
- Clean, white/off-white background
- Logo di atas
- Menu items dengan icon Lucide
- Active state: background merah maroon soft, text merah maroon
- Hover state: light gray background
- Collapsible di mobile (slide dari kiri atau bottom sheet)
```

### Manual Actions (setelah AI selesai)

1. Jalankan seed script: npx tsx scripts/seed-owner.ts
2. Verifikasi di Supabase Dashboard:
   - Authentication -> Users -> harus ada yoonjae@gmail.com
   - Table Editor -> users -> harus ada 1 row dengan is_primary = true
3. Test login di browser:
   - Buka /login -> masukkan yoonjae@gmail.com / admin123
   - Harus berhasil masuk ke /dashboard
   - Sidebar menampilkan semua menu (karena Owner)
   - Logout -> kembali ke /login

### Verifikasi

- [ ] Login berhasil dengan yoonjae@gmail.com / admin123
- [ ] Redirect ke /dashboard setelah login
- [ ] Sidebar menampilkan semua 12 menu
- [ ] Nama "Yoonjaespace Owner" dan role "Owner" tampil di sidebar
- [ ] Logout berfungsi dan redirect ke /login
- [ ] Error handling: salah password -> pesan error muncul
- [ ] Mobile: login page responsive, sidebar bisa di-toggle
- [ ] Loading state terlihat saat proses login

---

## STEP 3: Settings Page (Semua Tab)

> PENTING: Settings adalah fondasi. Hampir semua halaman lain bergantung pada data dari Settings.

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 3 — Settings Page (Semua Tab)

Yang sudah diimplementasi: Project setup, Auth (login/logout), Sidebar, use-current-user hook

Tabel yang dipakai:
- settings_general, studio_holidays, settings_studio_info, settings_reminder_templates
- packages, backgrounds, addons, vouchers, custom_fields, leads, photo_for

Route: /settings

Buatkan halaman Settings dengan tab-based layout menggunakan ShadCN Tabs. Tab yang tersedia:

Tab 1: General
- Form: Open Time dan Close Time (time picker), Time Slot Interval (number, menit), Default Payment Status (radio: Paid/Unpaid)
- Button "Save Changes"
- Tanggal Libur Studio: CRUD list. Tambah (single date atau date range + label). Data dari studio_holidays
- Tampilkan list libur dengan opsi hapus

Tab 2: Reminder Message Template
- 3 textarea: Reminder Message, Thank You Message, Thank You for Payment Message
- Available Variables yang bisa diklik untuk insert: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}
- Button "Save Changes"

Tab 3: Studio Info
- Upload Logo Studio -> Supabase Storage "images-yoonjae", path "studio/logo"
  - PENTING: upsert: true agar file lama terganti otomatis
  - Tampilkan preview logo saat ini
- Upload Foto Tampak Depan -> path "studio/front-photo", logic sama
- Form: Studio Name, Address, Google Maps URL, WhatsApp Number, Email, Instagram
- Footer Text (textarea)
- Button "Save Changes"

Tab 4: Packages
- CRUD. List/card paket. Button "Add Package" -> modal: Name, Description, Price (Rupiah), Duration (menit), Include All Photos (checkbox), Need Extra Time (checkbox + durasi menit), Active/Inactive (switch)
- Edit dan Delete per item

Tab 5: Backgrounds
- CRUD. Button "Add Background" -> modal: Name, Description, Available for Use (checkbox)

Tab 6: Add-ons
- CRUD. Button "Add Add-on" -> modal: Name, Price, Need Extra Time (checkbox + durasi), Active/Inactive

Tab 7: Vouchers
- CRUD. Button "Add Voucher" -> modal: Code, Discount Type (percentage/fixed), Value, Valid From, Valid Until, Minimum Purchase, Active/Inactive

Tab 8: Custom Fields
- CRUD. Button "Add Custom Field" -> modal: Label, Field Type (Text/Select/Checkbox/Number/URL), Active/Inactive
- Jika type = Select -> input untuk opsi-opsi (simpan sebagai JSON di kolom options)

Tab 9: Leads
- CRUD sederhana: name + is_active

Tab 10: Photo For
- CRUD sederhana: name + is_active

Catatan:
- Semua CRUD harus CEPAT (optimistic updates)
- Format harga Rupiah, simpan di DB sebagai bigint
- Mobile: tab horizontal scrollable
- Setiap perubahan berhasil -> toast notification
- Setiap operasi CRUD -> catat di activity_log
- Loading: skeleton loader saat fetch pertama
```

### Manual Actions (setelah AI selesai)

1. Test setiap tab: tambah, edit, hapus data. Cek di Supabase Table Editor.
2. Upload test logo dan foto studio. Cek Storage bucket path benar. Upload ulang -> file lama terganti.
3. Test di mobile view (Chrome DevTools responsive).

### Verifikasi

- [ ] Tab General: save/load settings, CRUD libur
- [ ] Tab Reminder: save/load 3 template, variable buttons
- [ ] Tab Studio Info: upload logo (upsert), upload foto (upsert), save/load info
- [ ] Tab Packages: CRUD lengkap, extra time conditional
- [ ] Tab Backgrounds: CRUD lengkap
- [ ] Tab Add-ons: CRUD lengkap
- [ ] Tab Vouchers: CRUD lengkap
- [ ] Tab Custom Fields: CRUD lengkap, select options
- [ ] Tab Leads: CRUD
- [ ] Tab Photo For: CRUD
- [ ] Toast notifications, activity log, mobile responsive
- [ ] Tidak ada loading lama (< 1 detik CRUD)

---

## STEP 4: Role Management + User Management

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 4 — Role Management + User Management

Yang sudah diimplementasi: Project setup, Auth, Sidebar, Settings

Tabel: roles, users (+ Supabase Auth)

A. Role Management (/role-management)
Card-based list. Setiap card: nama, deskripsi, badge jumlah user, Edit/Delete.
- Role Owner (is_system=true) tidak bisa dihapus
- Add Role modal: Role Name, Description, Hak Akses Menu (checkbox list semua menu sidebar)
- menu_access disimpan sebagai JSON array slugs
- Delete role -> cek ada user yang pakai, jika ada tolak

B. User Management (/user-management)
Tabel: Nama, Email, Role, Status, Created At, Action.
- Add User modal: Name, Email, Phone, Password, Confirm Password, Role (dropdown), Active/Inactive
- Logic Add User: 1) Create di Supabase Auth (pakai admin/service role via API route), 2) Insert ke users table
- Detail User: tampilkan info
- Edit: nama, phone, role, status (bukan email/password)
- Delete: is_primary=true tidak bisa dihapus. Delete dari users DAN Supabase Auth via API route.

Catat semua di activity_log.
```

### Manual Actions

1. Coba hapus role Owner -> ditolak
2. Buat role "Staff" dengan akses terbatas
3. Tambah user baru, login dengan akun baru -> sidebar sesuai role
4. Coba hapus Owner pertama -> ditolak

### Verifikasi

- [ ] Role CRUD (kecuali Owner system)
- [ ] Delete role yang dipakai -> ditolak
- [ ] User CRUD, sync Supabase Auth
- [ ] Owner pertama tidak bisa dihapus
- [ ] Login user baru -> sidebar sesuai role
- [ ] Activity log, mobile responsive

---

## STEP 5: Bookings — Create, List, Detail

> Modul paling kompleks. Pastikan Settings sudah sempurna.

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 5 — Bookings (Create, List, Detail)

Yang sudah diimplementasi: Project setup, Auth, Sidebar, Settings (semua tab), Role dan User Management

Tabel: bookings, booking_backgrounds, booking_addons, booking_custom_fields, customers, packages, backgrounds, addons, vouchers, custom_fields, leads, photo_for, settings_general, studio_holidays, users, invoices

A. Booking List (/bookings)
- Button "Buat Booking" -> /bookings/new
- Tabel: Booking ID (YJS-...), Customer, Date, Time, Package, Status (badge), Handled By, Created At, Total (Rp), Action (Detail, Delete)
- Filter: status dropdown + date range. Search: by name/ID. Pagination: default 10. Sort: created_at desc.

B. Create New Booking (/bookings/new)

Step 1: Pilih tipe - "Booking Baru" atau "Booking Lama"
- Booking Lama -> search customer by name/phone -> auto-fill

Step 2: Data Customer (jika baru): Nama, WhatsApp (VALIDASI unique), Email, Instagram, Alamat, Domisili, Leads (dropdown dari leads table)

Step 3: Pilih Sesi
- Tanggal (date picker). Jika tanggal libur -> ALERT studio tutup
- Waktu mulai -> BUTTON GRID (bukan dropdown). Generate dari open_time ke close_time dengan interval time_slot_interval

Step 4: Detail Booking
- Jumlah orang, Paket (dropdown dari packages active), Background (multi-select dari backgrounds available), Photo For (dropdown), Notes, Behind the Scenes (checkbox)

Step 5: Estimasi Waktu
- Mulai: dari step 3. Selesai: auto = start + package.duration + extra_time. Tampil info box.

Step 6: Add-ons (multi-select checkbox dari addons active)

Step 7: Diskon
- Input voucher code (validasi: active, date range, min purchase) ATAU manual discount. Tidak bisa keduanya.

Step 8: Staff in Charge (dropdown users active, default = current user)

Step 9: Ringkasan Harga: paket + addons + subtotal + diskon + total

Step tambahan: Additional Information (Custom Fields)
- Render custom_fields yang active sesuai field_type
- Simpan di booking_custom_fields

Button "Create Booking":
- Generate booking_number (fungsi DB)
- Insert customer (jika baru) -> booking -> booking_backgrounds -> booking_addons -> booking_custom_fields
- Generate invoice (insert invoices)
- Status awal: cek settings_general.default_payment_status (paid->PAID, unpaid->BOOKED)
- Activity log. Redirect ke /bookings/[id]

C. Booking Detail (/bookings/[id])

Header: Back, Customer Page link, WA number, Invoice link, Delete

3 Tabs:

Tab Overview: semua info booking, customer info, sesi, paket, backgrounds, addons, BTS, custom fields values, created by

Tab Progress:
- Visual timeline/stepper
- Next/Back buttons
- Flow: BOOKED -> PAID -> SHOOT_DONE -> PHOTOS_DELIVERED -> ADDON_UNPAID -> CLOSED -> CANCELED
- Saat SHOOT_DONE: form Google Drive link + button Deliver -> status jadi PHOTOS_DELIVERED
- Print Order (Start Print button):
  - Sub-timeline: SELECTION -> VENDOR -> PRINTING -> RECEIVE -> PACKING -> SHIPPED -> DONE
  - Next/Back buttons
- Activity log setiap perubahan status

Tab Pricing:
- Harga paket + addons awal
- "Add Extra Add-on" -> dropdown + add button. is_extra=true, is_paid=false default
- Toggle Lunas/Belum Lunas per extra addon
  - Semua lunas -> status kembali ke progress terakhir
  - Ada belum lunas -> ADDON_UNPAID
- Ringkasan total

Performa: SSR fetch + parallel queries, optimistic updates, mobile-first
```

### Manual Actions

1. Buat data test di Settings (min 2 paket, 3 background, 2 addon, 1 voucher)
2. Test semua flow Create Booking
3. Test Booking List (filter, search, pagination)
4. Test Booking Detail (semua tab, status flow, extra addon)

### Verifikasi

- [ ] Create: semua field, time slot grid, holiday alert, phone validation, voucher validation, custom fields, price summary, booking number generated, invoice auto-created, status sesuai settings
- [ ] List: search, filter, sort, pagination
- [ ] Detail Overview: semua data + custom fields
- [ ] Detail Progress: status flow, Google Drive deliver, print order
- [ ] Detail Pricing: extra addon, toggle lunas, status update
- [ ] Activity log, mobile responsive

---

## STEP 6: Customer Page + Invoice (Public)

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 6 — Customer Page + Invoice (Public)

Yang sudah diimplementasi: Semua Step 1-5

Tabel: bookings, booking_addons, booking_backgrounds, customers, packages, addons, backgrounds, settings_studio_info, settings_general, invoices

PENTING: Halaman PUBLIK, tanpa login. Fetch via anon Supabase client.

A. Customer Page (/customer/[bookingId])
- Mobile-first, estetik, branded merah maroon
- Header: Logo + nama studio (dari settings_studio_info)
- Sapaan "Hai, [nama customer]" + Booking ID
- Status Timeline: 2 status terakhir (booking + print order), expand/collapse
- Button "View Your Photos": HANYA jika status >= PHOTOS_DELIVERED, link ke google_drive_link
- Invoice: preview ringkas + button download (buka /invoice/[bookingId] tab baru)
- Booking Details: tanggal, waktu, paket, print order status
- Studio Info: nama, foto depan, alamat, jam buka, buttons IG/WA/Maps
- Thank you message
- Button "Book Again" -> wa.me/[studio_whatsapp]

B. Invoice Page (/invoice/[bookingId])
- Header buttons (HANYA jika logged in): Back to Booking, Copy Link, Share to WA, Download/Print
- Invoice tampilan estetik, print-ready A4:
  - Header: Logo, nama studio, alamat, phone
  - Info: Invoice Number, Date, Booking Date, Booking Ref, Status badge
  - Bill To: nama, phone, email
  - Items table: paket + addons (belum lunas -> label), subtotal, diskon, total
  - Footer: "Yoonjaespace Studio" (text signature), footer text dari settings
- Custom fields TIDAK tampil di invoice
- Print: window.print() dengan @media print CSS
```

### Verifikasi

- [ ] Customer Page: publik, data akurat, status timeline, View Photos conditional, studio info dari settings, links berfungsi, mobile responsive
- [ ] Invoice: publik, data benar, addon belum lunas label, print A4 rapi, header buttons hanya saat logged in, custom fields TIDAK tampil

---

## STEP 7: Calendar + MUA Page

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 7 — Calendar + MUA Page

Yang sudah diimplementasi: Semua Step 1-6

Tabel: bookings, customers, packages, addons, booking_addons, backgrounds, booking_backgrounds

A. Calendar (/calendar)
3 views: Day (default), Week, Month. Buttons: New Booking, MUA Page (new tab).

Day: Timeline jam (open-close). Booking cards: jam, durasi, customer, paket, status badge.
Klik card -> popup: detail + update status Next/Back + Tutup + Lihat Detail Lengkap.

Week: Senin-Minggu grid. Card: jam, durasi, customer, paket.

Month: Grid kalender. Card ringkas: jam, durasi, customer.

Navigation panah kiri/kanan. Fetch hanya range visible.

B. MUA Page (/mua) — PUBLIC
Day view saja. Filter: booking_addons JOIN addons WHERE name ILIKE '%mua%'
Card: customer name, booking ID, paket, jam MUA, jam sesi, status. View only.
Logo Yoonjaespace di atas.
```

### Verifikasi

- [ ] Calendar 3 views, popup detail + status update, navigation, fetch efficient
- [ ] MUA Page: publik, hanya MUA bookings, view only, mobile responsive

---

## STEP 8: Customers Page

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 8 — Customers Page

Yang sudah diimplementasi: Semua Step 1-7

Tabel: customers, bookings, leads

Customers List (/customers):
- Tabel: Nama, Phone, Email, Total Bookings (count), Total Spend (sum), Last Visit (max date), Action
- Search by name/phone. Export CSV dan Excel.
- Add Client modal: nama, WA (unique validation), email, instagram, alamat, domisili, leads dropdown, notes

Customer Detail (/customers/[id]):
- Info lengkap + Booking History table (Booking ID clickable -> /bookings/[id])
- Edit (semua kecuali phone). Delete (cek booking aktif). Activity log.
```

### Verifikasi

- [ ] List: data akurat, search, export CSV/Excel
- [ ] Add Client: phone unique validation
- [ ] Detail: info + booking history clickable
- [ ] Edit/Delete, activity log, mobile responsive

---

## STEP 9: Reminders

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 9 — Reminders Page

Yang sudah diimplementasi: Semua Step 1-8

Tabel: bookings, customers, packages, settings_reminder_templates, booking_reminders

3 tabs: Today, This Week, This Month.
Tabel: Customer Name, Phone, Date, Time, Package, Status, Hours Left.

Actions per row:
- Reminder -> wa.me dengan reminder_message template
- Thank You Payment -> wa.me dengan thank_you_payment_message
- Say Thank You -> wa.me dengan thank_you_message
- Tandai Sudah Di-remind (centang) -> insert booking_reminders, badge tampil

Variable replacement: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}

Filter: Today = booking_date = today, not CLOSED/CANCELED. This Week = 7 hari. This Month = 30 hari.
```

### Verifikasi

- [ ] 3 tabs data benar. Hours Left akurat. WA links dengan template benar. Variable replacement. Tandai di-remind. Mobile.

---

## STEP 10: Finance

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 10 — Finance Page

Yang sudah diimplementasi: Semua Step 1-9

Tabel: bookings, booking_addons, expenses, vendors, packages

Filter: dropdown bulan (default: bulan berjalan)

Summary Dashboard (4 cards): Income (total bookings >= PAID), Expense (total expenses), Gross Profit, Income from Bookings

Income from Bookings: tabel booking yang contribute (Booking ID, Customer, Date, Package, Total)

Expenses: tabel (Date, Description, Category, Vendor, Amount, Action). Add New Expense modal: Date, Description, Amount, Category, Vendor (dropdown opsional), Notes. Edit/Delete. Commission expenses ditandai auto-generated.

Top 5 Most Popular Packages: nama paket, jumlah booking, revenue.

Export Excel. Activity log.
```

### Verifikasi

- [ ] Summary akurat per bulan. Income tabel. Expenses CRUD. Top 5 benar. Export. Mobile.

---

## STEP 11: Vendors + Commissions + Activities

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 11 — Vendors, Commissions, Activities

Yang sudah diimplementasi: Semua Step 1-10

A. Vendors (/vendors)
Card list. Card: nama, kategori, phone, alamat, total transaksi (count expenses), total nilai (sum expenses). Detail, Edit, Delete.
Add Vendor modal: Name, Category, Phone, Email, Address, Notes, Active/Inactive.

B. Commissions (/commissions)
Filter: bulan + tahun. Periode: 26 bulan berjalan -> 25 bulan berikutnya.
Summary: total paid + total unpaid.
Card per Staff: nama, email, booking count, total komisi (input manual), Booking History (clickable), Checkbox "Sudah Dibayarkan" -> update status paid, auto-create expense (source=commission). Button Save per card.

C. Activities (/activities)
Timeline list, terbaru di atas. Entry: timestamp, user+role, action, entity. Filter: date, user, action type. Pagination. Read-only.
```

### Verifikasi

- [ ] Vendors CRUD, totals dari expenses
- [ ] Commissions: filter, periode 26-25, input komisi, checkbox -> auto expense
- [ ] Activities: log lengkap, filter, mobile responsive

---

## STEP 12: Dashboard

### PROMPT (paste ke AI Agent)

```
[PASTE MASTER CONTEXT DOCUMENT DI SINI]

---

Sekarang kerjakan: STEP 12 — Dashboard

Yang sudah diimplementasi: SEMUA halaman lain.

Tabel: bookings, booking_addons, customers, packages, expenses, settings_general

Quick Menu: 4 buttons (Buat Booking, Lihat Booking, Lihat Kalender, Lihat Reminder)

Statistik Bulan Ini: Total Bookings, Estimasi Revenue, Belum Lunas (BOOKED + unpaid addons)

Action Items: Waiting Selection, At Vendor, Need Packaging, Need Shipping (dari print_order_status)

Jadwal Hari Ini: list booking hari ini (jam, customer, paket, status, clickable)

Parallel fetch Promise.all(). Skeleton loader. Greeting "Selamat [pagi/siang/sore], [nama user]!". Mobile cards stack.
```

### Verifikasi

- [ ] Quick Menu navigate benar. Statistik akurat. Action Items akurat. Jadwal hari ini. Greeting. Fast loading. Mobile.

---

## POST-DEVELOPMENT: Final Checklist

### Fungsionalitas
- [ ] Login/logout
- [ ] Role-based access
- [ ] Semua CRUD
- [ ] Booking status flow + ADDON_UNPAID logic
- [ ] Print order flow
- [ ] Customer Page publik real-time
- [ ] Invoice render + print
- [ ] Finance calculations
- [ ] Commission -> auto expense
- [ ] Activity log semua aksi

### Performa
- [ ] Tidak ada loading > 2 detik
- [ ] Optimistic updates instant
- [ ] Image upload replace benar

### Mobile
- [ ] Semua halaman usable 375px+
- [ ] Sidebar/nav mobile
- [ ] Tabel -> card di mobile
- [ ] Touch targets 44px+

### Data Integrity
- [ ] Phone unique
- [ ] Booking number format konsisten
- [ ] Invoice number format konsisten
- [ ] Cascade delete benar

### Deployment ke Vercel
1. Push ke GitHub
2. Connect ke Vercel
3. Set env variables
4. Deploy
5. Test production URL

---

## Tips Troubleshooting

### Jika AI Agent Lupa Konteks
Paste ulang Master Context + sebutkan step berapa, halaman yang sudah selesai, error yang terjadi.

### Jika Ada Bug
Kirim: screenshot/error message, file bermasalah, langkah reproduksi, step berapa.

### Jika Mau Refactor Setelah Selesai
Bisa minta: optimize performance, improve animations, add PWA support, add dark mode.
