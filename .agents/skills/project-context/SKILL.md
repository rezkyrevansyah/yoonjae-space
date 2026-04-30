---
name: project-context
description: Complete database schema, table relationships, and business logic for Yoonjaespace Studio Management. ALWAYS read this skill first before working on any module. Use when creating pages, writing queries, designing components, or troubleshooting data issues.
---

# Yoonjaespace — Project Context & Database Schema

> Baca skill ini PERTAMA sebelum mengerjakan modul apapun. Tentukan sendiri tabel mana yang dibutuhkan berdasarkan keterangan "Dipakai oleh" di setiap tabel.

## Design Theme
- Light theme, red maroon accent
- Primary: #8B1A1A, Hover: #B22222, Light BG: #FEF2F2
- Accent: #DC2626, Background: #FFF, Surface: #F9FAFB, Border: #E5E7EB
- Text: #111827 (primary), #6B7280 (secondary)
- Mobile-first (375px+), touch-friendly (min 44px targets)

## Page Routes

| Page | Route | Auth |
|------|-------|:----:|
| Login | `/login` | No |
| Dashboard | `/dashboard` | Yes |
| Bookings | `/bookings` | Yes |
| Create Booking | `/bookings/new` | Yes |
| Booking Detail | `/bookings/[id]` | Yes |
| Customer Page | `/customer/[bookingId]` | **No** |
| Invoice | `/invoice/[bookingId]` | **No** |
| Calendar | `/calendar` | Yes |
| MUA Page | `/mua` | **No** |
| Customers | `/customers` | Yes |
| Customer Detail | `/customers/[id]` | Yes |
| Reminders | `/reminders` | Yes |
| Finance | `/finance` | Yes |
| Vendors | `/vendors` | Yes |
| Commissions | `/commissions` | Yes |
| Activities | `/activities` | Yes |
| User Management | `/user-management` | Yes |
| Role Management | `/role-management` | Yes |
| Settings | `/settings` | Yes |

---

## Complete Database Schema

### Settings / Configuration

**`settings_general`** (singleton — 1 row, PK: lock boolean)
- open_time (text), close_time (text), default_payment_status ('paid'|'unpaid'), time_slot_interval (int), created_at, updated_at
- **Dipakai oleh**: Create Booking (time slots, default status), Calendar, Customer Page, Dashboard

**`studio_holidays`** (multi-row)
- id (uuid PK), start_date (date), end_date (date), label (text), created_at
- **Dipakai oleh**: Create Booking (validasi tanggal libur)

**`settings_studio_info`** (singleton)
- studio_name, address, google_maps_url, whatsapp_number, email, instagram, logo_url, front_photo_url, footer_text
- **Dipakai oleh**: Sidebar (logo), Invoice (header), Customer Page (studio info), Reminders ({studio_name})

**`settings_reminder_templates`** (singleton)
- reminder_message, thank_you_message, thank_you_payment_message
- Variables: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}
- **Dipakai oleh**: Reminders page

**`packages`**
- id, name, description, price (bigint), duration_minutes (int), include_all_photos (bool), need_extra_time (bool), extra_time_minutes (int), is_active (bool)
- **FK**: bookings.package_id → packages.id
- **Dipakai oleh**: Create Booking, Booking Detail, Calendar, Finance, Invoice

**`backgrounds`**
- id, name, description, is_available (bool)
- **FK**: booking_backgrounds.background_id → backgrounds.id
- **Dipakai oleh**: Create Booking (multi-select), Booking Detail

**`addons`**
- id, name, price (bigint), need_extra_time (bool), extra_time_minutes (int), is_active (bool)
- **FK**: booking_addons.addon_id → addons.id
- **Dipakai oleh**: Create Booking, Booking Detail (pricing), Invoice, MUA Page (filter nama "MUA")

**`vouchers`**
- id, code (UNIQUE), discount_type ('percentage'|'fixed'), discount_value (bigint), valid_from, valid_until, minimum_purchase (bigint), is_active (bool)
- **FK**: bookings.voucher_id → vouchers.id
- **Dipakai oleh**: Create Booking

**`custom_fields`**
- id, label, field_type ('text'|'select'|'checkbox'|'number'|'url'), options (jsonb), is_active (bool)
- **FK**: booking_custom_fields.custom_field_id → custom_fields.id
- **Dipakai oleh**: Create Booking, Booking Detail (overview SAJA, TIDAK di Invoice)

**`leads`**
- id, name, is_active (bool)
- **FK**: customers.lead_id → leads.id
- **Dipakai oleh**: Create Booking, Customers page

**`photo_for`**
- id, name, is_active (bool)
- **FK**: bookings.photo_for_id → photo_for.id
- **Dipakai oleh**: Create Booking, Booking Detail

### User & Auth

**`roles`**
- id, name (UNIQUE), description, menu_access (jsonb array of slugs), is_system (bool)
- Owner role: is_system=true, undeletable
- **Dipakai oleh**: User Management, Sidebar (menu filtering)

**`users`**
- id, auth_id (UNIQUE → Supabase auth.users), name, email (UNIQUE), phone, role_id (FK→roles), is_active, is_primary (bool)
- First owner: is_primary=true, undeletable
- **FK from**: bookings.staff_id, bookings.created_by, commissions.staff_id
- **Dipakai oleh**: Auth, Sidebar, Create Booking, Commissions, User Management

### Core Business

**`customers`**
- id, name, phone (UNIQUE ⚠️), email, instagram, address, domicile, lead_id (FK→leads), notes
- **⚠️ Phone is unique identifier. Validate on Create Booking AND Add Customer.**
- **FK**: bookings.customer_id → customers.id

**`vendors`**
- id, name, category, phone, email, address, notes, is_active
- **FK**: expenses.vendor_id → vendors.id

**`bookings`** ⭐ (tabel utama, paling banyak relasi)
- id, booking_number (UNIQUE, format YJS-YYYYMMDD-XXXX), customer_id (FK→customers), booking_date, start_time, end_time, package_id (FK→packages), photo_for_id (FK→photo_for), person_count, notes, behind_the_scenes, status (enum), print_order_status (enum, nullable), google_drive_link, voucher_id (FK→vouchers), manual_discount (bigint), subtotal (bigint), total (bigint), staff_id (FK→users), created_by (FK→users)

**`booking_backgrounds`** — junction: booking_id (FK CASCADE), background_id (FK CASCADE)
**`booking_addons`** — booking_id (FK CASCADE), addon_id (FK CASCADE), price (snapshot), is_paid, is_extra
**`booking_custom_fields`** — booking_id (FK CASCADE), custom_field_id (FK CASCADE), value
**`invoices`** — invoice_number (UNIQUE, INV-YYYYMMDD-XXXX), booking_id (FK CASCADE), invoice_date

### Finance

**`expenses`** — date, description, amount (bigint), category, vendor_id (FK nullable), notes, source ('manual'|'commission'), source_id (uuid nullable → commissions.id)
**`commissions`** — staff_id (FK→users), period_start (tgl 26), period_end (tgl 25), booking_count, total_amount (bigint), status ('unpaid'|'paid'), paid_at. UNIQUE(staff_id, period_start)

### Support

**`booking_reminders`** — booking_id (FK CASCADE), type ('reminder'|'thank_you'|'thank_you_payment'), sent_at, sent_by (FK→users)
**`activity_log`** — user_id, user_name, user_role, action, entity, entity_id, description, created_at

### DB Helper Functions
- `generate_booking_number()` → 'YJS-YYYYMMDD-XXXX'
- `generate_invoice_number()` → 'INV-YYYYMMDD-XXXX'
- Auto `updated_at` triggers on relevant tables

---

## Key Business Logic

### Booking Status Flow
```
BOOKED → PAID → SHOOT_DONE → PHOTOS_DELIVERED → ADDON_UNPAID → CLOSED
CANCELED (dari status manapun)
```
- default_payment_status='paid' → start at PAID
- Extra addon unpaid → ADDON_UNPAID

### Print Order Flow
```
SELECTION → VENDOR → PRINTING → RECEIVE → PACKING → SHIPPED → DONE
```

### Commission Period: 26th → 25th next month
### Time Slots: open_time to close_time, step = time_slot_interval
### Reminder Variables: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}
### Storage: upsert:true di path fixed (studio/logo, studio/front-photo), cache bust ?t=timestamp
