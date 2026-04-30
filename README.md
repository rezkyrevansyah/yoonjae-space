# Yoonjaespace Studio Management

Yoonjaespace Studio Management adalah aplikasi operasional studio berbasis web untuk mengelola booking, customer, jadwal, reminder WhatsApp, pengiriman foto, invoice, finance, vendor, komisi staff, activity log, role, dan user. Aplikasi dibuat mobile-first agar nyaman dipakai dari HP, termasuk dukungan PWA untuk Add to Home Screen.

## Ringkasan Sistem

Sistem ini dipakai oleh tim studio untuk menjalankan alur kerja utama:

1. Admin membuat data master di Settings, seperti paket, add-on, background, voucher, template reminder, data studio, dan jam operasional.
2. Staff membuat booking baru untuk customer, memilih paket, add-on, tanggal, jam, staff handler, diskon, DP, dan detail tambahan.
3. Booking masuk ke daftar booking, kalender internal, halaman invoice publik, dan halaman customer publik.
4. Status booking bergerak dari booked sampai closed sesuai progress sesi foto.
5. Setelah sesi selesai, tim mengisi link Google Drive dan mengelola progress cetak atau pengiriman foto.
6. Reminder WhatsApp dikirim dari halaman Reminders berdasarkan template yang sudah disiapkan.
7. Finance menghitung pendapatan, pengeluaran, profit, paket populer, dan komisi.
8. Semua perubahan penting dicatat ke Activity Log.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- ShadCN UI
- Framer Motion
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- PWA dengan `@ducanh2912/next-pwa`
- Deploy target: Vercel

## Kebutuhan Lokal

- Node.js 20 atau lebih baru
- npm
- Project Supabase
- Bucket Supabase Storage bernama `images-yoonjae`

## Environment Variables

Buat `.env.local` dari `.env.example`.

```bash
cp .env.example .env.local
```

Isi value berikut:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Catatan:

- `.env.local` dipakai untuk development lokal dan tidak boleh dikirim ke Git publik.
- `SUPABASE_SERVICE_ROLE_KEY` dipakai untuk operasi admin/server tertentu, misalnya membuat user dan API publik MUA yang perlu membaca data aman tanpa membuka PII.
- `NEXT_PUBLIC_APP_URL` dipakai untuk membuat link publik seperti invoice dan customer page.

## Instalasi dan Menjalankan Project

```bash
npm install
npm run dev
```

Buka:

```txt
http://localhost:3000
```

Build production:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## Database dan Storage

Folder `supabase/migrations` sengaja dibuat ringkas untuk handover.

```txt
supabase/migrations/
├─ schema_yoonjae.sql            Schema hasil export/context dari Supabase
└─ setup_yoonjae_database.sql    Script copy-paste untuk Supabase SQL Editor
```

Untuk setup database baru, buka Supabase SQL Editor lalu jalankan seluruh isi:

```txt
supabase/migrations/setup_yoonjae_database.sql
```

Script tersebut membuat enum, tabel, foreign key, index, function RPC, data settings default, role default, bucket storage, dan policy storage yang dibutuhkan aplikasi.

Storage bucket yang dibuat/dibutuhkan:

```txt
images-yoonjae
```

Bucket ini dipakai untuk asset studio seperti logo dan foto depan studio.

## Struktur Folder Utama

```txt
src/app/(auth)/login                Halaman login
src/app/(dashboard)/dashboard       Dashboard internal
src/app/(dashboard)/bookings        Booking list, create, detail
src/app/(dashboard)/calendar        Kalender internal studio
src/app/(dashboard)/photo-delivery  Pengiriman foto dan progress print
src/app/(dashboard)/customers       Data customer dan history booking
src/app/(dashboard)/reminders       Reminder WhatsApp
src/app/(dashboard)/finance         Income, expense, profit, export
src/app/(dashboard)/vendors         Data vendor
src/app/(dashboard)/commissions     Komisi staff
src/app/(dashboard)/activities      Activity log
src/app/(dashboard)/user-management User management
src/app/(dashboard)/role-management Role dan akses menu
src/app/(dashboard)/settings        Master data dan konfigurasi
src/app/(public)/customer           Halaman publik customer
src/app/(public)/invoice            Invoice publik
src/app/(public)/mua                Kalender publik MUA
src/app/api                         API route internal/public
src/components/layout               Sidebar, header, mobile navigation
src/components/ui                   Komponen ShadCN UI
src/hooks                           Custom React hooks
src/lib                             Constants, utils, action helpers, types
src/utils/supabase                  Supabase client/server/middleware/admin
```

## Auth, Role, dan Navigasi

Sistem memakai Supabase Auth dengan email dan password.

Root route `/` memiliki logic:

- Jika user belum login, redirect ke `/login`.
- Jika user punya akses `dashboard`, redirect ke `/dashboard`.
- Jika tidak punya akses dashboard, redirect ke menu pertama yang dimiliki user.
- Jika tidak ada menu valid, redirect ke `/login`.

Halaman dashboard internal memakai guard menu. User hanya bisa membuka menu yang ada di `menu_access`. User primary atau owner dapat melewati pembatasan menu.

Menu utama internal:

| Menu | Route | Fungsi |
| --- | --- | --- |
| Dashboard | `/dashboard` | Ringkasan operasional |
| Bookings | `/bookings` | List, filter, detail, create, delete booking |
| Calendar | `/calendar` | Jadwal internal studio |
| Photo Delivery | `/photo-delivery` | Link foto dan progress print |
| Customers | `/customers` | Data customer dan riwayat booking |
| Reminders | `/reminders` | WhatsApp reminder dan thank you message |
| Finance | `/finance` | Income, expense, profit, export |
| Vendors | `/vendors` | Data vendor dan statistik expense |
| Commissions | `/commissions` | Komisi staff per periode |
| Activities | `/activities` | Audit trail sistem |
| User Management | `/user-management` | Kelola user internal |
| Role Management | `/role-management` | Kelola role, akses menu, permission |
| Settings | `/settings` | Master data dan konfigurasi sistem |

## PWA dan Mobile

Aplikasi sudah disiapkan sebagai PWA.

File penting:

```txt
public/manifest.json
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/maskable-192.png
public/icons/maskable-512.png
public/icons/apple-touch-icon.png
src/app/layout.tsx
next.config.mjs
```

Behavior:

- Manifest sudah terhubung dari metadata aplikasi.
- Icon 192 dan 512 dipakai untuk Android/Add to Home Screen.
- Apple touch icon dipakai untuk iOS.
- Maskable icon disiapkan agar icon lebih aman di berbagai bentuk launcher.
- Service worker digenerate otomatis saat production build.
- File generated seperti `public/sw.js`, `public/workbox-*.js`, dan `public/swe-worker-*.js` tidak perlu ditulis manual karena dibuat ulang oleh build.

Untuk validasi PWA sebelum deploy:

```bash
npm run build
```

Build production akan menampilkan informasi service worker, URL `/sw.js`, dan scope `/`.

## Status Booking

Status utama booking:

| Status | Arti |
| --- | --- |
| `BOOKED` | Booking sudah dibuat, belum lunas |
| `DP_PAID` | Booking sudah ada DP |
| `PAID` | Booking lunas sebelum sesi selesai |
| `SHOOT_DONE` | Sesi foto selesai |
| `PHOTOS_DELIVERED` | Foto sudah dikirim ke customer |
| `ADDON_UNPAID` | Ada extra add-on yang belum lunas |
| `CLOSED` | Booking selesai dan ditutup |
| `CANCELED` | Booking dibatalkan |

Flow normal:

```txt
BOOKED -> PAID -> SHOOT_DONE -> PHOTOS_DELIVERED -> CLOSED
```

Catatan:

- `DP_PAID` dipakai saat ada pembayaran DP.
- `ADDON_UNPAID` muncul ketika foto sudah dikirim tetapi ada extra add-on belum dibayar.
- `CANCELED` adalah status terpisah untuk booking batal.
- Perubahan status mengikuti permission role.

## Status Print Order

Status print order:

| Status | Arti |
| --- | --- |
| `SELECTION` | Customer memilih foto untuk dicetak |
| `VENDOR` | Data masuk ke vendor |
| `PRINTING` | Proses cetak |
| `RECEIVE` | Hasil cetak diterima studio |
| `PACKING` | Dikemas |
| `SHIPPED` | Dikirim atau diambil customer |
| `DONE` | Print order selesai |

Flow print:

```txt
SELECTION -> VENDOR -> PRINTING -> RECEIVE -> PACKING -> SHIPPED -> DONE
```

Pada halaman publik customer, beberapa status internal dibuat lebih ramah customer. Misalnya `VENDOR` tetap ditampilkan sebagai tahap seleksi, dan `RECEIVE` ditampilkan sebagai proses printing.

## Detail Semua Halaman

### `/`

Root route aplikasi.

Logic:

- Mengecek session user.
- Jika belum login, redirect ke `/login`.
- Jika user punya akses dashboard, redirect ke `/dashboard`.
- Jika tidak punya akses dashboard, redirect ke menu pertama yang user punya.
- Jika tidak ada akses valid, redirect ke `/login`.

### `/login`

Halaman login untuk user internal.

Yang ditampilkan:

- Form email dan password.
- Validasi login Supabase Auth.
- Redirect ke halaman internal setelah berhasil login.

### `/dashboard`

Dashboard adalah halaman ringkasan setelah login.

Yang ditampilkan:

- Greeting berdasarkan waktu WIB.
- Quick menu ke Buat Booking, Lihat Booking, Kalender, dan Reminder.
- Statistik bulan berjalan.
- Total booking bulan ini.
- Estimasi revenue dari status paid/active.
- Jumlah booking unpaid.
- Action item print order seperti selection, vendor, packing, dan shipped.
- Jadwal hari ini, termasuk jam, customer, paket, dan status booking.

Logic utama:

- Data booking dihitung per bulan berjalan.
- Revenue dihitung dari booking dengan status berbayar atau aktif.
- Booking canceled tidak masuk jadwal aktif.

### `/bookings`

Halaman daftar booking internal.

Yang ditampilkan:

- Tabel desktop dan card mobile.
- Booking number dan package.
- Customer.
- Tanggal dan jam sesi.
- Status booking.
- Status print order.
- Staff atau handler.
- Total transaksi.
- Tombol detail dan delete.

Filter dan fitur:

- Search customer, booking number, atau package.
- Filter status booking.
- Filter status khusus rescheduled.
- Filter status print order.
- Filter date from dan date to.
- Shortcut Hari Ini.
- Reset filter.
- Sort tanggal naik/turun.
- Page size 10, 25, atau 50.
- Pagination.
- Create booking ke `/bookings/new`.
- Delete booking dengan konfirmasi dan activity log.

### `/bookings/new`

Halaman wizard untuk membuat booking baru.

Step wizard:

| Step | Nama | Fungsi |
| --- | --- | --- |
| 1 | Tipe Booking | Pilih customer baru atau customer existing |
| 2 | Data Customer | Isi atau pilih data customer |
| 3 | Paket & Add-on | Pilih paket, background, dan add-on |
| 4 | Sesi & Waktu | Pilih tanggal dan jam sesi |
| 5 | Estimasi Waktu | Hitung durasi sesi dan extra time |
| 6 | Detail | Detail booking, catatan, BTS, jumlah orang, custom fields |
| 7 | Diskon | Voucher atau manual discount |
| 8 | Pembayaran | DP dan status pembayaran awal |
| 9 | Staff | Pilih staff/handler |
| 10 | Ringkasan | Review sebelum submit |

Data yang dimuat:

- Packages.
- Backgrounds.
- Add-ons.
- Leads.
- Photo For.
- Custom fields.
- Settings general.
- Holidays.
- Active users.
- Domiciles.
- Package categories.
- Add-on categories.

Logic utama:

- Wizard menyimpan draft di `localStorage` agar input tidak hilang saat refresh.
- Customer baru akan dibuat saat submit.
- Customer existing dipilih dari data customer yang sudah ada.
- Nomor booking dibuat lewat RPC `generate_booking_number`.
- Invoice dibuat otomatis dengan nomor dari RPC `generate_invoice_number`.
- Public token booking dibuat untuk halaman customer dan invoice.
- Jika paket memiliki print, status print awal menjadi `SELECTION`.
- Jika total 0, status dapat menjadi `PAID`.
- Jika ada DP, status menjadi `DP_PAID`.
- Jika belum bayar, status mengikuti setting default payment status.
- Sistem menghitung konflik jadwal berdasarkan tanggal, jam, durasi paket, add-on, dan extra time.
- Sistem memperhatikan jam operasional dan hari libur studio.

### `/bookings/[id]`

Halaman detail booking internal.

Header menampilkan:

- Tombol back.
- Booking number.
- Nama customer.
- Badge status booking.
- Badge rescheduled jika ada.
- Tombol WhatsApp.
- Link Customer Page publik.
- Link Invoice publik.
- Tombol Edit Detail, Reschedule, dan Delete untuk user dengan akses penuh.

Tab Overview:

- Data customer: nama, WhatsApp, email, Instagram, alamat, domicile.
- Data sesi: tanggal, jam, durasi, jumlah orang, photo for, BTS, notes, Google Drive link.
- Paket yang dipilih, quantity, dan snapshot harga.
- Background.
- Add-on original.
- Extra add-on.
- Custom fields.
- Creator dan waktu pembuatan.

Tab Progress:

- Stepper status booking.
- Tanggal perubahan status.
- Tombol next/back status sesuai permission role.
- Cancel booking.
- Input atau update Google Drive link saat deliver photos.
- Stepper print order.
- Tombol next/back print order.

Tab Pricing:

- Hanya untuk user dengan full access.
- Rincian harga paket.
- Rincian add-on.
- Discount voucher/manual.
- DP add, edit, delete, atau toggle paid.
- Extra add-on add, remove, atau toggle paid.
- Recalculate total.
- Aksi Lunas Semua.
- Aksi Batalkan Lunas.

Activity:

- Perubahan status, pricing, DP, extra add-on, reschedule, edit detail, dan delete dicatat ke `activity_log`.

### `/calendar`

Kalender internal studio.

Yang ditampilkan:

- View day, week, dan month.
- Navigasi previous, next, dan today.
- Date picker.
- Booking aktif sesuai tanggal.
- Badge status booking.
- Popup detail booking.
- Legend status yang bisa diaktif/nonaktifkan.

Fitur:

- Modal availability untuk cek ketersediaan jadwal.
- Link ke public MUA calendar.
- Shortcut buat booking baru.
- Popup booking dapat membuka detail booking.
- Legend status tersimpan di `localStorage`.

Logic utama:

- Booking canceled tidak ditampilkan sebagai jadwal aktif.
- Jam operasional dan interval slot diambil dari Settings.
- Day view memuat detail lebih lengkap.
- Week/month view dibuat lebih ringan dan detail dimuat saat dibutuhkan.

### `/photo-delivery`

Halaman list booking yang sudah masuk fase pengiriman foto.

Yang ditampilkan:

- Booking dengan status `SHOOT_DONE` atau `PHOTOS_DELIVERED`.
- Booking number dan package.
- Customer.
- Tanggal dan jam sesi.
- Status booking.
- Indikator Google Drive link.
- Status print order.
- Tombol detail.

Filter dan fitur:

- Search customer atau booking number.
- Filter status booking.
- Filter status print order.
- Filter Hari Ini.
- Page size.
- Link ke detail photo delivery.

### `/photo-delivery/[id]`

Halaman detail pengiriman foto.

Yang ditampilkan:

- Header booking, customer, WhatsApp, dan Customer Page.
- Tab Foto & Print.
- Tab Overview booking.

Fitur Foto & Print:

- Input Google Drive link.
- Deliver photos dari `SHOOT_DONE` ke `PHOTOS_DELIVERED`.
- Update link setelah delivered.
- Kelola status print order.
- Activity log untuk perubahan link dan status.

### `/customers`

Halaman daftar customer.

Yang ditampilkan:

- Customer name.
- WhatsApp.
- Email atau Instagram jika tersedia.
- Lead source.
- Domicile.
- Total booking.
- Total spend.
- Last visit.
- Tombol WhatsApp.
- Tombol detail.
- Tombol delete jika aman.

Filter dan fitur:

- Search nama atau WhatsApp.
- Filter lead.
- Filter domicile.
- Sort by name, total bookings, total spend, atau last visit.
- Pagination.
- Export CSV.
- Export Excel.
- Add customer modal.
- Validasi nomor WhatsApp unique.
- Delete customer hanya jika tidak punya booking aktif.

Field add customer:

- Name.
- WhatsApp.
- Email.
- Instagram.
- Address.
- Domicile.
- Lead.
- Notes.

### `/customers/[id]`

Halaman detail customer.

Yang ditampilkan:

- Profile card dengan avatar initial.
- Nama customer.
- Created date.
- Lead.
- Contact chips.
- Address.
- Domicile.
- Notes.
- Total bookings.
- Total spend.
- Last visit.
- Booking history.

Booking history menampilkan:

- Booking ID.
- Tanggal booking.
- Package.
- Status.
- Total.
- Link detail booking.

Fitur:

- Edit customer.
- Delete customer jika tidak punya booking aktif.
- WhatsApp customer.
- Activity log untuk edit/delete.

### `/reminders`

Halaman reminder WhatsApp.

Tab:

- Hari Ini.
- 7 Hari.
- 30 Hari.

Yang ditampilkan:

- Upcoming booking aktif.
- Customer dan nomor WhatsApp.
- Tanggal dan jam booking.
- Package.
- Status booking.
- Sisa waktu dalam jam/hari.
- Badge sudah di-remind.
- Tombol WhatsApp sesuai template.

Template pesan:

- Reminder message.
- Thank you message.
- Thank you payment message.
- Custom message.

Variable template:

```txt
{customer_name}
{booking_date}
{booking_time}
{package_name}
{studio_name}
{customer_page}
{notes}
```

Fitur:

- Generate link WhatsApp otomatis.
- Tandai booking sebagai sudah di-remind.
- Batalkan tanda reminder.
- Warning jika template belum dikonfigurasi.
- Activity log saat reminder ditandai atau dibatalkan.

### `/finance`

Halaman finance studio.

Yang ditampilkan:

- Filter month/year.
- Filter package.
- Summary cards.
- Income table.
- Expense table.
- Popular packages.

Summary cards:

- Total income.
- Total expense.
- Gross profit.
- Booking count.

Income table:

- Booking ID.
- Customer.
- Date.
- Package.
- Payment/status.
- Total.
- Aksi close booking.

Expense table:

- Manual expense.
- Expense dari komisi.
- Vendor.
- Category.
- Notes.
- Amount.
- Add/edit/delete expense.

Popular packages:

- Top package berdasarkan jumlah booking.
- Revenue per package.

Fitur:

- Export Excel dengan sheet Summary, Income, dan Expenses.
- Close booking dari finance.
- Activity log untuk expense dan close booking.

### `/vendors`

Halaman vendor.

Yang ditampilkan:

- Vendor aktif dan inactive.
- Nama vendor.
- Category.
- Phone.
- Email.
- Address.
- Notes.
- Jumlah transaksi dari expense.
- Total spend.

Fitur:

- Add vendor.
- Edit vendor.
- Detail vendor modal.
- Set active/inactive.
- Delete vendor tanpa menghapus histori expense.
- Activity log untuk perubahan vendor.

### `/commissions`

Halaman komisi staff.

Yang ditampilkan:

- Filter periode month/year.
- Summary paid dan unpaid commission.
- Staff cards.
- Jumlah booking per staff.
- Total commission per staff.
- Status paid/unpaid.
- Detail booking yang menghasilkan komisi.

Logic periode:

- Menggunakan `commission_cutoff_day` dari Settings.
- Default cutoff adalah tanggal 26.
- Periode berjalan dari cutoff bulan sebelumnya sampai satu hari sebelum cutoff bulan ini.

Logic komisi:

- Prioritas amount: override di booking, lalu bonus package, lalu default bonus.
- Komisi dapat disimpan per booking/staff.
- Mark as paid membuat expense dengan source `commission`.
- Uncheck paid menghapus expense komisi terkait.
- Reset period menghapus record komisi periode tersebut dan reset commission amount booking.

Fitur:

- Edit default bonus.
- Edit bonus per package.
- Save commission.
- Mark paid/unpaid.
- Reset period.
- Activity log.

### `/activities`

Halaman audit trail.

Yang ditampilkan:

- Waktu aktivitas.
- User.
- Role.
- Action badge.
- Entity.
- Description.
- Relative time dan timestamp.

Filter:

- Search description atau user.
- Entity.
- Action.
- Pagination.

Entity yang dicakup:

- Bookings.
- Customers.
- Expenses.
- Vendors.
- Commissions.
- Booking reminders.
- Users.
- Roles.
- Settings.

### `/user-management`

Halaman kelola user internal.

Yang ditampilkan:

- Nama user.
- Email.
- Phone.
- Role.
- Status active/inactive.
- Created date.
- Badge primary user.

Fitur:

- Add user melalui API server.
- Edit user.
- Delete user.
- Primary user tidak bisa dihapus dari UI.
- Activity log dan cache invalidation.

Field add user:

- Name.
- Email.
- Phone.
- Password.
- Confirm password.
- Role.
- Active status.

Validasi:

- Password minimal 6 karakter.
- Password dan confirm password harus sama.

### `/role-management`

Halaman role dan permission.

Yang ditampilkan:

- Role cards.
- Role name.
- System badge.
- Description.
- Menu access badges.

Fitur:

- Add role.
- Edit role.
- Delete role.
- Select all menu access.
- Clear all menu access.
- Atur permission fitur booking.
- Atur permission perubahan status.

Permission penting:

```txt
booking_full_access
sc:BOOKED:PAID
sc:PAID:SHOOT_DONE
sc:SHOOT_DONE:PHOTOS_DELIVERED
sc:PHOTOS_DELIVERED:CLOSED
sc:PAID:BOOKED
sc:SHOOT_DONE:PAID
sc:PHOTOS_DELIVERED:SHOOT_DONE
sc:CLOSED:PHOTOS_DELIVERED
sc:cancel
```

Rule:

- Hanya primary user yang dapat save/delete role.
- System role tidak bisa dihapus.
- Role yang sedang dipakai user tidak bisa dihapus.
- Activity log untuk perubahan role.

### `/settings`

Halaman konfigurasi dan master data.

Tab Settings:

| Tab | Isi |
| --- | --- |
| General | Jam operasional, interval slot, default payment status, cutoff komisi, hari libur |
| Reminder Template | Template WhatsApp reminder dan thank you |
| Studio Info | Logo, foto depan, nama studio, alamat, Maps, WhatsApp, email, Instagram, footer |
| Packages | Master paket foto |
| Backgrounds | Master background |
| Add-ons | Master add-on |
| Kategori | Kategori package dan add-on |
| Vouchers | Voucher diskon |
| Custom Fields | Field tambahan untuk booking |
| Leads | Master sumber lead |
| Photo For | Master kebutuhan foto |
| Domisili | Master kota/domisili customer |

General:

- Open time.
- Close time.
- Time slot interval.
- Default payment status.
- Commission cutoff day.
- Studio holidays dengan label dan date range.

Reminder Template:

- Reminder message.
- Thank you message.
- Thank you payment message.
- Custom message.
- Daftar variable template.

Studio Info:

- Upload logo.
- Upload front photo.
- Studio name.
- Address.
- Google Maps URL.
- WhatsApp number.
- Email.
- Instagram.
- Footer text.

Packages:

- Name.
- Description.
- Category.
- Sort order.
- Price.
- Duration minutes.
- Include print.
- Need extra time.
- Extra time minutes.
- Extra time position before/after.
- Commission bonus.
- Active status.
- `is_mua` untuk tampil di kalender publik MUA.

Backgrounds:

- Name.
- Description.
- Availability.

Add-ons:

- Name.
- Category.
- Sort order.
- Price.
- Need extra time.
- Extra time minutes.
- Extra time position before/after.
- Active status.
- `is_mua` untuk tampil di kalender publik MUA.

Kategori:

- Package categories.
- Add-on categories.
- Active status.
- Drag reorder.
- Save order.

Vouchers:

- Code.
- Discount type percentage/fixed.
- Discount value.
- Minimum purchase.
- Valid from.
- Valid until.
- Active status.

Custom Fields:

- Label.
- Field type: text, select, checkbox, number, url.
- Select options.
- Active status.

Leads:

- Name.
- Active status.

Photo For:

- Name.
- Active status.

Domisili:

- City/domicile name.
- Search.
- Page size.
- Active toggle.

### `/customer/[token]`

Halaman publik untuk customer tanpa login.

Yang ditampilkan:

- Branding studio.
- Logo dan nama studio.
- Greeting customer.
- Booking number.
- Status booking stepper.
- Print order stepper jika ada print order.
- Tombol View Photos jika foto sudah dikirim dan Google Drive link tersedia.
- Detail tanggal dan jam sesi.
- Package.
- Background.
- Link invoice.
- Info studio.
- Foto depan studio.
- Alamat.
- Jam buka/tutup.
- WhatsApp studio.
- Instagram studio.
- Google Maps.
- Footer text.
- Book Again via WhatsApp.

Keamanan:

- Diakses lewat `public_token`, bukan ID database biasa.
- Tidak membutuhkan login.
- Hanya menampilkan informasi yang memang aman untuk customer.

### `/invoice/[token]`

Halaman invoice publik tanpa login.

Yang ditampilkan:

- Logo dan data studio.
- Invoice number.
- Invoice date.
- Booking reference.
- Session date dan time.
- Booking status.
- Bill to customer.
- Daftar item package.
- Daftar add-on.
- Extra add-on.
- Quantity.
- Harga per item.
- Subtotal.
- Extra add-on total.
- Discount voucher/manual.
- Total.
- DP.
- Remaining bill.
- Lunas indicator.

Fitur:

- Copy link.
- Share invoice.
- Print/download via browser print.
- Jika user internal sedang login, tersedia tombol kembali ke booking.
- Layout disiapkan untuk print A4 dan mobile.

### `/mua`

Kalender publik MUA tanpa login.

Yang ditampilkan:

- Branding studio.
- Day/week/month view.
- Navigasi previous, next, dan today.
- Jadwal booking MUA.
- Jam mulai dan selesai.
- Label service MUA.

Logic keamanan:

- Data berasal dari `/api/mua-bookings`.
- API hanya mengembalikan data non-PII.
- Customer name, phone, invoice, dan detail sensitif tidak dikirim.
- Range tanggal divalidasi.
- Maksimum range query 90 hari.
- Booking canceled tidak ditampilkan.
- Hanya package atau add-on dengan `is_mua=true` yang masuk kalender publik.

### `/api/mua-bookings`

API untuk public MUA calendar.

Parameter:

```txt
from=YYYY-MM-DD
to=YYYY-MM-DD
```

Response aman:

```txt
id
booking_date
start_time
end_time
mua_service
```

Validasi:

- Format tanggal harus valid.
- `from` tidak boleh lebih besar dari `to`.
- Range maksimal 90 hari.
- Tidak mengembalikan data customer.

### `/api/users/create`

API server untuk membuat user internal.

Fungsi:

- Membuat akun Supabase Auth.
- Membuat profile user aplikasi.
- Menghubungkan user dengan role.

Dipakai oleh:

- `/user-management`

### `/api/users/delete`

API server untuk menghapus user internal.

Fungsi:

- Menghapus user dari sistem sesuai rule yang berlaku.
- Dipakai oleh halaman User Management.

## Flow Sistem Utama

### Flow Login dan Akses Menu

```txt
User buka aplikasi
-> Root route cek session
-> Belum login: /login
-> Sudah login: cek menu_access
-> Punya dashboard: /dashboard
-> Tidak punya dashboard: menu pertama yang diizinkan
```

Setiap halaman internal mengecek permission menu. Sidebar desktop dan mobile navigation juga hanya menampilkan menu yang dimiliki user.

### Flow Booking Baru

```txt
Settings master data disiapkan
-> Staff buka /bookings/new
-> Pilih customer baru/existing
-> Pilih package, background, add-on
-> Pilih tanggal dan jam
-> Sistem cek jam operasional, holiday, durasi, extra time, dan konflik jadwal
-> Isi detail, discount, payment, staff
-> Review summary
-> Submit
-> Customer dibuat jika baru
-> Booking number dibuat
-> Booking, package, background, add-on, custom fields disimpan
-> Invoice dibuat
-> Public token tersedia
-> Activity log dicatat
-> Redirect ke detail booking
```

### Flow Progress Booking

```txt
BOOKED/DP_PAID
-> PAID
-> SHOOT_DONE
-> PHOTOS_DELIVERED
-> CLOSED
```

Jika ada extra add-on yang belum lunas setelah foto dikirim, status dapat masuk ke `ADDON_UNPAID`. Jika booking dibatalkan, status menjadi `CANCELED`.

### Flow Photo Delivery

```txt
Sesi selesai
-> Status SHOOT_DONE
-> Tim buka /photo-delivery
-> Input Google Drive link
-> Deliver photos
-> Status PHOTOS_DELIVERED
-> Customer dapat melihat tombol View Photos di public customer page
```

### Flow Print Order

```txt
Package include print
-> Print status SELECTION
-> VENDOR
-> PRINTING
-> RECEIVE
-> PACKING
-> SHIPPED
-> DONE
```

Progress print dapat dikelola dari booking detail dan photo delivery detail.

### Flow Reminder WhatsApp

```txt
Admin isi template di Settings
-> Sistem mengambil upcoming booking
-> Staff buka Reminders
-> Pilih tab Hari Ini, 7 Hari, atau 30 Hari
-> Sistem generate pesan dengan variable booking/customer
-> Staff kirim via WhatsApp
-> Staff tandai sudah di-remind
-> Activity log dicatat
```

### Flow Invoice Publik

```txt
Booking dibuat
-> Invoice otomatis dibuat
-> Link /invoice/[token] tersedia
-> Customer/staff membuka invoice
-> Invoice menampilkan item, discount, DP, total, dan sisa pembayaran
-> Invoice dapat di-share, copy link, atau print
```

### Flow Customer Page Publik

```txt
Booking dibuat
-> Link /customer/[token] tersedia
-> Customer melihat status booking dan print
-> Jika foto sudah delivered, tombol View Photos tampil
-> Customer dapat membuka invoice atau menghubungi studio
```

### Flow Finance

```txt
Booking paid/active masuk income
-> Expense manual dicatat
-> Komisi paid membuat expense source commission
-> Finance menghitung income, expense, gross profit
-> Data dapat diexport ke Excel
```

### Flow Komisi

```txt
Booking punya staff/handler
-> Sistem hitung periode berdasarkan cutoff
-> Komisi diambil dari override booking, package bonus, atau default bonus
-> Admin simpan komisi
-> Mark as paid
-> Expense commission dibuat
-> Finance ikut menghitung expense komisi
```

### Flow Activity Log

```txt
User melakukan aksi penting
-> Sistem insert ke activity_log
-> Activities menampilkan siapa, kapan, action, entity, dan deskripsi
```

Activity log penting untuk audit dan tracking operasional client.

## Business Rules Penting

- Semua CRUD penting sebaiknya mencatat activity log.
- Query Supabase memakai lean select dan tidak memakai Prisma.
- Booking canceled tidak dianggap sebagai jadwal aktif.
- Public route tidak membutuhkan login.
- Public customer dan invoice memakai token.
- Public MUA calendar tidak boleh membocorkan PII customer.
- User primary memiliki akses penuh.
- Role mengatur menu access dan permission perubahan status.
- Delete customer hanya aman jika tidak punya active booking.
- Delete vendor tidak menghapus histori expense.
- Generated PWA worker tidak perlu disimpan sebagai source.

## Delivery Notes

Repo ini sudah disiapkan agar lebih bersih untuk handover:

- Dependency lokal `node_modules` tidak perlu dikirim jika deliver lewat Git atau ZIP source bersih.
- Build output `.next` tidak perlu dikirim karena bisa digenerate ulang.
- `.env.local` dipakai lokal, tetapi untuk client lebih aman berikan `.env.example` dan instruksi isi env.
- File service worker PWA digenerate saat production build.
- Dokumentasi internal development dan folder agent tidak diperlukan untuk client.
- Source utama yang perlu dikirim adalah `src`, `public`, `supabase`, config project, `package.json`, `package-lock.json`, `.env.example`, dan README ini.

## Checklist Sebelum Deliver ke Client

- Pastikan `.env.local` tidak masuk commit publik.
- Pastikan env production sudah diisi di Vercel.
- Jalankan `npm install`.
- Jalankan `npm run build`.
- Pastikan build berhasil.
- Pastikan bucket `images-yoonjae` sudah ada.
- Jalankan migration Supabase sesuai urutan.
- Buat primary/admin user.
- Isi Settings awal: studio info, jam operasional, package, add-on, background, template reminder, role.
- Test login.
- Test create booking.
- Test public customer page.
- Test public invoice.
- Test PWA Add to Home Screen dari HP.
