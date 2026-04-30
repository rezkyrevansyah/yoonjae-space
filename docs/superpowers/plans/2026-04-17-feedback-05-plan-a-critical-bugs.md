# Feedback 05 — Plan A: Critical Bugs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki 5 critical bug dari Feedback 05 yang memblokir workflow: estimasi waktu salah, overlap tidak terdeteksi, invoice sisa tagihan hilang, voucher gagal tanpa tanggal, dan booking total Rp0 gagal.

**Architecture:** Setiap bug adalah fix independen pada file yang berbeda — tidak ada perubahan schema besar kecuali FB-14 yang butuh ALTER TABLE di Supabase. Fix dikerjakan satu per satu, commit per fix.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS

**Source:** `FEEDBACK_05.md` — FB-09, FB-10, FB-13, FB-14, FB-15

---

## Files yang Dimodifikasi

| File | Bug |
|------|-----|
| `src/app/(dashboard)/bookings/new/_components/step-session.tsx` | FB-09, FB-10 |
| `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx` | FB-15 |
| `src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx` | FB-13 |
| `src/app/(dashboard)/settings/_components/tab-vouchers.tsx` | FB-14 |
| Supabase SQL Editor (manual) | FB-14 |

---

## Task 1: FB-09 — Tampilkan End Time di Step Pilih Waktu

**Problem:** Grid time selection hanya highlight sel 15:00–15:45 untuk paket 60 menit mulai 15:00. User mengira sesi berakhir 15:45, padahal estimasi sudah benar (15:00–16:00). Sel 16:00 tidak di-highlight karena `isInNewRange` check adalah `slotMins < newBookingRange.effEnd` (strict less than), sehingga sel tepat di waktu selesai tidak ikut highlight.

**Fix:** Tambah `isEndTimeSlot` untuk sel tepat di `effEnd`, beri style berbeda (dashed border). Tambah juga teks "Estimasi selesai: HH:MM" di bawah grid saat slot sudah dipilih.

**Files:**
- Modify: `src/app/(dashboard)/bookings/new/_components/step-session.tsx`

- [ ] **Step 1: Buka file dan temukan bagian cell rendering**

  Buka `src/app/(dashboard)/bookings/new/_components/step-session.tsx`.
  Cari baris yang mengandung `const isInNewRange` (sekitar line 293–294).

- [ ] **Step 2: Tambahkan isEndTimeSlot di bawah isInNewRange**

  Tepat setelah baris `const isInNewRange`, tambahkan:

  ```typescript
  const isEndTimeSlot = !isSelected && !isInNewRange && newBookingRange != null &&
    slotMins === newBookingRange.effEnd;
  ```

- [ ] **Step 3: Tambahkan style untuk isEndTimeSlot di className button**

  Cari bagian `className={cn(` pada button time slot. Tambahkan kondisi `isEndTimeSlot` di cn:

  ```typescript
  className={cn(
    "rounded-lg border-2 px-2 py-2 text-sm font-medium transition-colors",
    isSelected
      ? "bg-maroon-700 text-white border-maroon-700"
      : isInNewRange
        ? "bg-maroon-100 text-maroon-700 border-maroon-200"
        : isEndTimeSlot
          ? "bg-white text-maroon-400 border-maroon-300 border-dashed"
          : isExistingBooked
            ? "bg-gray-200 text-gray-400 border-gray-200 cursor-pointer hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            : "bg-white text-gray-700 border-gray-200 hover:border-maroon-300 hover:bg-maroon-50"
  )}
  ```

- [ ] **Step 4: Tambahkan teks estimasi selesai di bawah grid**

  Di dalam komponen, setelah `const newBookingRange = getNewBookingRange(sessionData.start_time);`, tambahkan computed:

  ```typescript
  const estimatedEndTime = newBookingRange
    ? `${String(Math.floor(newBookingRange.effEnd / 60)).padStart(2, "0")}:${String(newBookingRange.effEnd % 60).padStart(2, "0")}`
    : null;
  ```

  Lalu di bawah grid (setelah `</div>` penutup grid timeSlots), tambahkan:

  ```tsx
  {sessionData.start_time && estimatedEndTime && (
    <p className="text-xs text-maroon-700 font-medium mt-1 text-center">
      Estimasi sesi: {sessionData.start_time} — {estimatedEndTime}
    </p>
  )}
  ```

- [ ] **Step 5: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted"
  ```

  Tidak boleh ada error baru.

- [ ] **Step 6: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/new/_components/step-session.tsx"
  git commit -m "fix(FB-09): show end time marker and estimated end time in time grid"
  ```

---

## Task 2: FB-10 — Deteksi Overlap di Step Pilih Waktu

**Problem:** `handleTimeSelect` hanya mengecek apakah `newStart` berada di dalam booking yang sudah ada. Tidak mengecek apakah booking BARU (dengan durasinya) akan bertabrakan dengan booking lain. Sehingga overlap terdeteksi di estimasi waktu tapi tidak di step pilih waktu.

**Fix:** Gunakan `getNewBookingRange(slot)` untuk mendapat full range (effStart–effEnd) dari booking baru, lalu cek interseksi dengan semua existing booking.

**Files:**
- Modify: `src/app/(dashboard)/bookings/new/_components/step-session.tsx`

- [ ] **Step 1: Buka handleTimeSelect (sekitar line 147)**

  Cari fungsi `function handleTimeSelect(slot: string)`.

- [ ] **Step 2: Ganti isi handleTimeSelect**

  Replace seluruh isi fungsi dengan:

  ```typescript
  function handleTimeSelect(slot: string) {
    onChange({ ...sessionData, start_time: slot });
    setConflictInfo(null);
    if (!existingBookings.length) return;

    const newRange = getNewBookingRange(slot);

    if (!newRange) {
      // Paket belum dipilih — cek overlap sederhana berdasarkan start time saja
      const newStart = timeToMinutes(slot);
      for (const b of existingBookings) {
        const existingEffStart = getEffectiveStartMinutes(b);
        const existingEnd = timeToMinutes(b.end_time);
        if (newStart >= existingEffStart && newStart < existingEnd) {
          const beforeAddons = b.booking_addons.filter(
            ba => ba.addons?.need_extra_time && ba.addons.extra_time_position === "before"
          );
          setConflictInfo({
            customerName: b.customers?.name ?? "Customer lain",
            startTime: b.start_time,
            endTime: b.end_time,
            effectiveStart: minutesToTime(existingEffStart),
            addonNames: beforeAddons.map(ba => ba.addons!.name ?? "add-on"),
          });
          return;
        }
      }
      return;
    }

    // Paket sudah dipilih — cek overlap berdasarkan full range (effStart–effEnd)
    for (const b of existingBookings) {
      const existingEffStart = getEffectiveStartMinutes(b);
      const existingEnd = timeToMinutes(b.end_time);
      // Overlap jika dua range bersinggungan: A.start < B.end && A.end > B.start
      if (newRange.effStart < existingEnd && newRange.effEnd > existingEffStart) {
        const beforeAddons = b.booking_addons.filter(
          ba => ba.addons?.need_extra_time && ba.addons.extra_time_position === "before"
        );
        setConflictInfo({
          customerName: b.customers?.name ?? "Customer lain",
          startTime: b.start_time,
          endTime: b.end_time,
          effectiveStart: minutesToTime(existingEffStart),
          addonNames: beforeAddons.map(ba => ba.addons!.name ?? "add-on"),
        });
        return;
      }
    }
  }
  ```

- [ ] **Step 3: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/new/_components/step-session.tsx"
  git commit -m "fix(FB-10): detect full booking range overlap in time selection step"
  ```

---

## Task 3: FB-13 — Tampilkan Sisa Tagihan di Invoice Tanpa DP

**Problem:** Di `invoice-client.tsx`, baris "Sisa Tagihan" hanya dirender di dalam blok `{booking.dp_amount != null && booking.dp_amount > 0 && (...)}`. Jika tidak ada DP tapi ada Extra Add-on yang belum lunas, sisa tagihan tidak tampil.

**Fix:** Pisahkan rendering DP section dan sisa tagihan. Sisa tagihan ditampilkan secara independen berdasarkan status booking, bukan keberadaan DP.

**Files:**
- Modify: `src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx`

- [ ] **Step 1: Buka file dan temukan blok DP + Sisa Tagihan**

  Buka `src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx`.
  Cari baris: `{booking.dp_amount != null && booking.dp_amount > 0 && (` (sekitar line 419).

- [ ] **Step 2: Pisahkan blok DP dan Sisa Tagihan**

  Ganti seluruh blok `{booking.dp_amount != null && booking.dp_amount > 0 && (...)}` dengan:

  ```tsx
  {/* Bagian DP — hanya tampil jika ada DP */}
  {booking.dp_amount != null && booking.dp_amount > 0 && (
    booking.dp_paid_at ? (
      <div className="flex justify-between text-sm text-green-700 border-t border-gray-100 pt-2">
        <span className="flex items-center gap-1.5">
          DP
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
            ✓ Sudah Dibayar
          </span>
        </span>
        <span className="font-mono">{formatRupiah(booking.dp_amount)}</span>
      </div>
    ) : (
      <div className="flex justify-between text-sm text-blue-700 border-t border-gray-100 pt-2">
        <span>DP Dibayar</span>
        <span className="font-mono">− {formatRupiah(booking.dp_amount)}</span>
      </div>
    )
  )}

  {/* Sisa Tagihan — tampil jika belum PAID/CLOSED dan masih ada yang harus dibayar */}
  {booking.status !== "PAID" && booking.status !== "CLOSED" && sisaTagihan > 0 && (
    <div className="flex justify-between text-sm font-semibold text-gray-800 border-t border-gray-100 pt-2">
      <span>Sisa Tagihan</span>
      <span className="font-mono">{formatRupiah(sisaTagihan)}</span>
    </div>
  )}

  {/* LUNAS indicator — tampil jika PAID atau sisa tagihan = 0 */}
  {(booking.status === "PAID" || (booking.status !== "CLOSED" && sisaTagihan === 0 && booking.total > 0)) && (
    <div className="flex justify-between text-sm font-semibold text-green-700 border-t border-gray-100 pt-2">
      <span>Sisa Tagihan</span>
      <span className="font-mono flex items-center gap-1.5">
        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">LUNAS</span>
        {formatRupiah(0)}
      </span>
    </div>
  )}
  ```

- [ ] **Step 3: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(public)/invoice/[bookingId]/_components/invoice-client.tsx"
  git commit -m "fix(FB-13): show sisa tagihan in invoice even when no DP exists"
  ```

---

## Task 4: FB-14 — Voucher Tanpa Periode Waktu

**Problem:** Database kolom `valid_from` dan `valid_until` di tabel `vouchers` memiliki constraint `NOT NULL`. Jika user buat voucher tanpa mengisi tanggal, frontend mengirim `null` tetapi database menolak dengan error. Voucher tanpa batas waktu harusnya valid.

**Fix (2 langkah):**
1. ALTER TABLE di Supabase agar kolom nullable
2. Tambah form validation: jika `valid_until` diisi, `valid_from` wajib diisi juga

**Files:**
- Modify: `src/app/(dashboard)/settings/_components/tab-vouchers.tsx`
- Manual: Supabase SQL Editor

- [ ] **Step 1: Jalankan SQL di Supabase Dashboard**

  Buka **Supabase Dashboard → SQL Editor**. Jalankan:

  ```sql
  ALTER TABLE vouchers ALTER COLUMN valid_from DROP NOT NULL;
  ALTER TABLE vouchers ALTER COLUMN valid_until DROP NOT NULL;
  ```

  Verifikasi berhasil: tidak ada error, query returns "Success".

- [ ] **Step 2: Tambahkan validasi di handleSave**

  Buka `src/app/(dashboard)/settings/_components/tab-vouchers.tsx`.
  Cari fungsi `async function handleSave()`. Tepat setelah baris `if (!form.code || !form.discount_value) return;`, tambahkan:

  ```typescript
  // Jika valid_until diisi tapi valid_from kosong, tolak
  if (form.valid_until && !form.valid_from) {
    toast({
      title: "Periksa tanggal",
      description: "Tanggal 'Berlaku Dari' harus diisi jika 'Berlaku Sampai' diisi.",
      variant: "destructive",
    });
    return;
  }
  ```

- [ ] **Step 3: Verifikasi payload sudah kirim null dengan benar**

  Pastikan di dalam `handleSave`, baris payload masih:
  ```typescript
  valid_from: form.valid_from || null,
  valid_until: form.valid_until || null,
  ```
  Jika belum ada `|| null`, tambahkan. Ini memastikan string kosong dikonversi ke null (bukan empty string yang juga akan ditolak DB).

- [ ] **Step 4: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted"
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add "src/app/(dashboard)/settings/_components/tab-vouchers.tsx"
  git commit -m "fix(FB-14): make voucher date period optional, add frontend validation"
  ```

---

## Task 5: FB-15 — Booking dengan Voucher 100% Diskon (Total Rp0)

**Problem:** Booking dengan total Rp0 (setelah voucher 100%) gagal dengan error "Ada data yang wajib diisi tapi masih kosong". Penyebab: (1) `initialStatus` tidak di-set ke "PAID" untuk total=0, (2) step pembayaran mungkin memvalidasi field payment method sebagai required padahal tidak ada yang perlu dibayar.

**Fix:**
1. Set `initialStatus = "PAID"` secara eksplisit jika `pricing.total === 0`
2. Di `handleSubmit`, skip validasi payment fields jika total=0 dan kirim field opsional sebagai null

**Files:**
- Modify: `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`

- [ ] **Step 1: Buka new-booking-client.tsx dan cari initialStatus logic**

  Buka `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`.
  Cari blok:
  ```typescript
  let initialStatus: string;
  if (dpAmount > 0) {
    initialStatus = "DP_PAID";
  } else {
    initialStatus = settingsGeneral?.default_payment_status === "paid" ? "PAID" : "BOOKED";
  }
  ```

- [ ] **Step 2: Tambahkan check total=0 di awal blok**

  Ganti blok tersebut dengan:

  ```typescript
  const pricing = computePricing();
  let initialStatus: string;
  if (pricing.total === 0) {
    // Voucher 100% atau diskon penuh — otomatis PAID
    initialStatus = "PAID";
  } else if (dpAmount > 0) {
    initialStatus = "DP_PAID";
  } else {
    initialStatus = settingsGeneral?.default_payment_status === "paid" ? "PAID" : "BOOKED";
  }
  ```

  > Catatan: Jika `computePricing()` sudah dipanggil sebelumnya di `handleSubmit` dan hasilnya di-store ke variabel, gunakan variabel tersebut — jangan panggil dua kali. Cek apakah sudah ada `const pricing = computePricing()` di atas blok ini, jika sudah ada cukup hapus `const pricing = computePricing()` yang baru ditambahkan dan langsung gunakan `pricing.total`.

- [ ] **Step 3: Cari insert booking dan pastikan payment_method bisa null**

  Di `handleSubmit`, cari insert ke tabel `bookings`. Pastikan field seperti `payment_method`, `payment_account_name`, dan `transaction_date` bisa null:

  ```typescript
  // Gunakan conditional: jika total=0, field pembayaran boleh null
  const paymentFields = pricing.total === 0 ? {
    transaction_date: null,
    payment_method: null,
    payment_account_name: null,
  } : {
    transaction_date: paymentData.transaction_date || null,
    payment_method: paymentData.payment_method || null,
    payment_account_name: paymentData.payment_account_name || null,
  };
  ```

  Lalu gunakan `...paymentFields` di dalam object insert booking. Sesuaikan dengan struktur insert yang sudah ada — jangan duplikasi field.

- [ ] **Step 4: Pastikan insert invoice tidak wajibkan amount > 0**

  Di `handleSubmit`, cari insert ke tabel `invoices`. Pastikan tidak ada validasi seperti `if (total > 0)` yang skip insert invoice. Invoice tetap perlu dibuat meski total=0 (sebagai bukti transaksi gratis).

- [ ] **Step 5: Lint check**

  ```bash
  cd D:/projects/yoonjae-space && npm run lint 2>&1 | grep -v "Plugin.*conflicted"
  ```

- [ ] **Step 6: Build check**

  ```bash
  cd D:/projects/yoonjae-space && npm run build 2>&1 | grep -E "(Error|error|✓ Compiled)" | head -10
  ```

  Harus ada `✓ Compiled successfully` tanpa TypeScript error baru.

- [ ] **Step 7: Commit**

  ```bash
  git add "src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx"
  git commit -m "fix(FB-15): handle total=Rp0 booking from 100% discount voucher"
  ```

---

## Checklist Self-Review

- [x] FB-09: step-session.tsx — isEndTimeSlot + estimasi text ✓
- [x] FB-10: step-session.tsx — handleTimeSelect full range check ✓
- [x] FB-13: invoice-client.tsx — sisa tagihan independent dari DP ✓
- [x] FB-14: tab-vouchers.tsx + SQL — voucher tanpa tanggal ✓
- [x] FB-15: new-booking-client.tsx — total=0 → PAID ✓
