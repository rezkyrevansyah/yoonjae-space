---
name: page-reminders
description: Reminders page with Today/This Week/This Month tabs showing upcoming bookings with WhatsApp reminder actions. Use when building reminder features.
---

# Reminders — Use Case Detail

Route: `/reminders`

3 tabs: **Today**, **This Week**, **This Month** — upcoming bookings

Tabel: Nama & phone, Tanggal & jam sesi, Paket, Status (badge), Hours Left (readable "2 jam lagi"), Reminded status

**3 action buttons per row** — buka wa.me/{phone}?text={encoded}:
1. Reminder → template reminder_message
2. Thank You for Payment → template thank_you_payment_message
3. Say Thank You → template thank_you_message

Variable replacement: {customer_name}, {booking_date}, {booking_time}, {package_name}, {studio_name}

Button "Tandai Sudah Di-remind" → insert booking_reminders, tampilkan indicator
