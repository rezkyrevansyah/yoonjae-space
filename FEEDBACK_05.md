# Feedback 05 — Yoonjae Space Studio Management
_Tanggal feedback: 11 April 2026_
_Total item: 24 bug/request_

---

## Cara Membaca File Ini

Setiap item feedback ditulis dengan format:

- **ID**: Nomor unik untuk referensi
- **Kategori**: Halaman/modul yang terdampak
- **Tipe**: `bug` (ada yang rusak) atau `feature` (request fitur baru)
- **Prioritas**: `critical` / `high` / `medium` / `low`
- **Deskripsi**: Penjelasan masalah
- **Konteks visual**: Apa yang terlihat di screenshot
- **Ekspektasi**: Perilaku yang seharusnya
- **File yang kemungkinan perlu diubah**: Petunjuk lokasi kode

---

## MOBILE UI BUG

### FB-01
- **Kategori**: Bookings / Pembayaran (Mobile)
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: Tabel tanggal transaksi di halaman Pembayaran mobile belum rapih (layout berantakan). Selain itu tombol **"Hari Ini"** belum ada, dan pop-up pembayaran juga belum memiliki input tanggal.
- **Konteks visual**: Screenshot mobile menunjukkan tabel Pembayaran dengan kolom yang tidak sejajar / overflow.
- **Ekspektasi**:
  1. Tabel tanggal transaksi tampil rapih di mobile (responsive layout).
  2. Tombol "Hari Ini" tersedia untuk memilih tanggal hari ini secara cepat.
  3. Pop-up pembayaran memiliki field input tanggal transaksi.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx`

---

### FB-02
- **Kategori**: Bookings / Progress (Mobile)
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: Di halaman Progress (tab booking detail), tombol **Today** dan tabel tanggal **overlap** (bertumpuk) satu sama lain di layar mobile.
- **Konteks visual**: Screenshot mobile tab Progress menunjukkan tombol Today menimpa tabel di bawahnya.
- **Ekspektasi**: Tombol Today dan tabel tanggal tidak overlap — layout stack vertikal atau diberi jarak yang cukup.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx`

---

### FB-03
- **Kategori**: Photo Delivery / Input Link Foto (Mobile)
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: Di pop-up "Input Link Foto & Deliver" di halaman Photo Delivery:
  1. Google Drive Link label dan kolom input-nya terlalu **mepet/rapat** (tidak ada jarak/padding yang cukup).
  2. Pop-up belum memiliki **input tanggal**.
- **Konteks visual**: Screenshot pop-up Input Link Foto menunjukkan label dan input field saling berhimpit di mobile.
- **Ekspektasi**:
  1. Label dan input field memiliki spacing yang layak.
  2. Terdapat field input tanggal di pop-up tersebut.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx`

---

### FB-04
- **Kategori**: Settings (Mobile)
- **Tipe**: bug
- **Prioritas**: medium
- **Deskripsi**: Di halaman Settings bagian "Jam Operasional", kolom **Jam Buka** dan kolom **Jam Tutup** saling **overlap** di tampilan mobile karena tidak cukup lebar.
- **Konteks visual**: Screenshot Settings mobile menunjukkan dua kolom input waktu yang bertabrakan/bertumpuk.
- **Ekspektasi**: Kolom Jam Buka dan Jam Tutup tampil secara vertikal (stack) di mobile, bukan horizontal yang menyebabkan overflow.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/settings/_components/tab-general.tsx`

---

### FB-05
- **Kategori**: Bookings / Filter Tanggal (Mobile)
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: Filter tanggal **Dari – Sampai** di halaman Bookings **overlap** di tampilan mobile. Dua date picker bertabrakan sehingga tidak bisa digunakan dengan baik.
- **Konteks visual**: Screenshot Bookings filter mobile menunjukkan dua kolom tanggal "Dari" dan "Sampai" berhimpit dan tidak bisa dibaca.
- **Ekspektasi**: Filter tanggal Dari dan Sampai tampil secara vertikal (stack) di mobile, atau menggunakan layout yang muat di lebar layar kecil.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/_components/bookings-client.tsx`

---

### FB-06
- **Kategori**: Bookings / Tabel (Mobile & Desktop)
- **Tipe**: bug
- **Prioritas**: medium
- **Deskripsi**: Tampilan tabel di halaman Bookings hanya menampilkan **waktu mulai** saja, belum ada kolom **waktu selesai**.
- **Konteks visual**: Screenshot tabel Bookings menunjukkan kolom waktu yang hanya berisi waktu mulai (misal "08:30") tanpa end time.
- **Ekspektasi**: Tampilkan waktu dalam format `08:30 – 10:00` (waktu mulai dan selesai) di kolom waktu pada tabel.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/_components/bookings-client.tsx`

---

### FB-07
- **Kategori**: Calendar (Mobile)
- **Tipe**: feature
- **Prioritas**: low
- **Deskripsi**: Di bagian bawah tampilan Calendar mobile muncul **legend status** (Booked, DP Paid, Paid, Shoot Done, Photos Delivered, Addon Unpaid, Closed) yang memakan ruang layar. User meminta apakah legend ini bisa **disembunyikan / di-hide** (mungkin dengan toggle).
- **Konteks visual**: Screenshot Calendar mobile menunjukkan legend warna status yang ditandai merah di bagian bawah halaman, tampak memakan space.
- **Ekspektasi**: Tambahkan opsi untuk menyembunyikan/menampilkan legend status, atau pindahkan ke tempat yang tidak mengganggu tampilan kalender.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/calendar/_components/calendar-client.tsx`
  - `src/app/(dashboard)/calendar/_components/calendar-day-view.tsx`

---

## BUAT BOOKING BARU

### FB-08
- **Kategori**: New Booking / Langkah 3 — Paket & Add On
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: Sort manual urutan kategori paket yang sudah diatur di Settings **tidak ikut teraplikasi** di langkah 3 Buat Booking Baru. Urutan paket yang ditampilkan tidak sesuai dengan sort_order yang diset.
- **Konteks visual**: Screenshot langkah 3 menunjukkan paket-paket yang urutannya tidak sesuai dengan yang dikonfigurasi di Settings > Packages.
- **Ekspektasi**: Urutan paket di step pilih paket harus mengikuti `sort_order` yang sudah di-set di Settings, sama seperti urutan yang tampil di halaman Settings > Packages.
- **Catatan teknis**: Data paket di-cache via `getCachedPackages()` yang sudah ada `.order("sort_order")`. Perlu dicek apakah komponen step mengurutkan ulang data tersebut.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/new/_components/step-packages-addons.tsx`
  - `src/lib/cached-queries.ts` — pastikan order by `sort_order` lalu `name`

---

### FB-09
- **Kategori**: New Booking / Langkah Pilih Waktu — Estimasi Durasi
- **Tipe**: bug
- **Prioritas**: critical
- **Deskripsi**: Estimasi waktu selesai yang dihitung kurang **15 menit** dari yang seharusnya. Contoh: jika paket berdurasi 60 menit mulai 15:00, harusnya selesai 16:00, tapi yang muncul hanya 15:45.
- **Konteks visual**: Screenshot estimasi waktu menampilkan "15:00 — 15:45" padahal paket yang dipilih harusnya menghasilkan end time 16:00.
- **Ekspektasi**: Kalkulasi `end_time = start_time + total_duration_minutes` harus akurat 100%. Periksa kemungkinan off-by-one atau time slot interval (15 menit) ikut terkurangi dari durasi.
- **Catatan teknis**: Kemungkinan bug di logika kalkulasi end time — interval time slot (misal 15 menit) mungkin tidak ditambahkan atau malah dikurangi. Cek apakah `extra_time_minutes` dari paket dan add-on sudah dihitung dengan benar.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/new/_components/step-time-estimate.tsx`
  - `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx` — fungsi kalkulasi `endTime`

---

### FB-10
- **Kategori**: New Booking / Deteksi Booking Overlap
- **Tipe**: bug
- **Prioritas**: critical
- **Deskripsi**: Notifikasi **booking overlap** tidak muncul di **step pilih waktu**, padahal overlap terdeteksi di step estimasi waktu dan di kalender. User bisa terus ke langkah berikutnya tanpa tahu ada konflik jadwal.
- **Ekspektasi**: Jika slot waktu yang dipilih sudah terisi booking lain, **notif warning overlap harus muncul langsung di step pilih waktu** (bukan hanya di step estimasi atau di kalender).
- **Catatan teknis**: Logika cek overlap sepertinya sudah ada di step session/estimasi. Perlu juga dijalankan saat user memilih start_time, dan hasilnya ditampilkan sebagai warning inline atau toast.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/new/_components/step-session.tsx`
  - `src/app/(dashboard)/bookings/new/_components/step-time-estimate.tsx`

---

### FB-11
- **Kategori**: New Booking / Draft
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Jika user sedang mengisi form booking baru lalu **halaman ter-refresh** (tidak sengaja atau karena koneksi), semua data hilang dan user harus mulai dari awal. Request: simpan progress sebagai **draft** sehingga bisa dilanjutkan kembali.
- **Ekspektasi**: Data form booking yang sedang diisi tersimpan otomatis (misal ke `localStorage` atau tabel `booking_drafts` di database), dan tersedia opsi untuk melanjutkan draft yang tersimpan.
- **Implementasi yang disarankan**: Simpan state form ke `localStorage` setiap kali ada perubahan. Saat user buka halaman New Booking, cek apakah ada draft tersimpan dan tawarkan untuk melanjutkan.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`

---

## BOOKINGS

### FB-12
- **Kategori**: Bookings / Tampilan Multi-Paket
- **Tipe**: bug
- **Prioritas**: medium
- **Deskripsi**: Booking dengan **2 paket** (misal: Joy & Aura) hanya menampilkan **1 paket** di list Bookings dan di tampilan kalender. Di halaman **detail kalender** sudah bisa muncul 2 paket dengan benar — jadi bug hanya di tampilan ringkasan/list.
- **Konteks visual**: Screenshot list Bookings menampilkan hanya 1 nama paket. Screenshot detail kalender menampilkan 2 paket dengan benar.
- **Ekspektasi**: Tampilkan semua nama paket yang ada di booking, bisa dipisah koma atau dengan format ringkas (misal: "Joy + Aura").
- **Catatan teknis**: Di list/tabel, kemungkinan hanya mengambil `packages(name)` dari kolom `package_id` (backward-compat legacy field), bukan dari tabel `booking_packages`. Perlu baca dari `booking_packages` untuk mendapat semua paket.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/_components/bookings-client.tsx`
  - `src/app/(dashboard)/bookings/page.tsx` — select query
  - `src/app/(dashboard)/calendar/_components/calendar-month-view.tsx`
  - `src/app/(dashboard)/calendar/_components/calendar-week-view.tsx`

---

## INVOICE

### FB-13
- **Kategori**: Invoice / Sisa Tagihan
- **Tipe**: bug
- **Prioritas**: critical
- **Deskripsi**: **Sisa Tagihan** di invoice hanya muncul jika booking memiliki Down Payment. Jika tidak ada DP tapi ada **Extra Add On yang belum lunas**, baris "Sisa Tagihan" tidak muncul sama sekali di invoice.
- **Konteks visual**: Screenshot invoice DENGAN DP: tampil baris "DP ✓ Sudah Dibayar" + "Sisa Tagihan Rp X". Screenshot invoice TANPA DP: tidak ada baris sisa tagihan meskipun ada add-on Belum Lunas.
- **Ekspektasi**: "Sisa Tagihan" harus muncul jika ada nilai yang belum dibayar, terlepas dari apakah ada DP atau tidak. Logika yang benar: `Sisa Tagihan = Total - DP - (add-on yang sudah lunas)`.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx`

---

## VOUCHER

### FB-14
- **Kategori**: Settings / Voucher — Buat Voucher
- **Tipe**: bug
- **Prioritas**: critical
- **Deskripsi**: Membuat voucher **gagal jika tanpa periode waktu** (kolom Berlaku Dari dan Berlaku Sampai dikosongkan). Error yang muncul: `null value in column "valid_from" of relation "vouchers" violates not-null constraint`.
- **Konteks visual**: Screenshot form Tambah Voucher dengan error di atas modal — kolom Berlaku Dari dan Berlaku Sampai dikosongkan.
- **Ekspektasi**: Periode waktu voucher seharusnya **opsional**. Jika dikosongkan, artinya voucher berlaku tanpa batas waktu. Kolom `valid_from` dan `valid_until` di database harus bisa `NULL`.
- **Catatan teknis**: Fix di dua tempat: (1) ubah kolom `valid_from` dan `valid_until` di tabel `vouchers` menjadi nullable di Supabase, (2) pastikan kode tidak mengirim string kosong (kirim `null` jika kosong).
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/settings/_components/tab-vouchers.tsx`
  - Migration/schema Supabase: kolom `valid_from` dan `valid_until` jadikan `nullable`

---

### FB-15
- **Kategori**: New Booking / Voucher 100% Diskon
- **Tipe**: bug
- **Prioritas**: critical
- **Deskripsi**: Menggunakan voucher dengan diskon **100%** (contoh: kode COLLAB) menyebabkan total booking menjadi **Rp 0**, dan proses buat booking **gagal** dengan error validasi. Voucher dengan diskon 10% bisa berjalan normal.
- **Konteks visual**: Screenshot step summary booking dengan kode COLLAB — subtotal Rp 2.100.000, diskon Rp 2.100.000, **Total Rp 0**. Tombol "Buat Booking" menghasilkan error.
- **Ekspektasi**: Booking dengan total Rp 0 (setelah voucher 100%) harus tetap bisa dibuat. Status pembayaran otomatis jadi `PAID` karena tidak ada yang perlu dibayar.
- **Catatan teknis**: Kemungkinan ada validasi yang menolak total = 0, atau logika `initialStatus` tidak menangani kasus total = 0. Perlu juga pastikan kalkulasi diskon tidak menghasilkan angka negatif.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx` — fungsi `handleSubmit` dan `initialStatus`
  - `src/app/(dashboard)/bookings/new/_components/step-summary.tsx` — kalkulasi pricing

---

## FINANCE

### FB-16
- **Kategori**: Finance / Tabel Income
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Request tambah kolom **nama rekening** di tabel income Finance, supaya bisa langsung cross-check tanpa harus buka detail booking satu per satu.
- **Ekspektasi**: Tabel income di Finance menampilkan kolom rekening/metode pembayaran yang digunakan untuk setiap transaksi.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/finance/_components/income-table.tsx`
  - `src/app/(dashboard)/finance/page.tsx` — tambah field rekening ke query

---

### FB-17
- **Kategori**: Finance / Detail Pembayaran
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: **Metode payment** dan **notes rekening** tidak bisa dilihat dari halaman Finance. User tidak tahu di mana melihat detail ini.
- **Ekspektasi**: Tambahkan cara untuk melihat detail metode payment dan notes rekening — bisa berupa tooltip, expand row, atau kolom baru di tabel income.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/finance/_components/income-table.tsx`
  - `src/app/(dashboard)/finance/_components/finance-client.tsx`

---

### FB-18
- **Kategori**: Finance / Tombol Invoice
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Request tombol **Invoice** di setiap baris income yang membuka invoice dalam **pop-up/modal**, bukan navigasi ke halaman baru. Tujuannya agar cross-check lebih cepat tanpa meninggalkan halaman Finance.
- **Ekspektasi**: Setiap baris income di Finance memiliki tombol/ikon Invoice. Klik tombol → buka modal/drawer yang menampilkan invoice untuk booking tersebut.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/finance/_components/income-table.tsx`
  - `src/app/(dashboard)/finance/_components/finance-client.tsx`

---

### FB-19
- **Kategori**: Finance / Search
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Halaman Finance belum memiliki **kolom pencarian**. User tidak bisa mencari transaksi berdasarkan nama customer, booking number, atau deskripsi.
- **Ekspektasi**: Tambahkan input search di halaman Finance untuk memfilter transaksi income maupun expense.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/finance/_components/finance-client.tsx`

---

### FB-20
- **Kategori**: Finance / Status Closed
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Request tombol/aksi untuk mengubah status booking ke **"Closed"** langsung dari halaman Finance, supaya lebih mudah menandai transaksi yang sudah selesai tanpa harus buka halaman detail booking.
- **Ekspektasi**: Setiap baris income memiliki aksi "Tutup/Close" yang mengubah status booking menjadi `CLOSED`.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/finance/_components/income-table.tsx`
  - `src/app/(dashboard)/finance/_components/finance-client.tsx`

---

## CALENDAR

### FB-21
- **Kategori**: Calendar / Jump to Date
- **Tipe**: feature
- **Prioritas**: high
- **Deskripsi**: Fitur **"Jump to Date"** di tab **Hari** pada Calendar belum dibuat (sudah pernah direquest sebelumnya). User harus klik navigasi panah satu per satu untuk pindah ke tanggal yang jauh.
- **Ekspektasi**: Tambahkan input tanggal atau date picker di header Calendar (tab Hari) yang memungkinkan user langsung loncat ke tanggal tertentu tanpa klik satu per satu.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/calendar/_components/calendar-client.tsx`

---

### FB-22
- **Kategori**: Calendar / Session Name
- **Tipe**: feature
- **Prioritas**: high
- **Deskripsi**: Request **auto-generate nama sesi foto** dengan format baku: `tanggalSesi_Paket_namaClient`. Contoh nyata yang sudah berjalan: `090426_SmashUp!_Devi Ratnasari`. Session name ini perlu ditampilkan di area **detail booking di kalender** (popup/drawer) supaya mudah **di-copy paste** saat sesi akan dimulai.
- **Detail format**:
  - `tanggalSesi` = tanggal booking dalam format `DDMMYY` (contoh: 09 April 2026 → `090426`)
  - `Paket` = nama paket pertama (atau semua paket jika multi)
  - `namaClient` = nama customer
  - Contoh: `090426_SmashUp!_Devi Ratnasari`
- **Ekspektasi**:
  1. Session name di-generate otomatis berdasarkan data booking.
  2. Ditampilkan di popup/detail kalender dengan tombol **copy** di sebelahnya.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/calendar/_components/booking-popup.tsx`
  - `src/lib/utils.ts` — tambah fungsi `generateSessionName(booking)`

---

## ROLE

### FB-23
- **Kategori**: Role / Default Homepage
- **Tipe**: bug
- **Prioritas**: high
- **Deskripsi**: User dengan role selain **admin & owner** (contoh: fotografer) masih diarahkan ke **Dashboard utama** setelah login, padahal akses menu sudah dibatasi. Akibatnya mereka bisa melihat data sensitif seperti **total revenue, estimasi revenue bulanan, statistik booking** yang seharusnya tidak terlihat oleh role tersebut.
- **Konteks visual**: Screenshot menunjukkan user "Gilang" (role: Fotografer) yang hanya punya akses Calendar dan Photo Delivery, tapi landing di Dashboard yang menampilkan Rp 32.060.500 revenue.
- **Ekspektasi**: Role selain admin & owner harus di-redirect ke **halaman Calendar** (atau halaman pertama yang ada di `menu_access` mereka) setelah login, bukan ke `/dashboard`.
- **Catatan teknis**: Perlu tambahkan logika di middleware atau layout — jika `currentUser.menu_access` tidak include `"dashboard"`, redirect ke item pertama dalam `menu_access` mereka (misal `/calendar`).
- **File yang kemungkinan perlu diubah**:
  - `src/middleware.ts` atau `src/utils/supabase/middleware.ts`
  - `src/app/(dashboard)/layout.tsx` — tambah redirect logic berdasarkan role
  - `src/app/page.tsx` — root redirect

---

## PHOTO DELIVERY

### FB-24
- **Kategori**: Photo Delivery / Filter
- **Tipe**: feature
- **Prioritas**: medium
- **Deskripsi**: Halaman **Photo Delivery** belum memiliki filter berdasarkan **status Print Order** (Selection, Vendor, Printing, Receive, Packing, Shipped, Done). User tidak bisa menyaring daftar berdasarkan tahapan print order.
- **Ekspektasi**: Tambahkan dropdown filter "Status Print Order" di halaman Photo Delivery, seperti filter status yang sudah ada di halaman Bookings.
- **Catatan teknis**: Komponen `PhotoDeliveryClient` sudah memiliki filter `statusFilter` untuk booking status. Perlu tambah filter kedua untuk `print_order_status`.
- **File yang kemungkinan perlu diubah**:
  - `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx`
  - `src/app/(dashboard)/photo-delivery/page.tsx`

---

## Ringkasan Prioritas

### 🔴 Critical — Harus diperbaiki segera (bug yang memblokir workflow)
| ID | Item |
|----|------|
| FB-09 | Estimasi waktu kurang 15 menit di new booking |
| FB-10 | Notif booking overlap tidak muncul di step pilih waktu |
| FB-13 | Sisa tagihan tidak muncul di invoice tanpa DP |
| FB-14 | Buat voucher gagal jika tanpa periode waktu |
| FB-15 | Booking dengan voucher 100% diskon (total Rp 0) gagal |

### 🟠 High — Bug penting dan feature yang sering dipakai
| ID | Item |
|----|------|
| FB-01 | Mobile: Pembayaran — tabel berantakan, tombol Hari Ini, input tanggal |
| FB-02 | Mobile: Progress — tombol Today & tabel overlap |
| FB-03 | Mobile: Input link foto — mepet & tanpa input tanggal |
| FB-05 | Mobile: Bookings filter tanggal Dari–Sampai overlap |
| FB-08 | New booking: sort paket tidak ikut urutan di Settings |
| FB-21 | Calendar: fitur jump to date belum ada |
| FB-22 | Calendar: auto-generate session name |
| FB-23 | Role: default homepage masih Dashboard (expose revenue) |

### 🟡 Medium — Bug minor dan feature enhancement
| ID | Item |
|----|------|
| FB-04 | Mobile: Settings jam buka/tutup overlap |
| FB-06 | Bookings tabel: hanya tampil waktu mulai, tidak ada waktu selesai |
| FB-11 | New booking: fitur draft saat halaman refresh |
| FB-12 | Bookings: 2 paket hanya tampil 1 di list/kalender |
| FB-16 | Finance: kolom nama rekening di tabel income |
| FB-17 | Finance: detail metode payment & notes rekening |
| FB-18 | Finance: tombol invoice buka pop-up |
| FB-19 | Finance: tombol search |
| FB-20 | Finance: tombol ubah status ke Closed |
| FB-24 | Photo Delivery: filter status Print Order |

### 🟢 Low — Nice to have
| ID | Item |
|----|------|
| FB-07 | Calendar: legend status bisa di-hide |
