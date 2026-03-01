---
name: page-bookings
description: Bookings module — List, Create New Booking, and Booking Detail with Overview/Progress/Pricing tabs. Core feature of Yoonjaespace. Use when building any booking-related functionality.
---

# Bookings — Use Case Detail

## 1. Booking List (`/bookings`)
- Button "Buat Booking" → /bookings/new
- Tabel: Booking ID, Customer, Date, Time, Package, Status (colored badge), Handled By, Created At, Total (Rp), Actions (Detail, Delete)
- Search: nama customer / booking number
- Filter: status dropdown, date range picker
- Pagination: 10/25/50 per halaman
- Status colors: BOOKED=blue, PAID=green, SHOOT_DONE=yellow, PHOTOS_DELIVERED=purple, ADDON_UNPAID=red, CLOSED=gray, CANCELED=dark gray
- Mobile: tabel → cards

## 2. Create New Booking (`/bookings/new`)

Pilihan: **Booking Baru** (customer baru) | **Booking Lama** (existing)

**Customer Baru**: Nama (req), WhatsApp (req, UNIQUE real-time validation), Email, Instagram, Alamat, Domisili, Leads (dropdown dari Settings)

**Customer Lama**: Search/select existing customer

**Session**: Tanggal (+ holiday check → alert), Waktu Mulai (grid clickable buttons, dari open_time s/d close_time, step time_slot_interval)

**Detail**: Jumlah Orang, Paket (dropdown active), Backdrop (multi-select), Photo For (dropdown), Notes, BTS (checkbox)

**Estimasi Waktu**: start + package.duration + extra_times = end. Format: "10:00 - 11:30 (90 menit)"

**Add-ons**: Checkbox list (active), nama + harga, extra time ditambahkan ke estimasi

**Diskon**: Voucher Code (validate: match, active, period, min purchase) ATAU Manual Discount — hanya salah satu

**Custom Fields**: Render active custom_fields sesuai field_type

**Staff in Charge**: Dropdown users (active), default = current user

**Ringkasan Harga**: Sticky bottom (mobile) / sidebar (desktop). Paket + addons - diskon = total (Rp)

**Submit Flow**:
1. Customer baru → insert customers
2. Generate booking_number (DB function)
3. Status: sesuai default_payment_status
4. Insert bookings + booking_backgrounds + booking_addons + booking_custom_fields
5. Generate invoice_number → insert invoices
6. Activity log
7. Redirect /bookings/[id]

## 3. Booking Detail (`/bookings/[id]`)

**Header**: Back, Customer Page (tab baru), WA customer, Invoice (tab baru), Delete

### Tab Overview
- Customer: nama, phone, email, Instagram
- Booking: status badge, tanggal, jam, durasi, paket, orang, photo for, backgrounds, addons, BTS, custom fields values, created by

### Tab Progress
- Status stepper visual: BOOKED → PAID → SHOOT_DONE → PHOTOS_DELIVERED → ADDON_UNPAID → CLOSED
- Button Next / Back / Cancel (dari status manapun)
- Saat SHOOT_DONE → input Google Drive Link + button "Deliver" → PHOTOS_DELIVERED
- Print Order: button "Start Print" → timeline SELECTION→...→DONE, Next/Back
- Print order status real-time di Customer Page

### Tab Pricing
- List addons (original + extra)
- "Add Add-on" → is_extra=true
- Toggle Lunas/Belum Lunas per addon
  - Extra unpaid → ADDON_UNPAID
  - Semua lunas → status kembali
- Total terupdate

## Performance: parallel fetch, optimistic updates, activity log setiap perubahan
