# Feedback-05 Plan F: Photo Delivery Filter + Calendar Legend + New Booking Draft

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent improvements — FB-24 adds print order status filter to Photo Delivery, FB-07 adds a collapsible toggle to the calendar status legend, FB-11 persists the New Booking form to localStorage so refreshes don't lose work.

**Architecture:** FB-24 is a single-file change in `photo-delivery-client.tsx` (add `printOrderFilter` state + query condition). FB-07 adds `showLegend` state to `calendar-client.tsx` with localStorage persistence. FB-11 adds two `useEffect` hooks and helper functions to `new-booking-client.tsx` — one to save draft on every meaningful state change, one to detect draft on mount.

**Tech Stack:** Next.js 14 App Router, TypeScript, React `useState`/`useEffect`, `localStorage`, Tailwind CSS, ShadCN UI Button, Lucide React.

---

### Task 1: FB-24 — Print Order Status filter in Photo Delivery

**Files:**
- Modify: `src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx`

**Context:**
`PhotoDeliveryClient` already has `statusFilter` (booking status) and `dateFilter`. It needs a second filter for `print_order_status`. `PRINT_ORDER_STATUS_LABEL` is already imported from `@/lib/constants`. The `fetchRows` query already selects `print_order_status`; just add an `.eq()` condition when the filter is not "ALL". The `PrintOrderStatus` type is already imported. Add the new filter Select between the existing booking-status Select and the "Hari Ini" button.

- [ ] **Step 1: Add `printOrderFilter` state**

Inside `PhotoDeliveryClient`, after `const [statusFilter, setStatusFilter] = useState<string>("ALL")`, add:
```tsx
  const [printOrderFilter, setPrintOrderFilter] = useState<string>("ALL");
```

- [ ] **Step 2: Add print order condition to `fetchRows`**

In the `fetchRows` callback, after the existing `statusFilter` condition block, add:
```typescript
      if (printOrderFilter !== "ALL") {
        query = query.eq("print_order_status", printOrderFilter as PrintOrderStatus);
      }
```

- [ ] **Step 3: Add `printOrderFilter` to page-reset effect**

The existing `useEffect` that resets `page` to 0 has deps `[search, statusFilter, dateFilter, pageSize]`. Add `printOrderFilter`:
```typescript
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, dateFilter, pageSize, printOrderFilter]);
```

Also add `printOrderFilter` to the `fetchRows` `useCallback` dependency array:
```typescript
  }, [statusFilter, printOrderFilter, dateFilter, search, page, pageSize, toast]);
```

- [ ] **Step 4: Add the Print Order filter Select to the UI**

In the `{/* Filters */}` flex div, after the booking status `<Select>` (the one with `statusFilter`) and before the `<Button>Hari Ini</Button>`, insert:

```tsx
        <Select value={printOrderFilter} onValueChange={setPrintOrderFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Print Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Print</SelectItem>
            {(Object.keys(PRINT_ORDER_STATUS_LABEL) as PrintOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{PRINT_ORDER_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
```

Note: `PRINT_ORDER_STATUS_LABEL` is already imported; `PrintOrderStatus` type is already imported.

- [ ] **Step 5: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-f && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/photo-delivery/_components/photo-delivery-client.tsx"
git commit -m "feat(photo-delivery): add print order status filter (FB-24)"
```

---

### Task 2: FB-07 — Calendar legend toggle

**Files:**
- Modify: `src/app/(dashboard)/calendar/_components/calendar-client.tsx`

**Context:**
The status legend is at the bottom of `CalendarClient` (lines ~336–345):
```tsx
{/* Status legend */}
<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
  {(Object.entries(BOOKING_STATUS_LABEL) as [BookingStatus, string][])
    .filter(([s]) => s !== "CANCELED")
    .map(([status, label]) => (
      <span key={status} className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
        {label}
      </span>
    ))}
</div>
```
Add a `showLegend` state that persists to `localStorage` key `"calendar_show_legend"`. Initialize it lazily from localStorage (default `true` if not set or set to `"true"`). Add `ChevronUp`/`ChevronDown` icons to the toggle button. The legend items are conditionally rendered; the header row with the toggle button always shows.

- [ ] **Step 1: Add `ChevronUp` and `ChevronDown` to lucide-react import**

In `calendar-client.tsx`, the current import is:
```tsx
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  CalendarSearch,
} from "lucide-react";
```

Add `ChevronUp` and `ChevronDown`:
```tsx
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  ExternalLink,
  CalendarSearch,
} from "lucide-react";
```

- [ ] **Step 2: Add `showLegend` state with localStorage persistence**

Inside `CalendarClient`, after the existing `useState` declarations, add:
```tsx
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("calendar_show_legend") !== "false";
  });

  function toggleLegend() {
    setShowLegend((prev) => {
      const next = !prev;
      localStorage.setItem("calendar_show_legend", String(next));
      return next;
    });
  }
```

- [ ] **Step 3: Replace the legend section**

Replace the entire `{/* Status legend */}` block:

Replace:
```tsx
      {/* Status legend */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        {(Object.entries(BOOKING_STATUS_LABEL) as [BookingStatus, string][])
          .filter(([s]) => s !== "CANCELED")
          .map(([status, label]) => (
            <span key={status} className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
              {label}
            </span>
          ))}
      </div>
```

With:
```tsx
      {/* Status legend */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={toggleLegend}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
        >
          {showLegend ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Legend Status
        </button>
        {showLegend && (
          <div className="flex flex-wrap gap-2">
            {(Object.entries(BOOKING_STATUS_LABEL) as [BookingStatus, string][])
              .filter(([s]) => s !== "CANCELED")
              .map(([status, label]) => (
                <span key={status} className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
                  {label}
                </span>
              ))}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-f && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/calendar/_components/calendar-client.tsx"
git commit -m "feat(calendar): add collapsible legend toggle (FB-07)"
```

---

### Task 3: FB-11 — New Booking draft via localStorage

**Files:**
- Modify: `src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx`

**Context:**
`NewBookingClient` manages 9 state variables (`customerData`, `packagesAddonsData`, `sessionData`, `detailData`, `discountData`, `staffData`, `paymentData`, `customFieldValues`, `dpAmount`) plus `step`. All are saved to `localStorage` key `"new_booking_draft"` as JSON. On mount, if a draft exists with `step > 1` or non-empty customer data, show a banner with "Lanjutkan" and "Mulai Baru" buttons. Saving the draft only starts when user has made meaningful progress (`step > 1` OR `customerData.name` OR `customerData.phone`). The draft is cleared after a successful booking submission.

- [ ] **Step 1: Add `hasDraft` state**

Inside `NewBookingClient`, after `const [dpAmount, setDpAmount] = useState<number>(0)`, add:
```tsx
  const [hasDraft, setHasDraft] = useState(false);
```

- [ ] **Step 2: Add mount effect to detect existing draft**

After the `hasDraft` state declaration, add:
```tsx
  useEffect(() => {
    const saved = localStorage.getItem("new_booking_draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.step > 1 || draft.customerData?.name || draft.customerData?.phone) {
        setHasDraft(true);
      }
    } catch {
      localStorage.removeItem("new_booking_draft");
    }
  }, []);
```

- [ ] **Step 3: Add auto-save effect**

After the mount effect, add:
```tsx
  useEffect(() => {
    const hasProgress = step > 1 || !!customerData.name || !!customerData.phone;
    if (!hasProgress) return;
    const draft = {
      step,
      customerData,
      packagesAddonsData,
      sessionData,
      detailData,
      discountData,
      staffData,
      paymentData,
      customFieldValues,
      dpAmount,
    };
    localStorage.setItem("new_booking_draft", JSON.stringify(draft));
  }, [step, customerData, packagesAddonsData, sessionData, detailData, discountData, staffData, paymentData, customFieldValues, dpAmount]);
```

- [ ] **Step 4: Add `restoreDraft` and `clearDraft` helpers**

After the auto-save `useEffect`, add:
```tsx
  function restoreDraft() {
    const saved = localStorage.getItem("new_booking_draft");
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.step)               setStep(d.step);
      if (d.customerData)       setCustomerData(d.customerData);
      if (d.packagesAddonsData) setPackagesAddonsData(d.packagesAddonsData);
      if (d.sessionData)        setSessionData(d.sessionData);
      if (d.detailData)         setDetailData(d.detailData);
      if (d.discountData)       setDiscountData(d.discountData);
      if (d.staffData)          setStaffData(d.staffData);
      if (d.paymentData)        setPaymentData(d.paymentData);
      if (d.customFieldValues)  setCustomFieldValues(d.customFieldValues);
      if (d.dpAmount !== undefined) setDpAmount(d.dpAmount);
    } catch {
      localStorage.removeItem("new_booking_draft");
    }
    setHasDraft(false);
  }

  function clearDraft() {
    localStorage.removeItem("new_booking_draft");
    setHasDraft(false);
  }
```

- [ ] **Step 5: Clear draft on successful submit**

In `handleSubmit`, after the line:
```typescript
      toast({ title: "Booking berhasil dibuat!", description: bookingNumber });
```

Add:
```typescript
      localStorage.removeItem("new_booking_draft");
```

- [ ] **Step 6: Add draft banner to the UI**

In the `return (...)` block, after the `{/* Step indicator */}` div and before the `{/* Step content */}` div, insert:

```tsx
      {/* Draft restore banner */}
      {hasDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm">
          <span className="flex-1 text-amber-800 text-sm">
            📋 Ada draft booking yang belum selesai. Ingin dilanjutkan?
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={restoreDraft}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 h-8"
            >
              Lanjutkan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearDraft}
              className="text-amber-600 hover:bg-amber-100 h-8"
            >
              Mulai Baru
            </Button>
          </div>
        </div>
      )}
```

- [ ] **Step 7: Verify build passes**

```bash
cd D:\projects\yoonjae-space\.worktrees\feedback-05-plan-f && npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/bookings/new/_components/new-booking-client.tsx"
git commit -m "feat(bookings): persist new booking form to localStorage as draft (FB-11)"
```
