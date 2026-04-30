# Feedback-05 Plan E: Finance Enhancements

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four Finance improvements — payment method/rekening columns (FB-16+17), search filter (FB-19), invoice preview modal (FB-18), and close-booking button (FB-20).

**Architecture:** All changes are inside the Finance module. `IncomeBooking` interface gains `payment_method` and `payment_account_name` fields; queries in `page.tsx` and `finance-client.tsx` are updated to fetch them. `income-table.tsx` carries the bulk of UI work: new column, search state, invoice Dialog (iframe), and close-button callback. `finance-client.tsx` owns the close-booking async handler and passes it down.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, ShadCN UI Dialog, Lucide React, Supabase JS.

---

### Task 1: FB-16 + FB-17 — Payment method & rekening columns in income table

**Files:**
- Modify: `src/lib/types/database.ts` (Booking interface)
- Modify: `src/app/(dashboard)/finance/page.tsx` (server query)
- Modify: `src/app/(dashboard)/finance/_components/finance-client.tsx` (IncomeBooking + fetchData)
- Modify: `src/app/(dashboard)/finance/_components/income-table.tsx` (IncomeBooking + column)

**Context:**
`payment_method` (values: `"cash"`, `"qris"`, `"transfer"`) and `payment_account_name` (e.g. `"BCA a.n. John Doe"`) are stored in the `bookings` table but missing from `database.ts` and from the Finance query selects. The `page.tsx` server query also omits `transaction_date` — fix that too. Desktop table currently has 7 columns (Booking ID, Customer, Tanggal, Paket, Status, Total, action); add "Pembayaran" as col 5, making it 8 cols total. Footer `colSpan` must change from 5 to 6. Mobile card: add payment method as a sub-line below package name.

- [ ] **Step 1: Add payment fields to `Booking` type**

In `src/lib/types/database.ts`, after `dp_paid_at: string | null;` (line ~230), add:

```typescript
  payment_method: string | null;
  payment_account_name: string | null;
```

- [ ] **Step 2: Update `IncomeBooking` interface in `finance-client.tsx`**

In `src/app/(dashboard)/finance/_components/finance-client.tsx`, update the `IncomeBooking` export interface:

Replace:
```typescript
export interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  customers: { name: string } | null;
  packages: { name: string } | null;
}
```

With:
```typescript
export interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_account_name: string | null;
  customers: { name: string } | null;
  packages: { name: string } | null;
}
```

- [ ] **Step 3: Update `fetchData` query in `finance-client.tsx`**

In the `fetchData` callback, update the bookings select string:

Replace:
```typescript
        .select("id, booking_number, booking_date, transaction_date, created_at, status, total, customers(name), packages(name)")
```

With:
```typescript
        .select("id, booking_number, booking_date, transaction_date, created_at, status, total, payment_method, payment_account_name, customers(name), packages(name)")
```

- [ ] **Step 4: Update server query in `finance/page.tsx`**

Replace:
```typescript
      .select("id, booking_number, booking_date, created_at, status, total, customers(name), packages(name)")
```

With:
```typescript
      .select("id, booking_number, booking_date, transaction_date, created_at, status, total, payment_method, payment_account_name, customers(name), packages(name)")
```

- [ ] **Step 5: Update `IncomeBooking` interface in `income-table.tsx`**

In `src/app/(dashboard)/finance/_components/income-table.tsx`, update the local `IncomeBooking` interface:

Replace:
```typescript
interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  customers: { name: string } | null;
  packages: { name: string } | null;
}
```

With:
```typescript
interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_account_name: string | null;
  customers: { name: string } | null;
  packages: { name: string } | null;
}
```

- [ ] **Step 6: Add "Pembayaran" column to desktop table header**

In `income-table.tsx`, in the desktop `<thead>`, after the `<th>Paket</th>` column and before the `<th>Status</th>` column, insert:

```tsx
                  <th className="px-4 py-2 text-left font-medium">Pembayaran</th>
```

- [ ] **Step 7: Add payment cell to desktop table rows**

In the desktop `<tbody>`, after the `<td>` for `b.packages?.name` and before the `<td>` for the status badge, insert:

```tsx
                    <td className="px-4 py-2.5 text-gray-600">
                      {b.payment_method ? (
                        <div>
                          <span className="capitalize text-xs font-medium">{b.payment_method}</span>
                          {b.payment_account_name && (
                            <p className="text-xs text-gray-400 mt-0.5">{b.payment_account_name}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
```

- [ ] **Step 8: Fix footer colSpan**

In the desktop `<tfoot>`, update `colSpan={5}` to `colSpan={6}`:

Replace:
```tsx
                  <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-gray-700">
```

With:
```tsx
                  <td colSpan={6} className="px-4 py-2.5 text-sm font-semibold text-gray-700">
```

- [ ] **Step 9: Add payment info to mobile cards**

In the mobile cards section, after `<p className="text-xs text-gray-500">{b.packages?.name ?? "-"}</p>`, add:

```tsx
                    {b.payment_method && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span className="capitalize">{b.payment_method}</span>
                        {b.payment_account_name && ` · ${b.payment_account_name}`}
                      </p>
                    )}
```

- [ ] **Step 10: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-e && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add src/lib/types/database.ts \
  "src/app/(dashboard)/finance/page.tsx" \
  "src/app/(dashboard)/finance/_components/finance-client.tsx" \
  "src/app/(dashboard)/finance/_components/income-table.tsx"
git commit -m "feat(finance): add payment method and rekening columns to income table (FB-16, FB-17)"
```

---

### Task 2: FB-19 — Search filter in income table

**Files:**
- Modify: `src/app/(dashboard)/finance/_components/income-table.tsx`

**Context:**
Add a search input to `income-table.tsx` that filters `bookings` by customer name or booking number (case-insensitive substring match). The search is local component state. The filtered subset also drives the footer total and the pagination. The search input goes in the card header row next to the "N booking" count.

- [ ] **Step 1: Add `Search` icon import and `searchQuery` state**

In `income-table.tsx`:

a) Add `Search` to the lucide-react import:
```tsx
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
```

b) Inside `IncomeTable`, after the existing `useState` declarations, add:
```tsx
  const [searchQuery, setSearchQuery] = useState("");
```

- [ ] **Step 2: Derive `filteredBookings` from search**

After the existing `const sorted = ...` block, insert a `filteredBookings` derivation **before** `sorted`. Restructure to filter first, then sort:

Replace the existing `sorted` derivation:
```typescript
  const sorted = [...bookings].sort((a, b) => {
    if (sortField === "created_at") {
      return sortAsc
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    }
    return sortAsc ? a.total - b.total : b.total - a.total;
  });
```

With:
```typescript
  const q = searchQuery.toLowerCase().trim();
  const filteredBookings = q
    ? bookings.filter(
        (b) =>
          b.booking_number.toLowerCase().includes(q) ||
          (b.customers?.name ?? "").toLowerCase().includes(q)
      )
    : bookings;

  const sorted = [...filteredBookings].sort((a, b) => {
    if (sortField === "created_at") {
      return sortAsc
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    }
    return sortAsc ? a.total - b.total : b.total - a.total;
  });
```

- [ ] **Step 3: Update `total` to reflect filtered bookings**

Replace:
```typescript
  const total = bookings.reduce((sum, b) => sum + b.total, 0);
```

With:
```typescript
  const total = filteredBookings.reduce((sum, b) => sum + b.total, 0);
```

Also update `hiddenCount` to use `sorted.length` (already correct since `sorted` now comes from `filteredBookings`).

- [ ] **Step 4: Add search input to the card header**

In the card header `<div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">`, replace the existing content:

Replace:
```tsx
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Income dari Booking</h2>
        <span className="text-xs text-gray-500">{bookings.length} booking</span>
      </div>
```

With:
```tsx
      <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center justify-between flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Income dari Booking</h2>
          <span className="text-xs text-gray-500">
            {searchQuery ? `${filteredBookings.length} / ${bookings.length}` : `${bookings.length}`} booking
          </span>
        </div>
        <div className="relative sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Cari customer / booking..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1A1A] focus:border-[#8B1A1A]"
          />
        </div>
      </div>
```

- [ ] **Step 5: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-e && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/finance/_components/income-table.tsx"
git commit -m "feat(finance): add search filter to income table (FB-19)"
```

---

### Task 3: FB-18 — Invoice preview modal button

**Files:**
- Modify: `src/app/(dashboard)/finance/_components/income-table.tsx`

**Context:**
Add a `Receipt` icon button to each income row. Clicking it opens a ShadCN `Dialog` containing an `<iframe>` that loads `/invoice/[bookingId]` (the existing public invoice page). The Dialog is managed by `invoiceBookingId` state (`string | null`) inside `income-table.tsx`. On desktop the button appears in the action column alongside the existing `ExternalLink` button. On mobile the entire card is already a `<Link>` — add an overlay icon button for the invoice.

- [ ] **Step 1: Add Dialog import and `Receipt` icon**

a) Add Dialog imports:
```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
```

b) Add `Receipt` to the lucide-react import line (alongside the existing icons):
```tsx
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Receipt } from "lucide-react";
```

- [ ] **Step 2: Add `invoiceBookingId` state**

Inside `IncomeTable`, after `const [searchQuery, setSearchQuery] = useState("")`, add:
```tsx
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
```

- [ ] **Step 3: Add invoice button to desktop table rows**

In the desktop table, the last `<td>` currently contains the `ExternalLink` link. Replace it to hold two buttons:

Replace:
```tsx
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/bookings/${b.id}`}
                        target="_blank"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#8B1A1A]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
```

With:
```tsx
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setInvoiceBookingId(b.id)}
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/bookings/${b.id}`}
                          target="_blank"
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Detail Booking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
```

- [ ] **Step 4: Add invoice button to mobile cards**

The mobile section renders each booking as a `<Link>`. Wrap the link in a `<div>` with relative positioning and overlay a small invoice button in the top-right. Replace the outer `<Link>` wrapper:

Replace:
```tsx
            <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
```

With:
```tsx
            <div key={b.id} className="relative">
              <Link
                href={`/bookings/${b.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
```

And close with `</div>` after the current `</Link>`, adding the invoice button between them:

Replace:
```tsx
              </Link>
```
(the closing tag of the mobile card Link — make sure to match the right one, just before `{/* Mobile total footer */}`)

With:
```tsx
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); setInvoiceBookingId(b.id); }}
                className="absolute top-3 right-4 text-gray-300 hover:text-[#8B1A1A] transition-colors"
                title="Lihat Invoice"
              >
                <Receipt className="w-4 h-4" />
              </button>
            </div>
```

- [ ] **Step 5: Add the Invoice Dialog at bottom of component return**

At the end of the `IncomeTable` return, just before the final closing `</div>` of the card, add:

```tsx
      {/* Invoice preview modal */}
      {invoiceBookingId && (
        <Dialog open onOpenChange={(open) => { if (!open) setInvoiceBookingId(null); }}>
          <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden">
            <iframe
              src={`/invoice/${invoiceBookingId}`}
              className="w-full h-full border-0"
              title="Invoice Preview"
            />
          </DialogContent>
        </Dialog>
      )}
```

- [ ] **Step 6: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-e && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/finance/_components/income-table.tsx"
git commit -m "feat(finance): add invoice preview modal to income table (FB-18)"
```

---

### Task 4: FB-20 — Close booking button

**Files:**
- Modify: `src/app/(dashboard)/finance/_components/finance-client.tsx`
- Modify: `src/app/(dashboard)/finance/_components/income-table.tsx`

**Context:**
Add a `CheckSquare2` icon button per income row that changes the booking status to `"CLOSED"`. The button is only visible for bookings where `status !== "CLOSED"`. The async handler lives in `finance-client.tsx` (it needs `currentUser` for the activity log and `fetchData` for refresh). `IncomeTable` receives an optional `onCloseBooking?: (id: string) => Promise<void>` prop; the button is only rendered when the prop is provided. `finance-client.tsx` passes it to `IncomeTable` (for all users since Finance page is already access-controlled by `menu_access`).

- [ ] **Step 1: Add `onCloseBooking` to `IncomeTable` Props**

In `income-table.tsx`, update the `Props` interface:

Replace:
```typescript
interface Props {
  bookings: IncomeBooking[];
  loading: boolean;
}
```

With:
```typescript
interface Props {
  bookings: IncomeBooking[];
  loading: boolean;
  onCloseBooking?: (id: string) => Promise<void>;
}
```

Update the function signature:
```typescript
export function IncomeTable({ bookings, loading, onCloseBooking }: Props) {
```

- [ ] **Step 2: Add `closingId` state and `CheckSquare2` import**

a) Add `CheckSquare2` to the lucide-react import:
```tsx
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Receipt, CheckSquare2 } from "lucide-react";
```

b) Inside `IncomeTable`, after `const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null)`, add:
```tsx
  const [closingId, setClosingId] = useState<string | null>(null);
```

- [ ] **Step 3: Add close button to desktop table rows**

In the desktop table action cell (the `<div className="flex items-center gap-1.5 ...">` added in Task 3), add the close button before the `Receipt` button:

Replace:
```tsx
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setInvoiceBookingId(b.id)}
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/bookings/${b.id}`}
                          target="_blank"
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Detail Booking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
```

With:
```tsx
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onCloseBooking && b.status !== "CLOSED" && (
                          <button
                            onClick={async () => {
                              setClosingId(b.id);
                              await onCloseBooking(b.id);
                              setClosingId(null);
                            }}
                            disabled={closingId === b.id}
                            className="text-gray-400 hover:text-green-600 transition-colors disabled:opacity-40"
                            title="Tutup Booking"
                          >
                            <CheckSquare2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setInvoiceBookingId(b.id)}
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/bookings/${b.id}`}
                          target="_blank"
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Detail Booking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
```

- [ ] **Step 4: Add `handleCloseBooking` to `finance-client.tsx`**

In `src/app/(dashboard)/finance/_components/finance-client.tsx`, add the `handleCloseBooking` function after `handleDeleteExpense`:

```typescript
  async function handleCloseBooking(bookingId: string) {
    await supabase
      .from("bookings")
      .update({ status: "CLOSED" })
      .eq("id", bookingId);

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "UPDATE",
      entity: "bookings",
      entity_id: bookingId,
      description: `Status booking ditutup (CLOSED) dari halaman Finance`,
    });

    fetchData();
  }
```

- [ ] **Step 5: Pass `onCloseBooking` to `IncomeTable`**

In `finance-client.tsx`, update the `<IncomeTable>` call:

Replace:
```tsx
      <IncomeTable bookings={filteredIncomeBookings} loading={loading} />
```

With:
```tsx
      <IncomeTable bookings={filteredIncomeBookings} loading={loading} onCloseBooking={handleCloseBooking} />
```

- [ ] **Step 6: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-e && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/finance/_components/finance-client.tsx" \
  "src/app/(dashboard)/finance/_components/income-table.tsx"
git commit -m "feat(finance): add close-booking button to income table (FB-20)"
```
