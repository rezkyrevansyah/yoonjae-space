---
name: page-dashboard
description: Dashboard page showing quick menu, monthly statistics, action items from print orders, and today's schedule. Aggregation from all modules. Build this LAST. Use when building the main dashboard.
---

# Dashboard — Use Case Detail

Route: `/dashboard` — halaman pertama setelah login. Build LAST karena ini aggregasi semua data.

## Quick Menu (4 clickable cards + icon)
- Buat Booking Baru → /bookings/new
- Lihat Booking → /bookings
- Lihat Kalender → /calendar
- Lihat Reminder → /reminders

## Statistik Bulan Ini (3 cards)
- Total Bookings (COUNT bulan ini)
- Estimasi Revenue (SUM total, status >= PAID, Rp)
- Belum Lunas (COUNT status BOOKED bulan ini)

## Action Items (4 cards dari print_order_status)
- Waiting Selection (COUNT SELECTION)
- At Vendor (COUNT VENDOR)
- Need Packaging (COUNT PACKING)
- Need Shipping (COUNT SHIPPED)

## Jadwal Hari Ini
- List booking hari ini: jam, customer, paket, status badge, clickable → /bookings/[id]
- Empty state jika kosong

## Performance: Promise.all() parallel, server component, Rp format, mobile responsive
