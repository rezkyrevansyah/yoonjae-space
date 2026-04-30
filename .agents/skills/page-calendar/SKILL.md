---
name: page-calendar
description: Calendar page with Day/Week/Month views (like Google Calendar) and public MUA Page. Use when building calendar or MUA schedule features.
---

# Calendar & MUA Page — Use Case Detail

## Calendar (`/calendar`) — authenticated

3 mode: **Day** (default), **Week**, **Month**

Buttons: Day/Week/Month toggle, Prev/Today/Next, New Booking (→ /bookings/new), MUA Page (→ /mua tab baru)

### Day View
- Timeline vertikal (open_time - close_time)
- Booking cards di posisi jam: jam, durasi, customer, paket, status badge
- Click → popup: customer, status, tanggal, jam, durasi, paket, orang, photo for, background, addons, BTS + button update status (Next/Back) + Tutup + Lihat Detail Lengkap (→ /bookings/[id])

### Week View
- Grid Senin-Minggu, cards per hari (jam, durasi, customer, paket)

### Month View
- Grid bulanan, card ringkas (jam, durasi, customer)

Mobile: swipeable, cards stacked

## MUA Page (`/mua`) — PUBLIC, no auth

- Hanya booking yang punya addon nama mengandung "MUA" (case insensitive)
- Day view saja, Prev/Today/Next
- Card: Nama customer, Booking ID, Paket, Jam MUA mulai & jam sesi, Status
- VIEW ONLY — tidak ada aksi
