# Feedback 05 — Plan C: Mobile Bugs (FB-01, FB-02, FB-03)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki 3 bug mobile yang tersisa dari Feedback 05 — layout tabel pembayaran, Today/date input overlap di Progress tab, dan dialog foto terlalu rapat di mobile.

**Architecture:** Tiga fix independen di tiga file terpisah. Tidak ada perubahan schema DB. Task 1 dan 2 adalah CSS/layout one-liner. Task 3 adalah penambahan field tanggal ke form DP.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, ShadCN UI, Lucide React

---

## Files yang Dimodifikasi

| File | Bug |
|------|-----|
| `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx` | FB-02 |
| `src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx` | FB-03 |
| `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx` | FB-01 |

---

## Task 1: FB-02 — Fix Today Button / Date Input Overlap di Tab Progress

**Problem:** Di Print Order section "Belum ada print order", container `<div className="flex-1">` tidak punya `min-w-0`. Tanpa `min-w-0`, flex child tidak bisa menyusut di bawah ukuran kontennya → date input meluap dan Today button bertabrakan di mobile.

**File:**
- Modify: `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx`

- [ ] **Step 1: Buka file dan cari bagian Print Order "no print" section**

  Buka `src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx`.

  Cari blok `!booking.print_order_status ? (` — di dalamnya ada `<div className="flex items-end gap-2">` untuk date input. Di dalam div itu ada `<div className="flex-1">` (tanpa `min-w-0`) yang jadi wrapper untuk Label + input date.

  Kira-kira terlihat seperti ini:
  ```tsx
  <div className="flex items-end gap-2">
    <div className="flex-1">
      <Label className="text-xs text-gray-500 mb-1 block">
        Tanggal Selection (opsional)
      </Label>
      <input
        type="date"
        value={printDate}
        ...
        className="w-full min-w-0 rounded-md ..."
      />
    </div>
    <Button ... onClick={() => setPrintDate(todayStr())}>
      <CalendarDays className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Today</span>
    </Button>
  </div>
  ```

- [ ] **Step 2: Tambahkan `min-w-0` ke container div**

  Ganti:
  ```tsx
  <div className="flex-1">
  ```
  Menjadi:
  ```tsx
  <div className="flex-1 min-w-0">
  ```

  **Catatan:** Hanya ganti yang di dalam Print Order "no print" section (sekitar `!booking.print_order_status ?`). Section lain (status date input di booking flow, dan print date input saat print sudah berjalan) sudah punya `min-w-0`.

- [ ] **Step 3: Lint check**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

  Tidak boleh ada error baru.

- [ ] **Step 4: Commit**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && git add "src/app/(dashboard)/bookings/[id]/_components/tab-progress.tsx" && git commit -m "fix(FB-02): add min-w-0 to print start date input container to fix mobile overlap"
  ```

---

## Task 2: FB-03 — Fix Dialog "Input Link Foto & Deliver" di Photo Delivery

**Problem:** Di `photo-delivery-detail-client.tsx`, dialog "Input Link Foto & Deliver" punya dua issue dibanding versi yang sama di `tab-progress.tsx`:
1. Label "Google Drive Link" pakai `mb-1` (terlalu rapat) — seharusnya `mb-2` seperti di tab-progress
2. Date input container pakai `flex-1` tanpa `min-w-0` — bisa overflow di screen kecil

**File:**
- Modify: `src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx`

- [ ] **Step 1: Buka file dan cari dialog "Input Link Foto & Deliver"**

  Buka `src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx`.

  Cari Dialog di bagian bawah file (sekitar `<Dialog open={showDriveDialog}`). Di dalam dialog ada dua section:
  1. Google Drive Link — `<Label className="mb-1 block">Google Drive Link</Label>`
  2. Tanggal Photos Delivered — `<div className="flex gap-2">` dengan date input dan Today button

- [ ] **Step 2: Fix Label spacing**

  Ganti:
  ```tsx
  <Label className="mb-1 block">Google Drive Link</Label>
  ```
  Menjadi:
  ```tsx
  <Label className="mb-2 block">Google Drive Link</Label>
  ```

- [ ] **Step 3: Fix date input container**

  Di section "Tanggal Photos Delivered", cari `<input type="date"` dan pastikan classnya punya `min-w-0`. Saat ini:
  ```tsx
  <input
    type="date"
    value={deliverDate}
    onChange={(e) => setDeliverDate(e.target.value)}
    className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
  />
  ```

  Ganti menjadi:
  ```tsx
  <input
    type="date"
    value={deliverDate}
    onChange={(e) => setDeliverDate(e.target.value)}
    className="flex-1 min-w-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
  />
  ```

- [ ] **Step 4: Lint check**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && git add "src/app/(dashboard)/photo-delivery/[id]/_components/photo-delivery-detail-client.tsx" && git commit -m "fix(FB-03): fix drive link dialog label spacing and date input mobile overflow"
  ```

---

## Task 3: FB-01 — Tambah Input Tanggal Pembayaran DP + Fix Mobile Layout

**Problem:** Di tab Pembayaran (tab-pricing.tsx):
1. Form DP (inline edit) tidak punya field tanggal pembayaran — tanggal selalu auto-set ke `now`. User ingin bisa pilih tanggal manual.
2. Baris display DP di mobile terlalu sempit — Badge + 3 icon button di kanan terlalu berjejal.

**File:**
- Modify: `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx`

- [ ] **Step 1: Buka file dan kenali struktur**

  Buka `src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx`.

  Cari bagian:
  1. Imports lucide-react di baris awal — `CalendarDays` belum ada, perlu ditambah
  2. State declarations di awal komponen `TabPricing`
  3. `handleSaveDp` function
  4. JSX: `{editingDp ? (` — form edit DP inline
  5. JSX: `{hasDp ? (` — display baris DP dengan Badge + buttons

- [ ] **Step 2: Tambah `CalendarDays` ke import lucide-react**

  Cari baris:
  ```tsx
  import { Plus, Minus, Loader2, CheckCircle2, XCircle, Trash2, Pencil, CreditCard, BadgeCheck } from "lucide-react";
  ```

  Ganti menjadi:
  ```tsx
  import { Plus, Minus, Loader2, CheckCircle2, XCircle, Trash2, Pencil, CreditCard, BadgeCheck, CalendarDays } from "lucide-react";
  ```

- [ ] **Step 3: Tambah state `dpDateInput`**

  Cari blok state declarations di awal komponen. Setelah `const [deletingDp, setDeletingDp] = useState(false);` (atau setelah grup state DP), tambahkan:
  ```tsx
  const [dpDateInput, setDpDateInput] = useState("");
  ```

- [ ] **Step 4: Update `handleSaveDp` — gunakan `dpDateInput` untuk tanggal**

  Cari di dalam `handleSaveDp`:
  ```tsx
  const now = new Date().toISOString();
  // New DP: default to Lunas + update status. Edit: keep existing dp_paid_at unchanged.
  const updatePayload = isNew
    ? { dp_amount: amount, dp_paid_at: now, status: booking.status === "BOOKED" ? "DP_PAID" : booking.status }
    : { dp_amount: amount };
  ```

  Ganti menjadi:
  ```tsx
  const paidAt = dpDateInput
    ? new Date(dpDateInput + "T00:00:00").toISOString()
    : new Date().toISOString();
  // New DP: default to Lunas + update status. Edit: optionally update dp_paid_at if user provided a date.
  const updatePayload = isNew
    ? { dp_amount: amount, dp_paid_at: paidAt, status: booking.status === "BOOKED" ? "DP_PAID" : booking.status }
    : { dp_amount: amount, ...(dpDateInput ? { dp_paid_at: paidAt } : {}) };
  ```

- [ ] **Step 5: Reset `dpDateInput` setelah save sukses**

  Masih di dalam `handleSaveDp`, cari blok setelah berhasil:
  ```tsx
  toast({ title: "DP disimpan", description: formatRupiah(amount) });
  setEditingDp(false);
  setDpInput("");
  ```

  Ganti menjadi:
  ```tsx
  toast({ title: "DP disimpan", description: formatRupiah(amount) });
  setEditingDp(false);
  setDpInput("");
  setDpDateInput("");
  ```

- [ ] **Step 6: Update tombol "Tambah DP" — reset dpDateInput saat open**

  Cari tombol Tambah DP:
  ```tsx
  onClick={() => { setDpInput(""); setEditingDp(true); }}
  ```

  Ganti menjadi:
  ```tsx
  onClick={() => { setDpInput(""); setDpDateInput(""); setEditingDp(true); }}
  ```

- [ ] **Step 7: Update tombol "Edit DP" — pre-fill dpDateInput dari existing paid date**

  Cari tombol edit DP (ikon Pencil):
  ```tsx
  onClick={() => { setDpInput(String(dpAmount)); setEditingDp(true); }}
  ```

  Ganti menjadi:
  ```tsx
  onClick={() => { setDpInput(String(dpAmount)); setDpDateInput(dpPaidAt ? dpPaidAt.slice(0, 10) : ""); setEditingDp(true); }}
  ```

- [ ] **Step 8: Update tombol "Batal" di form edit — reset dpDateInput**

  Cari tombol Batal di dalam `{editingDp ? (` block:
  ```tsx
  <Button size="sm" variant="outline" onClick={() => setEditingDp(false)} className="h-8">
    Batal
  </Button>
  ```

  Ganti menjadi:
  ```tsx
  <Button size="sm" variant="outline" onClick={() => { setEditingDp(false); setDpDateInput(""); }} className="h-8">
    Batal
  </Button>
  ```

- [ ] **Step 9: Tambah field tanggal ke form edit DP**

  Di dalam `{editingDp ? (` block, cari:
  ```tsx
  <div className="space-y-3">
    <div>
      <Input
        type="number"
        ...
      />
      {dpInput && parseInt(dpInput) > 0 && (
        <p className="text-xs text-gray-400 mt-1">{formatRupiah(parseInt(dpInput))}</p>
      )}
    </div>
    <div className="flex gap-2">
      <Button ...>Simpan</Button>
      <Button ...>Batal</Button>
    </div>
  </div>
  ```

  Tambahkan date input section DI ANTARA `</div>` (penutup Input section) dan `<div className="flex gap-2">` (tombol):
  ```tsx
  <div>
    <label className="text-xs text-gray-500 mb-1 block">Tanggal Pembayaran (opsional)</label>
    <div className="flex gap-2">
      <input
        type="date"
        value={dpDateInput}
        onChange={(e) => setDpDateInput(e.target.value)}
        className="flex-1 min-w-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1"
        onClick={() => setDpDateInput(new Date().toISOString().slice(0, 10))}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Hari Ini</span>
      </Button>
    </div>
  </div>
  ```

  Hasil akhir form akan jadi:
  ```tsx
  <div className="space-y-3">
    <div>
      <Input type="number" ... />
      {dpInput && parseInt(dpInput) > 0 && (...)}
    </div>
    <div>
      <label className="text-xs text-gray-500 mb-1 block">Tanggal Pembayaran (opsional)</label>
      <div className="flex gap-2">
        <input type="date" value={dpDateInput} onChange={(e) => setDpDateInput(e.target.value)}
          className="flex-1 min-w-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1"
          onClick={() => setDpDateInput(new Date().toISOString().slice(0, 10))}>
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Hari Ini</span>
        </Button>
      </div>
    </div>
    <div className="flex gap-2">
      <Button ...>Simpan</Button>
      <Button ...>Batal</Button>
    </div>
  </div>
  ```

- [ ] **Step 10: Fix mobile layout baris display DP**

  Cari baris display DP (ketika `hasDp` dan tidak `editingDp`). Saat ini:
  ```tsx
  <div className="flex items-center justify-between rounded-lg border p-3">
    <div>
      <p className="font-semibold text-sm text-gray-900">{formatRupiah(dpAmount!)}</p>
      {dpPaidAt && (
        <p className="text-xs text-gray-500 mt-0.5">
          Dibayar:{" "}
          {new Date(dpPaidAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
    <div className="flex items-center gap-2">
      <Badge className={dpIsLunas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
        {dpIsLunas ? "Lunas" : "Belum Lunas"}
      </Badge>
      <Button (toggle)/>
      <Button (edit)/>
      <Button (delete)/>
    </div>
  </div>
  ```

  Ganti seluruh blok tersebut menjadi (Badge dipindah ke kiri bersama amount, hanya 3 icon button di kanan):
  ```tsx
  <div className="flex items-center justify-between rounded-lg border p-3 gap-2">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-semibold text-sm text-gray-900">{formatRupiah(dpAmount!)}</p>
        <Badge className={dpIsLunas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
          {dpIsLunas ? "Lunas" : "Belum Lunas"}
        </Badge>
      </div>
      {dpPaidAt && (
        <p className="text-xs text-gray-500 mt-0.5">
          Dibayar:{" "}
          {new Date(dpPaidAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleDpPaid}
        disabled={togglingDp}
        className="h-8 px-2"
        title={dpIsLunas ? "Tandai Belum Lunas" : "Tandai Lunas"}
      >
        {togglingDp ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : dpIsLunas ? (
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setDpInput(String(dpAmount)); setDpDateInput(dpPaidAt ? dpPaidAt.slice(0, 10) : ""); setEditingDp(true); }}
        className="h-8 px-2"
        title="Edit nominal DP"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteDp}
        disabled={deletingDp}
        className="h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
        title="Hapus DP"
      >
        {deletingDp ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  </div>
  ```

  **Catatan:** Perhatikan bahwa `onClick` pada tombol edit di atas sudah diupdate untuk juga meng-set `dpDateInput` (konsisten dengan Step 7).

- [ ] **Step 11: Lint check**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && npm run lint 2>&1 | grep -v "Plugin.*conflicted" | grep -E "(Error|error)" | head -20
  ```

- [ ] **Step 12: Build check**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && npm run build 2>&1 | tail -20
  ```

  Harus ada `✓ Compiled successfully` atau `Route (app)` table tanpa error.

- [ ] **Step 13: Commit**

  ```bash
  cd "D:/projects/yoonjae-space/.worktrees/feedback-05-plan-c" && git add "src/app/(dashboard)/bookings/[id]/_components/tab-pricing.tsx" && git commit -m "fix(FB-01): add payment date input to DP form and fix mobile layout of DP row"
  ```

---

## Checklist Self-Review

- [x] FB-02: `min-w-0` ditambah ke print start date container ✓
- [x] FB-03: Label spacing `mb-1` → `mb-2`, date input dapat `min-w-0` ✓
- [x] FB-01: `dpDateInput` state, date input + Hari Ini button di form DP, `handleSaveDp` pakai `dpDateInput`, mobile layout DP row diperbaiki ✓
- [x] Tidak ada perubahan DB schema ✓
- [x] `CalendarDays` diimport ke tab-pricing.tsx ✓
- [x] `dpDateInput` di-reset di semua exit paths (cancel, save) ✓
- [x] Edit mode pre-fill `dpDateInput` dari existing `dpPaidAt` ✓
