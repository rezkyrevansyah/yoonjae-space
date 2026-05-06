# Yoonjaespace Studio — Frontend Test Cases

**App URL:** `http://localhost:3000`  
**Credentials:** `demo@yoonjae.com` / `demo123`  
**Total:** 96 test cases

---

## Section 1 — Login

---

## TC001 — Login dengan kredensial valid

**Deskripsi:** Verifikasi staff bisa login dengan email dan password yang valid dan diarahkan ke dashboard.

**Steps:**
1. [Action] Buka `/login`
2. [Action] Isi field email dengan `demo@yoonjae.com`
3. [Action] Isi field password dengan `demo123`
4. [Action] Submit form login
5. [Assertion] Verifikasi user berada di halaman dashboard setelah login berhasil

---

## TC002 — Login dengan kredensial invalid menampilkan error

**Deskripsi:** Verifikasi login dengan email atau password yang salah tidak berhasil dan menampilkan pesan error.

**Steps:**
1. [Action] Buka `/login`
2. [Action] Isi field email dengan `invalid@example.com`
3. [Action] Isi field password dengan `wrongpassword`
4. [Action] Submit form login
5. [Assertion] Verifikasi pesan error autentikasi tampil dan user tidak diarahkan ke dashboard

---

## Section 2 — Settings: General

---

## TC003 — Update jam operasional studio

**Deskripsi:** Verifikasi admin bisa mengubah jam buka dan tutup studio dan perubahan tersimpan dengan benar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman `/settings`
3. [Action] Pilih tab General
4. [Action] Ubah jam buka ke nilai yang berbeda dari sebelumnya
5. [Action] Ubah jam tutup ke nilai yang berbeda dari sebelumnya
6. [Action] Simpan perubahan
7. [Assertion] Verifikasi jam buka dan tutup yang baru tampil tersimpan di tab General

---

## TC004 — Update time slot interval

**Deskripsi:** Verifikasi admin bisa mengubah interval slot waktu dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab General
3. [Action] Ubah nilai time slot interval ke nilai yang berbeda
4. [Action] Simpan perubahan
5. [Assertion] Verifikasi nilai interval yang baru tampil di tab General

---

## TC005 — Tambah studio holiday

**Deskripsi:** Verifikasi admin bisa menambahkan hari libur studio dengan label dan rentang tanggal.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab General
3. [Action] Buka form tambah studio holiday
4. [Action] Isi label holiday
5. [Action] Pilih tanggal mulai dan tanggal akhir holiday
6. [Action] Simpan holiday
7. [Assertion] Verifikasi holiday yang baru ditambahkan muncul di daftar studio holidays

---

## Section 3 — Settings: Studio Info

---

## TC006 — Update studio info

**Deskripsi:** Verifikasi admin bisa mengupdate nama studio, alamat, nomor WhatsApp, dan Instagram, lalu perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Studio Info
3. [Action] Ubah field nama studio
4. [Action] Ubah field alamat
5. [Action] Ubah field nomor WhatsApp
6. [Action] Ubah field Instagram
7. [Action] Simpan perubahan
8. [Assertion] Verifikasi data studio info yang baru tampil tersimpan di halaman

---

## Section 4 — Settings: Reminder Template

---

## TC007 — Update reminder template dan verifikasi tersimpan

**Deskripsi:** Verifikasi admin bisa mengedit template pesan reminder dan konten baru tersimpan saat halaman dikunjungi ulang.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Reminder Template
3. [Action] Edit konten field reminder message
4. [Action] Simpan template
5. [Action] Pindah ke tab settings lain
6. [Action] Kembali ke tab Reminder Template
7. [Assertion] Verifikasi konten reminder message yang diedit tampil tersimpan

---

## Section 5 — Settings: Kategori

---

## TC008 — Tambah package category baru

**Deskripsi:** Verifikasi admin bisa menambahkan kategori paket baru dan kategori muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Kategori
3. [Action] Buka form tambah package category
4. [Action] Isi nama kategori dengan nilai unik, misalnya `Kategori Test A`
5. [Action] Simpan kategori
6. [Assertion] Verifikasi `Kategori Test A` muncul di daftar package categories

---

## TC009 — Edit package category yang ada

**Deskripsi:** Verifikasi admin bisa mengubah nama package category yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Kategori
3. [Action] Buka form edit untuk salah satu package category yang ada
4. [Action] Ubah nama kategori
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi nama package category terupdate di daftar

---

## TC010 — Tambah add-on category baru

**Deskripsi:** Verifikasi admin bisa menambahkan kategori add-on baru dan kategori muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Kategori
3. [Action] Buka form tambah add-on category
4. [Action] Isi nama kategori add-on dengan nilai unik, misalnya `Add-on Kategori Test A`
5. [Action] Simpan kategori
6. [Assertion] Verifikasi `Add-on Kategori Test A` muncul di daftar add-on categories

---

## TC011 — Edit add-on category yang ada

**Deskripsi:** Verifikasi admin bisa mengubah nama add-on category yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Kategori
3. [Action] Buka form edit untuk salah satu add-on category yang ada
4. [Action] Ubah nama kategori add-on
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi nama add-on category terupdate di daftar

---

## Section 6 — Settings: Packages

---

## TC012 — Buat package baru

**Deskripsi:** Verifikasi admin bisa membuat paket foto baru dengan nama, harga, dan durasi, lalu paket muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Packages
3. [Action] Buka form tambah package baru
4. [Action] Isi nama package dengan `Paket Test Automation`
5. [Action] Isi harga package dengan nilai valid
6. [Action] Pilih durasi session yang valid
7. [Action] Simpan package
8. [Assertion] Verifikasi `Paket Test Automation` muncul di daftar packages

---

## TC013 — Edit package yang ada

**Deskripsi:** Verifikasi admin bisa mengubah nama atau harga package yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Packages
3. [Action] Buka form edit untuk salah satu package yang ada
4. [Action] Ubah nama atau harga package
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi perubahan package tersimpan dan tampil di daftar

---

## TC014 — Toggle active/inactive package

**Deskripsi:** Verifikasi admin bisa menonaktifkan package aktif dan mengaktifkan kembali package yang tidak aktif.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Packages
3. [Action] Toggle status active/inactive untuk salah satu package
4. [Action] Simpan perubahan jika diperlukan
5. [Assertion] Verifikasi status active/inactive package berubah sesuai aksi yang dilakukan

---

## Section 7 — Settings: Backgrounds

---

## TC015 — Buat background baru

**Deskripsi:** Verifikasi admin bisa menambahkan background baru dengan nama dan deskripsi, lalu muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Backgrounds
3. [Action] Buka form tambah background baru
4. [Action] Isi nama background dengan `Background Test Automation`
5. [Action] Isi deskripsi background
6. [Action] Simpan background
7. [Assertion] Verifikasi `Background Test Automation` muncul di daftar backgrounds

---

## TC016 — Edit background yang ada

**Deskripsi:** Verifikasi admin bisa mengubah nama background yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Backgrounds
3. [Action] Buka form edit untuk salah satu background yang ada
4. [Action] Ubah nama background
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi nama background terupdate di daftar

---

## TC017 — Toggle ketersediaan background

**Deskripsi:** Verifikasi admin bisa mengubah status ketersediaan background.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Backgrounds
3. [Action] Toggle status availability untuk salah satu background
4. [Action] Simpan perubahan jika diperlukan
5. [Assertion] Verifikasi status availability background berubah sesuai aksi

---

## Section 8 — Settings: Add-ons

---

## TC018 — Buat add-on baru

**Deskripsi:** Verifikasi admin bisa membuat add-on baru dengan nama dan harga, lalu muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Add-ons
3. [Action] Buka form tambah add-on baru
4. [Action] Isi nama add-on dengan `Add-on Test Automation`
5. [Action] Isi harga add-on dengan nilai valid
6. [Action] Simpan add-on
7. [Assertion] Verifikasi `Add-on Test Automation` muncul di daftar add-ons

---

## TC019 — Edit add-on yang ada

**Deskripsi:** Verifikasi admin bisa mengubah nama atau harga add-on yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Add-ons
3. [Action] Buka form edit untuk salah satu add-on yang ada
4. [Action] Ubah nama atau harga add-on
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi perubahan add-on tersimpan di daftar

---

## Section 9 — Settings: Vouchers

---

## TC020 — Buat voucher diskon persentase

**Deskripsi:** Verifikasi admin bisa membuat voucher diskon tipe persentase dengan kode unik dan tanggal berlaku.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Vouchers
3. [Action] Buka form tambah voucher baru
4. [Action] Isi kode voucher dengan `TESTPERSEN`
5. [Action] Pilih discount type `percentage`
6. [Action] Isi nilai diskon, misalnya `10` (untuk 10%)
7. [Action] Pilih tanggal valid from dan valid until yang mencakup hari ini
8. [Action] Simpan voucher
9. [Assertion] Verifikasi voucher `TESTPERSEN` muncul di daftar vouchers

---

## TC021 — Buat voucher diskon nominal tetap

**Deskripsi:** Verifikasi admin bisa membuat voucher diskon tipe fixed amount.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Vouchers
3. [Action] Buka form tambah voucher baru
4. [Action] Isi kode voucher dengan `TESTFIXED`
5. [Action] Pilih discount type `fixed`
6. [Action] Isi nilai diskon nominal
7. [Action] Pilih tanggal valid from dan valid until yang mencakup hari ini
8. [Action] Simpan voucher
9. [Assertion] Verifikasi voucher `TESTFIXED` muncul di daftar vouchers

---

## Section 10 — Settings: Custom Fields, Leads, Photo For, Domisili

---

## TC022 — Buat custom field tipe text

**Deskripsi:** Verifikasi admin bisa menambahkan custom field dengan tipe text dan field muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Custom Fields
3. [Action] Buka form tambah custom field baru
4. [Action] Isi label field dengan `Custom Field Test Text`
5. [Action] Pilih field type `text`
6. [Action] Simpan custom field
7. [Assertion] Verifikasi `Custom Field Test Text` muncul di daftar custom fields

---

## TC023 — Buat custom field tipe select dengan opsi

**Deskripsi:** Verifikasi admin bisa membuat custom field tipe select beserta opsi-opsinya.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Custom Fields
3. [Action] Buka form tambah custom field baru
4. [Action] Isi label field dengan `Custom Field Test Select`
5. [Action] Pilih field type `select`
6. [Action] Tambahkan minimal dua opsi pilihan
7. [Action] Simpan custom field
8. [Assertion] Verifikasi `Custom Field Test Select` muncul di daftar dengan tipe select

---

## TC024 — Tambah lead source baru

**Deskripsi:** Verifikasi admin bisa menambahkan sumber lead baru dan muncul di daftar leads.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Leads
3. [Action] Buka form tambah lead baru
4. [Action] Isi nama lead dengan `Lead Test Automation`
5. [Action] Simpan lead
6. [Assertion] Verifikasi `Lead Test Automation` muncul di daftar leads

---

## TC025 — Tambah photo for baru

**Deskripsi:** Verifikasi admin bisa menambahkan item photo for baru dan muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Photo For
3. [Action] Buka form tambah photo for baru
4. [Action] Isi nama dengan `Photo For Test`
5. [Action] Simpan
6. [Assertion] Verifikasi `Photo For Test` muncul di daftar photo for

---

## TC026 — Tambah domisili baru

**Deskripsi:** Verifikasi admin bisa menambahkan kota/domisili baru dan muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/settings` → tab Domisili
3. [Action] Buka form tambah domisili baru
4. [Action] Isi nama domisili dengan `Kota Test Automation`
5. [Action] Simpan
6. [Assertion] Verifikasi `Kota Test Automation` muncul di daftar domisili

---

## Section 11 — Customer Management

---

## TC027 — Buat customer baru dari halaman customers

**Deskripsi:** Verifikasi staff bisa menambahkan customer baru dengan nama dan nomor WhatsApp, dan customer muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/customers`
3. [Action] Buka form tambah customer baru
4. [Action] Isi nama customer dengan `Customer Test Baru`
5. [Action] Isi nomor WhatsApp dengan nomor unik yang valid
6. [Action] Submit form
7. [Assertion] Verifikasi `Customer Test Baru` muncul di daftar customers

---

## TC028 — Search dan filter customer

**Deskripsi:** Verifikasi staff bisa mencari customer berdasarkan nama dan memfilter berdasarkan lead atau domisili.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/customers`
3. [Action] Ketik nama customer di field search
4. [Action] Pilih filter berdasarkan lead
5. [Assertion] Verifikasi daftar customer yang tampil sesuai dengan kriteria pencarian dan filter

---

## TC029 — Edit data customer

**Deskripsi:** Verifikasi staff bisa mengubah data customer yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/customers`
3. [Action] Buka detail salah satu customer yang ada
4. [Action] Buka form edit customer
5. [Action] Ubah nama atau alamat customer
6. [Action] Simpan perubahan
7. [Assertion] Verifikasi data customer yang diubah tersimpan dan tampil di halaman detail

---

## TC030 — View customer detail dan booking history

**Deskripsi:** Verifikasi staff bisa membuka detail customer dan melihat profile card beserta riwayat booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/customers`
3. [Action] Buka halaman detail salah satu customer
4. [Assertion] Verifikasi profile card customer tampil dengan nama, contact, dan statistik
5. [Assertion] Verifikasi section booking history tampil dengan daftar booking customer

---

## Section 12 — Booking: Create

---

## TC031 — Buat booking baru dengan customer baru

**Deskripsi:** Verifikasi staff bisa menyelesaikan wizard booking baru untuk customer baru dan booking muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru
4. [Action] Isi data customer baru dengan nilai valid dan unik
5. [Action] Lanjut ke step paket, pilih paket yang tersedia
6. [Action] Lanjut ke step jadwal, pilih tanggal dalam jam operasional
7. [Action] Pilih jam mulai yang valid dalam jam operasional
8. [Action] Lanjut hingga step ringkasan
9. [Action] Submit booking
10. [Assertion] Verifikasi booking baru muncul di daftar bookings

---

## TC032 — Buat booking dengan customer existing

**Deskripsi:** Verifikasi staff bisa membuat booking menggunakan customer yang sudah ada di sistem.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer existing
4. [Action] Pilih customer dari daftar yang tersedia
5. [Action] Pilih paket yang tersedia
6. [Action] Pilih tanggal dan jam yang valid dalam jam operasional
7. [Action] Lanjut hingga step ringkasan dan submit
8. [Assertion] Verifikasi booking berhasil dibuat dengan data customer yang dipilih

---

## TC033 — Buat booking dengan add-on

**Deskripsi:** Verifikasi staff bisa membuat booking yang menyertakan add-on dan add-on tercatat di detail booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket yang tersedia
5. [Action] Pilih minimal satu add-on dari daftar add-on
6. [Action] Pilih tanggal dan jam yang valid
7. [Action] Lanjut hingga step ringkasan dan submit
8. [Assertion] Verifikasi add-on yang dipilih tampil di detail booking

---

## TC034 — Buat booking dengan background

**Deskripsi:** Verifikasi staff bisa memilih background saat membuat booking dan background tercatat di detail.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket dan minimal satu background yang tersedia
5. [Action] Pilih tanggal dan jam yang valid
6. [Action] Lanjut hingga step ringkasan dan submit
7. [Assertion] Verifikasi background yang dipilih tampil di detail booking

---

## TC035 — Buat booking dengan voucher diskon

**Deskripsi:** Verifikasi staff bisa menggunakan kode voucher saat booking dan potongan diskon tampil di invoice.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket, tanggal, dan jam yang valid
5. [Action] Pada step diskon, masukkan kode voucher yang valid dan aktif
6. [Action] Lanjut hingga step ringkasan dan submit
7. [Assertion] Verifikasi potongan diskon voucher tampil di ringkasan atau invoice booking

---

## TC036 — Buat booking dengan manual discount

**Deskripsi:** Verifikasi staff bisa mengisi diskon manual dan total booking berkurang sesuai nilai diskon.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket, tanggal, dan jam yang valid
5. [Action] Pada step diskon, isi nilai manual discount
6. [Action] Lanjut hingga step ringkasan
7. [Assertion] Verifikasi total booking di ringkasan sudah dikurangi nilai diskon manual
8. [Action] Submit booking

---

## TC037 — Buat booking dengan DP

**Deskripsi:** Verifikasi staff bisa mengisi nominal DP saat booking dan status booking menjadi DP_PAID.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket, tanggal, dan jam yang valid
5. [Action] Pada step pembayaran, isi nominal DP yang valid
6. [Action] Lanjut hingga step ringkasan dan submit
7. [Assertion] Verifikasi detail booking menampilkan DP dan status booking adalah `DP_PAID`

---

## TC038 — Booking conflict: jadwal yang bentrok menampilkan peringatan

**Deskripsi:** Verifikasi sistem menampilkan peringatan konflik saat mencoba memesan slot waktu yang sudah terisi.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buat booking pertama pada tanggal dan jam tertentu, submit sampai berhasil
3. [Action] Buka `/bookings/new` kembali
4. [Action] Pilih paket dan tanggal yang sama dengan booking pertama
5. [Action] Pilih jam yang sama atau tumpang tindih dengan booking pertama
6. [Assertion] Verifikasi peringatan konflik jadwal tampil di step sesi atau waktu

---

## TC039 — Booking di luar jam operasional menampilkan warning

**Deskripsi:** Verifikasi sistem menampilkan warning saat jam yang dipilih berada di luar jam operasional studio.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`
3. [Action] Pilih opsi customer baru, isi data customer
4. [Action] Pilih paket yang tersedia
5. [Action] Pilih tanggal sesi
6. [Action] Pilih jam mulai yang berada di luar jam operasional studio
7. [Assertion] Verifikasi peringatan jam operasional tampil dan langkah tidak bisa dilanjutkan

---

## Section 13 — Booking: List & Detail

---

## TC040 — Search, filter, dan sort booking list

**Deskripsi:** Verifikasi staff bisa mempersempit daftar booking menggunakan search, filter status, dan pengurutan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings`
3. [Action] Ketik kata kunci di field search
4. [Action] Pilih filter status booking
5. [Action] Ubah urutan sort berdasarkan tanggal
6. [Action] Buka booking pertama dari hasil
7. [Assertion] Verifikasi halaman detail booking tampil

---

## TC041 — Filter Hari Ini pada booking list

**Deskripsi:** Verifikasi shortcut Hari Ini menampilkan hanya booking pada tanggal hari ini.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings`
3. [Action] Klik tombol shortcut Hari Ini
4. [Assertion] Verifikasi daftar booking yang tampil hanya berisi booking pada tanggal hari ini

---

## TC042 — Delete booking dari booking list

**Deskripsi:** Verifikasi staff bisa membuat booking lalu menghapusnya dari daftar dan booking tidak lagi tampil.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new` dan buat booking baru dengan customer bernama `Customer Hapus Test`
3. [Action] Submit booking sampai berhasil
4. [Action] Buka `/bookings`
5. [Action] Cari `Customer Hapus Test` di field search
6. [Action] Klik tombol delete pada booking tersebut
7. [Action] Konfirmasi penghapusan
8. [Assertion] Verifikasi booking `Customer Hapus Test` tidak lagi tampil di daftar

---

## TC043 — Ganti page size dan navigasi pagination

**Deskripsi:** Verifikasi staff bisa mengubah jumlah item per halaman dan berpindah ke halaman berikutnya.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings`
3. [Action] Ubah page size ke nilai berbeda dari default
4. [Action] Navigasi ke halaman berikutnya jika tersedia
5. [Assertion] Verifikasi daftar booking terupdate sesuai halaman dan page size yang dipilih

---

## TC044 — View booking overview tab

**Deskripsi:** Verifikasi staff bisa membuka detail booking dan melihat semua data di tab Overview.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new` dan buat booking baru, submit sampai berhasil
3. [Action] Buka halaman detail booking yang baru dibuat
4. [Action] Pilih tab Overview
5. [Assertion] Verifikasi data customer tampil (nama, WhatsApp)
6. [Assertion] Verifikasi data sesi tampil (tanggal, jam, paket)

---

## TC045 — View booking pricing tab

**Deskripsi:** Verifikasi tab Pricing menampilkan rincian harga, add-on, dan diskon booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail salah satu booking yang ada
3. [Action] Pilih tab Pricing
4. [Assertion] Verifikasi rincian harga paket tampil
5. [Assertion] Verifikasi total booking tampil di tab Pricing

---

## TC046 — Advance status BOOKED → PAID

**Deskripsi:** Verifikasi staff bisa memajukan status booking dari BOOKED ke PAID.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka booking dengan status `BOOKED`
3. [Action] Pilih tab Progress
4. [Action] Klik tombol untuk memajukan status ke PAID
5. [Assertion] Verifikasi badge status booking berubah menjadi `PAID`

---

## TC047 — Advance status PAID → SHOOT_DONE

**Deskripsi:** Verifikasi staff bisa memajukan status booking dari PAID ke SHOOT_DONE.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka booking dengan status `PAID`
3. [Action] Pilih tab Progress
4. [Action] Klik tombol untuk memajukan status ke SHOOT_DONE
5. [Assertion] Verifikasi badge status booking berubah menjadi `SHOOT_DONE`

---

## TC048 — Advance status SHOOT_DONE → PHOTOS_DELIVERED dengan Google Drive link

**Deskripsi:** Verifikasi staff bisa mengisi Google Drive link dan memajukan status ke PHOTOS_DELIVERED.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka booking dengan status `SHOOT_DONE`
3. [Action] Pilih tab Progress
4. [Action] Isi field Google Drive link dengan URL Google Drive yang valid
5. [Action] Klik tombol untuk deliver photos / memajukan ke PHOTOS_DELIVERED
6. [Assertion] Verifikasi status booking berubah menjadi `PHOTOS_DELIVERED`
7. [Assertion] Verifikasi Google Drive link tersimpan dan tampil di halaman

---

## TC049 — Advance status PHOTOS_DELIVERED → CLOSED

**Deskripsi:** Verifikasi staff bisa menutup booking dari status PHOTOS_DELIVERED ke CLOSED.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka booking dengan status `PHOTOS_DELIVERED`
3. [Action] Pilih tab Progress
4. [Action] Klik tombol untuk memajukan status ke CLOSED
5. [Assertion] Verifikasi badge status booking berubah menjadi `CLOSED`

---

## TC050 — Cancel booking

**Deskripsi:** Verifikasi staff bisa membatalkan booking dan status berubah menjadi CANCELED.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka booking yang aktif (bukan CLOSED atau CANCELED)
3. [Action] Pilih tab Progress
4. [Action] Klik tombol cancel booking
5. [Action] Konfirmasi pembatalan
6. [Assertion] Verifikasi badge status booking berubah menjadi `CANCELED`

---

## TC051 — Reschedule booking

**Deskripsi:** Verifikasi staff bisa menjadwal ulang booking ke tanggal dan jam baru, dan perubahan tercatat.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail booking yang aktif
3. [Action] Klik tombol Reschedule
4. [Action] Pilih tanggal baru yang valid dalam jam operasional
5. [Action] Pilih jam mulai baru yang valid
6. [Action] Simpan perubahan jadwal
7. [Assertion] Verifikasi tanggal dan jam sesi di booking detail berubah sesuai jadwal baru
8. [Assertion] Verifikasi badge rescheduled tampil di header booking

---

## TC052 — Edit detail booking

**Deskripsi:** Verifikasi staff bisa mengubah notes atau jumlah orang di detail booking dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail booking yang aktif
3. [Action] Klik tombol Edit Detail
4. [Action] Ubah field notes atau jumlah orang
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi perubahan notes atau jumlah orang tersimpan di tab Overview

---

## TC053 — Tambah DP dan toggle paid dari Pricing tab

**Deskripsi:** Verifikasi staff bisa menambahkan DP dan mengubah status paid, lalu total dan status pembayaran terupdate.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail booking
3. [Action] Pilih tab Pricing
4. [Action] Isi nominal DP yang valid di field DP
5. [Action] Toggle status paid ke nilai yang berbeda
6. [Action] Simpan perubahan
7. [Assertion] Verifikasi nominal DP dan status pembayaran terupdate di tab Pricing

---

## TC054 — Tambah extra add-on ke booking

**Deskripsi:** Verifikasi staff bisa menambahkan extra add-on ke booking yang sudah ada dari tab Pricing.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail booking
3. [Action] Pilih tab Pricing
4. [Action] Buka form tambah extra add-on
5. [Action] Pilih add-on yang tersedia
6. [Action] Simpan
7. [Assertion] Verifikasi extra add-on yang ditambahkan tampil di section extra add-on tab Pricing

---

## TC055 — Mark all paid dan batalkan lunas

**Deskripsi:** Verifikasi aksi Lunas Semua menandai semua item sebagai paid, dan Batalkan Lunas mengembalikannya.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka halaman detail booking dengan item yang belum lunas
3. [Action] Pilih tab Pricing
4. [Action] Klik tombol Lunas Semua
5. [Assertion] Verifikasi semua item tampil sebagai paid
6. [Action] Klik tombol Batalkan Lunas
7. [Assertion] Verifikasi status paid semua item kembali ke unpaid

---

## Section 14a — Photo Delivery

---

## TC056 — Browse dan filter photo delivery list

**Deskripsi:** Verifikasi staff bisa mencari dan memfilter daftar booking di halaman photo delivery.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/photo-delivery`
3. [Action] Ketik nama customer atau booking number di field search
4. [Action] Pilih filter print order status
5. [Assertion] Verifikasi daftar booking yang tampil sesuai kriteria pencarian dan filter

---

## TC057 — Update Google Drive link dan deliver photos

**Deskripsi:** Verifikasi staff bisa mengisi Google Drive link dan menandai foto sebagai sudah dikirim.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/photo-delivery`
3. [Action] Klik baris booking untuk membuka delivery detail
4. [Action] Isi field Google Drive link dengan URL yang valid
5. [Action] Simpan link
6. [Action] Klik tombol deliver photos
7. [Action] Konfirmasi aksi jika diperlukan
8. [Assertion] Verifikasi booking tampil dengan status `PHOTOS_DELIVERED`

---

## TC058 — Update print order progress

**Deskripsi:** Verifikasi staff bisa memajukan status print order dan perubahan tampil di delivery detail.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/photo-delivery`
3. [Action] Klik baris booking yang memiliki print order untuk membuka detail
4. [Action] Majukan status print order ke step berikutnya
5. [Action] Simpan perubahan jika diperlukan
6. [Assertion] Verifikasi status print order terupdate ke step yang baru

---

## Section 14b — Calendar

---

## TC059 — View kalender internal dengan tampilan day, week, dan month

**Deskripsi:** Verifikasi staff bisa beralih antara tampilan hari, minggu, dan bulan di kalender internal.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/calendar`
3. [Action] Pilih tampilan day view
4. [Action] Pilih tampilan week view
5. [Action] Pilih tampilan month view
6. [Assertion] Verifikasi calendar berubah sesuai tampilan yang dipilih terakhir

---

## TC060 — Cek ketersediaan dari kalender dan mulai booking baru

**Deskripsi:** Verifikasi staff bisa membuka modal availability dari kalender dan langsung mulai wizard booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/calendar`
3. [Action] Pilih tanggal di kalender
4. [Action] Buka modal cek ketersediaan jadwal
5. [Action] Gunakan shortcut untuk mulai booking baru dari modal tersebut
6. [Assertion] Verifikasi wizard booking baru tampil

---

## TC061 — Buka popup booking di kalender dan navigasi ke detail

**Deskripsi:** Verifikasi staff bisa mengklik event booking di kalender untuk membuka popup dan masuk ke detail booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/calendar`
3. [Action] Klik event booking yang tampil di kalender
4. [Action] Dari popup yang muncul, klik link untuk membuka detail booking
5. [Assertion] Verifikasi halaman detail booking tampil

---

## Section 14c — Reminders

---

## TC062 — View reminders di tiga tab

**Deskripsi:** Verifikasi daftar upcoming booking tampil di tab Hari Ini, 7 Hari, dan 30 Hari.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/reminders`
3. [Action] Pilih tab Hari Ini
4. [Assertion] Verifikasi daftar booking aktif hari ini tampil
5. [Action] Pilih tab 7 Hari
6. [Assertion] Verifikasi daftar upcoming booking 7 hari ke depan tampil
7. [Action] Pilih tab 30 Hari
8. [Assertion] Verifikasi daftar upcoming booking 30 hari ke depan tampil

---

## TC063 — Buka link WhatsApp reminder dari halaman reminders

**Deskripsi:** Verifikasi staff bisa mengklik link WhatsApp dari halaman reminders dan browser navigasi ke WhatsApp.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/reminders`
3. [Action] Pilih tab 7 Hari
4. [Action] Klik link WhatsApp reminder untuk salah satu booking
5. [Assertion] Verifikasi browser navigasi ke halaman WhatsApp send message

---

## TC064 — Mark dan unmark booking sebagai sudah diremind

**Deskripsi:** Verifikasi staff bisa menandai booking sebagai sudah diremind dan membatalkan tanda tersebut.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/reminders` → tab 7 Hari
3. [Action] Tandai salah satu booking sebagai sudah diremind
4. [Assertion] Verifikasi badge sudah diremind tampil pada booking tersebut
5. [Action] Batalkan tanda reminded pada booking yang sama
6. [Assertion] Verifikasi booking kembali tampil sebagai belum diremind

---

## Section 14d — Finance

---

## TC065 — View ringkasan finance per bulan dan tahun

**Deskripsi:** Verifikasi summary cards income, expense, dan profit tampil setelah memilih bulan dan tahun.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/finance`
3. [Action] Pilih bulan yang valid di filter bulan
4. [Action] Pilih tahun yang valid di filter tahun
5. [Assertion] Verifikasi summary card total income tampil
6. [Assertion] Verifikasi summary card total expense tampil
7. [Assertion] Verifikasi summary card gross profit tampil

---

## TC066 — Tambah manual expense

**Deskripsi:** Verifikasi staff bisa menambahkan pengeluaran manual dan expense muncul di tabel.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/finance`
3. [Action] Buka form tambah expense manual
4. [Action] Isi deskripsi dengan `Expense Test Automation`
5. [Action] Isi nominal amount yang valid
6. [Action] Pilih tanggal expense
7. [Action] Simpan expense
8. [Assertion] Verifikasi `Expense Test Automation` muncul di tabel expenses

---

## TC067 — Edit expense yang ada

**Deskripsi:** Verifikasi staff bisa mengubah nominal atau deskripsi expense yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/finance`
3. [Action] Buka form edit untuk salah satu expense yang ada
4. [Action] Ubah nominal amount atau deskripsi
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi perubahan expense tersimpan di tabel

---

## TC068 — Delete expense

**Deskripsi:** Verifikasi staff bisa menghapus expense dan expense tidak lagi tampil di tabel.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/finance`
3. [Action] Klik tombol delete pada salah satu expense
4. [Action] Konfirmasi penghapusan
5. [Assertion] Verifikasi expense yang dihapus tidak lagi tampil di tabel

---

## TC069 — Close booking dari halaman finance

**Deskripsi:** Verifikasi staff bisa menutup booking langsung dari halaman finance dan booking tampil sebagai closed.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings/new`, buat booking baru dan submit
3. [Action] Buka `/finance`
4. [Action] Temukan booking yang baru dibuat di tabel income
5. [Action] Klik aksi close booking pada baris tersebut
6. [Assertion] Verifikasi booking tampil sebagai closed di halaman finance

---

## TC070 — Export finance workbook

**Deskripsi:** Verifikasi staff bisa mengekspor data finance dan UI mengindikasikan export berhasil.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/finance`
3. [Action] Pilih bulan dan tahun
4. [Action] Klik tombol export workbook
5. [Assertion] Verifikasi UI menampilkan indikasi export berhasil, seperti file yang diunduh atau konfirmasi

---

## Section 14e — Vendors

---

## TC071 — Tambah vendor baru

**Deskripsi:** Verifikasi staff bisa menambahkan vendor baru dengan nama dan kontak, lalu muncul di daftar sebagai active.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/vendors`
3. [Action] Buka form tambah vendor baru
4. [Action] Isi nama vendor dengan `Vendor Test Automation`
5. [Action] Isi data kontak vendor yang valid
6. [Action] Simpan vendor
7. [Assertion] Verifikasi `Vendor Test Automation` muncul di daftar vendor sebagai active

---

## TC072 — Edit vendor yang ada

**Deskripsi:** Verifikasi staff bisa mengubah data vendor yang sudah ada dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/vendors`
3. [Action] Buka form edit untuk salah satu vendor yang ada
4. [Action] Ubah nama atau kontak vendor
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi perubahan data vendor tersimpan di daftar

---

## TC073 — Deactivate vendor

**Deskripsi:** Verifikasi staff bisa menonaktifkan vendor dan vendor tampil sebagai inactive.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/vendors`
3. [Action] Toggle status vendor aktif menjadi inactive
4. [Action] Konfirmasi atau simpan jika diperlukan
5. [Assertion] Verifikasi vendor tampil dengan status inactive

---

## Section 14f — Commissions

---

## TC074 — View komisi staff per periode

**Deskripsi:** Verifikasi staff bisa memilih periode komisi dan melihat ringkasan komisi per staff.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/commissions`
3. [Action] Pilih periode komisi yang valid
4. [Assertion] Verifikasi card komisi per staff tampil dengan jumlah booking dan total komisi

---

## TC075 — Edit commission bonus dan simpan

**Deskripsi:** Verifikasi admin bisa mengubah nilai bonus komisi staff dan total komisi terupdate.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/commissions`
3. [Action] Pilih periode komisi yang valid
4. [Action] Edit nilai default bonus atau package bonus untuk salah satu staff
5. [Action] Simpan perubahan
6. [Assertion] Verifikasi total komisi terupdate setelah perubahan bonus disimpan

---

## TC076 — Save commission record untuk periode

**Deskripsi:** Verifikasi admin bisa menyimpan record komisi untuk periode yang dipilih.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/commissions`
3. [Action] Pilih periode komisi yang valid
4. [Action] Klik tombol save commission
5. [Assertion] Verifikasi komisi tersimpan dan tampil di halaman tanpa error

---

## TC077 — Mark commission as paid dan cek expense di finance

**Deskripsi:** Verifikasi menandai komisi sebagai paid membuat expense baru di halaman finance.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/commissions`
3. [Action] Pilih periode komisi yang valid dengan komisi yang belum paid
4. [Action] Tandai komisi salah satu staff sebagai paid
5. [Action] Buka `/finance`
6. [Action] Pilih bulan yang sama dengan periode komisi
7. [Assertion] Verifikasi expense dengan source komisi tampil di tabel expenses

---

## Section 14g — Activities

---

## TC078 — Browse activity log

**Deskripsi:** Verifikasi halaman activities menampilkan daftar log aktivitas dengan informasi lengkap.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/activities`
3. [Assertion] Verifikasi daftar activity log tampil dengan kolom waktu, user, role, action, dan deskripsi

---

## TC079 — Filter activity log berdasarkan entity dan search

**Deskripsi:** Verifikasi staff bisa memfilter activity log berdasarkan entity dan mencari berdasarkan deskripsi.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/activities`
3. [Action] Ketik kata kunci di field search
4. [Action] Pilih filter entity, misalnya Bookings
5. [Assertion] Verifikasi hasil activity log yang tampil sesuai dengan filter yang dipilih

---

## Section 15 — User Management & Role Management

---

## TC080 — Buat user internal baru

**Deskripsi:** Verifikasi admin bisa membuat user baru dengan data lengkap dan user muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/user-management`
3. [Action] Buka form tambah user baru
4. [Action] Isi nama dengan `User Test Automation`
5. [Action] Isi email dengan `user.automation@example.com`
6. [Action] Isi nomor telepon
7. [Action] Isi password yang valid (minimal 6 karakter)
8. [Action] Isi konfirmasi password dengan nilai yang sama
9. [Action] Pilih role untuk user
10. [Action] Set status user sebagai active
11. [Action] Submit form
12. [Assertion] Verifikasi `User Test Automation` muncul di daftar user management

---

## TC081 — Edit user yang ada

**Deskripsi:** Verifikasi admin bisa mengubah role atau status active user yang bukan primary dan perubahan tersimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/user-management`
3. [Action] Buat user baru dengan nama `User Test Edit` dan data valid, submit
4. [Action] Buka form edit untuk `User Test Edit`
5. [Action] Ubah role atau status active
6. [Action] Simpan perubahan
7. [Assertion] Verifikasi perubahan role atau status aktif tercermin di daftar user

---

## TC082 — Validasi error password terlalu pendek saat create user

**Deskripsi:** Verifikasi form add user menampilkan error validasi jika password kurang dari 6 karakter.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/user-management`
3. [Action] Buka form tambah user baru
4. [Action] Isi nama, email, dan telepon dengan data valid
5. [Action] Isi password dengan nilai yang kurang dari 6 karakter
6. [Action] Isi konfirmasi password dengan nilai yang sama
7. [Action] Submit form
8. [Assertion] Verifikasi error validasi password terlalu pendek tampil

---

## TC083 — Validasi error password tidak sama saat create user

**Deskripsi:** Verifikasi form add user menampilkan error validasi jika password dan konfirmasi tidak sama.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/user-management`
3. [Action] Buka form tambah user baru
4. [Action] Isi nama, email, dan telepon dengan data valid
5. [Action] Isi password dengan nilai valid
6. [Action] Isi konfirmasi password dengan nilai yang berbeda
7. [Action] Submit form
8. [Assertion] Verifikasi error validasi password tidak sama tampil

---

## TC084 — Buat role baru dengan menu access

**Deskripsi:** Verifikasi admin bisa membuat role baru dengan subset menu access dan role muncul di daftar.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/role-management`
3. [Action] Buka form tambah role baru
4. [Action] Isi nama role dengan `Role Test Automation`
5. [Action] Pilih beberapa menu access
6. [Action] Simpan role
7. [Assertion] Verifikasi `Role Test Automation` muncul di daftar role management

---

## TC085 — Edit role menu access menggunakan select all dan clear all

**Deskripsi:** Verifikasi admin bisa memilih semua menu, menghapus semua pilihan, lalu memilih ulang dan menyimpan.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/role-management`
3. [Action] Buat role baru bernama `Role Test Menu Edit`, simpan
4. [Action] Buka form edit role tersebut
5. [Action] Klik tombol Select All untuk memilih semua menu access
6. [Action] Klik tombol Clear All untuk menghapus semua pilihan
7. [Action] Pilih kembali minimal satu menu access
8. [Action] Simpan perubahan
9. [Assertion] Verifikasi role mencerminkan konfigurasi menu access yang terakhir disimpan

---

## TC086 — Edit permission status transition pada role

**Deskripsi:** Verifikasi admin bisa mengubah permission untuk transisi status booking pada suatu role.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/role-management`
3. [Action] Buat role baru bernama `Role Test Status Perms` dengan minimal satu menu access, simpan
4. [Action] Buka form edit role tersebut
5. [Action] Ubah salah satu permission status transition booking
6. [Action] Simpan perubahan
7. [Assertion] Verifikasi role mencerminkan permission status transition yang telah diubah

---

## Section 16 — Public Pages, MUA Calendar, Dashboard, Navigation

---

## TC087 — Akses customer public page via token

**Deskripsi:** Verifikasi halaman publik customer bisa diakses tanpa login menggunakan token dan menampilkan status booking.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings` dan buka salah satu booking yang ada
3. [Action] Temukan dan salin link Customer Page publik dari halaman detail booking tersebut
4. [Action] Sign out dari aplikasi
5. [Action] Buka link Customer Page yang sudah disalin (format `/customer/[token]`)
6. [Assertion] Verifikasi halaman tampil dengan branding studio
7. [Assertion] Verifikasi booking number dan stepper status booking tampil
8. [Assertion] Verifikasi tidak ada informasi sensitif internal yang bocor

---

## TC088 — Akses invoice public page via token

**Deskripsi:** Verifikasi halaman invoice publik bisa diakses tanpa login dan menampilkan detail pembayaran.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings` dan buka salah satu booking yang ada
3. [Action] Temukan dan salin link Invoice publik dari halaman detail booking tersebut
4. [Action] Sign out dari aplikasi
5. [Action] Buka link invoice yang sudah disalin (format `/invoice/[token]`)
6. [Assertion] Verifikasi logo dan data studio tampil
7. [Assertion] Verifikasi invoice number dan daftar item booking tampil
8. [Assertion] Verifikasi total, diskon, DP, dan sisa tagihan tampil

---

## TC089 — Copy link atau share invoice dari halaman invoice

**Deskripsi:** Verifikasi aksi copy link atau share di halaman invoice berfungsi dengan baik.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/bookings` dan buka salah satu booking, salin link Invoice publik
3. [Action] Buka link invoice tersebut di browser
4. [Action] Klik tombol copy link atau share
5. [Assertion] Verifikasi aksi berhasil, misalnya notifikasi "link berhasil disalin" atau share dialog terbuka

---

## TC090 — Browse MUA calendar dengan tampilan day, week, dan month

**Deskripsi:** Verifikasi halaman publik MUA bisa diakses tanpa login dan calendar bisa beralih antar tampilan.

**Steps:**
1. [Action] Tanpa login, buka `/mua`
2. [Action] Pilih tampilan day view
3. [Action] Pilih tampilan week view
4. [Action] Pilih tampilan month view
5. [Assertion] Verifikasi calendar tampil dan beralih sesuai view yang dipilih

---

## TC091 — MUA calendar tidak menampilkan informasi PII customer

**Deskripsi:** Verifikasi event di MUA calendar tidak mengandung informasi yang bisa mengidentifikasi customer.

**Steps:**
1. [Action] Tanpa login, buka `/mua`
2. [Action] Pilih tampilan month view
3. [Action] Buka detail event jika ada event yang tampil di rentang waktu saat ini
4. [Assertion] Verifikasi detail event tidak memuat nama customer, nomor telepon, atau informasi pribadi lainnya

---

## TC092 — Navigate previous dan next pada MUA calendar

**Deskripsi:** Verifikasi navigasi prev/next di MUA calendar memperbarui rentang tanggal yang ditampilkan.

**Steps:**
1. [Action] Tanpa login, buka `/mua`
2. [Action] Pilih tampilan week view
3. [Action] Klik tombol navigasi next untuk ke rentang berikutnya
4. [Action] Klik tombol navigasi previous untuk kembali ke rentang sebelumnya
5. [Assertion] Verifikasi rentang tanggal pada calendar berubah mengikuti navigasi yang dilakukan

---

## TC093 — Dashboard menampilkan KPI bulanan dan jadwal hari ini

**Deskripsi:** Verifikasi dashboard menampilkan statistik bulan berjalan dan daftar sesi hari ini setelah login.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/dashboard`
3. [Assertion] Verifikasi section statistik bulanan tampil, termasuk total booking dan estimasi revenue
4. [Assertion] Verifikasi section jadwal hari ini tampil

---

## TC094 — Quick action buat booking dari dashboard

**Deskripsi:** Verifikasi staff bisa menggunakan quick action di dashboard untuk langsung membuka wizard booking baru.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Buka `/dashboard`
3. [Action] Klik quick action untuk membuat booking baru
4. [Assertion] Verifikasi wizard booking baru tampil

---

## TC095 — Sign out dari aplikasi

**Deskripsi:** Verifikasi user bisa sign out dan diarahkan kembali ke halaman login.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Lakukan sign out dari aplikasi
3. [Assertion] Verifikasi user diarahkan ke halaman `/login`

---

## TC096 — Root route redirect ke halaman internal setelah login

**Deskripsi:** Verifikasi mengunjungi root route `/` saat sudah login meredirect ke halaman internal yang sesuai.

**Steps:**
1. [Action] Login dengan `demo@yoonjae.com` / `demo123`
2. [Action] Navigasi ke `/`
3. [Assertion] Verifikasi user diarahkan ke halaman internal, seperti dashboard atau menu pertama yang dimiliki user
