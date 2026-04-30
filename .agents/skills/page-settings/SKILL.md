---
name: page-settings
description: Settings page with 10 tabs (General, Reminder Templates, Studio Info, Packages, Backgrounds, Add-ons, Vouchers, Custom Fields, Leads, Photo For). Use when building or modifying the Settings page.
---

# Settings Page — Use Case Detail

Route: `/settings` (authenticated)

Settings menggunakan tabs navigation. Total 10 tab. Ini FONDASI — hampir semua halaman lain bergantung pada data dari Settings.

## Tab 1: General
- Open Time & Close Time (HH:mm)
- Tanggal Libur Studio — date picker (single + range), list libur yang sudah ada + hapus
- Default Payment Status — Paid/Unpaid (Paid = booking baru langsung PAID, Unpaid = mulai BOOKED)
- Time Slot Interval — number (menit)
- Button "Save Changes"

## Tab 2: Reminder Message Template
- 3 textarea: Reminder Message, Thank You Message, Thank You for Payment Message
- Available Variables: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}
- Klik variable → auto-insert ke textarea
- Button "Save Changes"

## Tab 3: Studio Info
- Upload Logo → Storage `studio/logo`, upsert:true, simpan URL ke DB, cache bust ?t=timestamp
- Upload Foto Depan → Storage `studio/front-photo`, sama
- Fields: Studio Name, Address, Google Maps URL, WhatsApp, Email, Instagram
- Footer Text (textarea)
- Button "Save Changes"

## Tab 4: Packages
- List: Name, Price (Rp), Duration, Status, Actions (Edit, Delete)
- Add → modal: Name, Description, Price, Duration (menit), Include All Photos, Need Extra Time (→ extra minutes input), Active/Inactive

## Tab 5: Backgrounds
- List: Name, Description, Available, Actions
- Add → modal: Name, Description, Available for Use

## Tab 6: Add-ons
- List: Name, Price, Extra Time, Status, Actions
- Add → modal: Name, Price, Need Extra Time (→ input), Active/Inactive

## Tab 7: Vouchers
- List: Code, Discount Type, Value, Valid Period, Min Purchase, Status, Actions
- Add → modal: Code, Type (Percentage/Fixed), Value, Valid From/Until, Min Purchase, Active/Inactive

## Tab 8: Custom Fields
- List: Label, Type, Status, Actions
- Add → modal: Label, Type (Text/Select/Checkbox/Number/URL), jika Select → manage options, Active/Inactive
- Active fields muncul di Create Booking sebagai "Additional Information"
- Nilai tampil di Booking Detail overview SAJA, TIDAK di Invoice

## Tab 9: Leads — Simple CRUD: Name, Active/Inactive
## Tab 10: Photo For — Simple CRUD: Name, Active/Inactive

## Requirements
- SSR initial load, client-side CRUD (optimistic)
- Tabs lazy-loaded
- Harga Rupiah (Rp)
- Activity logging setiap CRUD
- Mobile: tabs scroll horizontal, modal full-screen, tables → cards
