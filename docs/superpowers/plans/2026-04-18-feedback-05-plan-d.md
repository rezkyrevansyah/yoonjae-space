# Feedback-05 Plan D: Calendar Jump to Date + Session Name

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two calendar bugs — FB-21 adds a date-picker input to the calendar header for fast day-view navigation, and FB-22 adds an auto-generated session name with copy button to the booking popup.

**Architecture:** FB-21 inserts a controlled `<input type="date">` into `CalendarClient`'s Row-1 header (only rendered when `view === "day"`), synced with the `cursor` Date state via `toDateStr()`. FB-22 adds a pure `generateSessionName()` utility to `src/lib/utils.ts` and renders the result inside `BookingPopup` as an `InfoRow`-style row with a clipboard copy button.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, React `useState`, `navigator.clipboard` API, Lucide React icons.

---

### Task 1: FB-21 — Jump to Date input in calendar header

**Files:**
- Modify: `src/app/(dashboard)/calendar/_components/calendar-client.tsx`

**Context:**
`CalendarClient`'s top bar Row 1 (`flex items-center gap-2`, ~line 197) contains:
1. View toggle `<div>` (day/week/month buttons)
2. Navigation `<div>` (`ChevronLeft` / "Hari Ini" / `ChevronRight`)
3. A `<span>` nav label with `flex-1` that takes remaining space
4. Loading indicator

The new date input belongs **between item 2 and item 3** — visible only when `view === "day"`. Using `toDateStr(cursor)` (already imported from `@/lib/utils`) as the input value keeps it in sync with the cursor. Parsing with `new Date(value + "T00:00:00")` ensures local-timezone parsing on all platforms.

- [ ] **Step 1: Add the date input between nav group and label**

In `src/app/(dashboard)/calendar/_components/calendar-client.tsx`, locate the `{/* Label */}` comment (after the closing `</div>` of the navigation group). Insert the following block immediately **before** the `{/* Label */}` span:

```tsx
          {/* Jump to Date — day view only */}
          {view === "day" && (
            <input
              type="date"
              value={toDateStr(cursor)}
              onChange={(e) => {
                if (e.target.value) {
                  setCursor(new Date(e.target.value + "T00:00:00"));
                }
              }}
              className="h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] flex-shrink-0"
            />
          )}
```

No new imports are needed — `toDateStr` and `view`/`cursor`/`setCursor` are already in scope.

- [ ] **Step 2: Verify build passes**

```bash
cd D:\projects\yoonjae-space && npm run build 2>&1 | tail -20
```

Expected: exits with code 0, no TypeScript errors. Warnings about dynamic rendering are acceptable.

- [ ] **Step 3: Manual smoke test**

Open `/calendar` in the browser (day view):
1. A native date input appears in the header row between the prev/next buttons and the date label.
2. Picking a date from the input jumps the calendar to that day and the label updates.
3. The input value stays in sync when clicking ChevronLeft/Right or "Hari Ini".
4. Switching to week or month view hides the input entirely.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/calendar/_components/calendar-client.tsx
git commit -m "fix(calendar): add jump-to-date input for day view (FB-21)"
```

---

### Task 2: FB-22 — Session name auto-generate in booking popup

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/app/(dashboard)/calendar/_components/booking-popup.tsx`

**Context:**
Session name format: `DDMMYY_PackageName_ClientName`.
- `DDMMYY` — day/month/year digits sliced from `booking.booking_date` (YYYY-MM-DD), e.g. `090426` for 2026-04-09.
- `PackageName` — first package from `booking.booking_packages[0].packages?.name`; falls back to `booking.packages?.name` (legacy single-package field).
- `ClientName` — `booking.customers?.name`.
- Empty parts are filtered before joining with `_`, so missing data produces a shorter string rather than `__` artifacts.

Example: booking date `2026-04-09`, package `SmashUp!`, client `Devi Ratnasari` → `090426_SmashUp!_Devi Ratnasari`.

`generateSessionName` is a pure utility with no side effects — it belongs in `src/lib/utils.ts`. The display row in `BookingPopup` shows the result with a `Tag` icon (for "label/session") and a `Copy`/`Check` icon button that calls `navigator.clipboard.writeText()` and shows a 2-second green check feedback.

- [ ] **Step 1: Add `generateSessionName` to utils.ts**

Append at the **end** of `src/lib/utils.ts`:

```typescript
export function generateSessionName(booking: {
  booking_date: string;
  booking_packages?: { packages: { name: string } | null }[];
  packages?: { name: string } | null;
  customers?: { name: string; phone: string } | null;
}): string {
  const dd = booking.booking_date.slice(8, 10);
  const mm = booking.booking_date.slice(5, 7);
  const yy = booking.booking_date.slice(2, 4);
  const dateStr = dd + mm + yy;

  const packageName =
    booking.booking_packages?.[0]?.packages?.name ??
    booking.packages?.name ??
    "";

  const clientName = booking.customers?.name ?? "";

  return [dateStr, packageName, clientName].filter(Boolean).join("_");
}
```

- [ ] **Step 2: Update imports in booking-popup.tsx**

In `src/app/(dashboard)/calendar/_components/booking-popup.tsx`, make two import changes:

**a) Add `Copy`, `Check`, `Tag` to the lucide-react import block:**

Replace:
```tsx
import {
  X,
  User,
  CalendarDays,
  Clock,
  Package,
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
```

With:
```tsx
import {
  X,
  User,
  CalendarDays,
  Clock,
  Package,
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Tag,
} from "lucide-react";
```

**b) Add `generateSessionName` to the utils import:**

Replace:
```tsx
import { formatDate, formatTime } from "@/lib/utils";
```

With:
```tsx
import { formatDate, formatTime, generateSessionName } from "@/lib/utils";
```

- [ ] **Step 3: Add `copied` state and `sessionName` derivation**

Inside the `BookingPopup` function body, after the line `const [driveLink, setDriveLink] = useState("")`, add:

```tsx
  const [copied, setCopied] = useState(false);
  const sessionName = generateSessionName(booking);
```

- [ ] **Step 4: Add session name row to popup body**

In the `{/* Body */}` scroll div, locate this line (roughly line 184):
```tsx
          <InfoRow icon={<Users className="h-4 w-4" />} value={`${booking.person_count} orang`} />
```

Insert the session name row **immediately after** that line (before `{booking.photo_for && ...}`):

```tsx
          {sessionName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 flex-shrink-0"><Tag className="h-4 w-4" /></span>
              <span className="flex-1 font-mono text-xs text-gray-600 break-all">{sessionName}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sessionName);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                title="Salin nama sesi"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
```

- [ ] **Step 5: Verify build passes**

```bash
cd D:\projects\yoonjae-space && npm run build 2>&1 | tail -20
```

Expected: exits with code 0, no TypeScript errors.

- [ ] **Step 6: Manual smoke test**

Open `/calendar` in day view, click a booking to open the popup:
1. A session name row appears with a `Tag` icon, e.g. `090426_SmashUp!_Devi Ratnasari` in monospace font.
2. Clicking the copy icon copies the session name to clipboard.
3. The icon briefly turns to a green checkmark for ~2 seconds then reverts to the copy icon.
4. A booking with no package shows e.g. `090426__Devi Ratnasari` — test confirms filter(Boolean) removes the empty part, showing `090426_Devi Ratnasari` instead.
5. In week/month view, clicking a booking also shows the session name (popup is the same component).

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils.ts src/app/(dashboard)/calendar/_components/booking-popup.tsx
git commit -m "feat(calendar): add auto-generated session name with copy button (FB-22)"
```
