---
name: page-customer-invoice
description: Public Customer Page and Invoice Page (no auth required). Customer-facing pages that must be beautiful and mobile-optimized. Use when building customer or invoice pages.
---

# Customer Page & Invoice — Use Case Detail

Both are PUBLIC — no auth required. Fetched with anon key.

## Customer Page (`/customer/[bookingId]`)

Dikirim ke customer via WhatsApp. Harus SANGAT ESTETIK dan mobile-optimized.

- Logo + nama studio (dari settings_studio_info)
- "Hai, [nama customer]!" + Booking ID
- **Status Timeline** — booking status + print order (stepper visual)
  - Default 2 status terakhir, expandable
- Button **"View Your Photos"** — HANYA jika status >= PHOTOS_DELIVERED, buka google_drive_link
- Invoice section — ringkas + button download (→ /invoice/[bookingId])
- Booking Details — tanggal, waktu, paket, nama, print status
- Studio Info — nama, foto depan, alamat, jam buka, buttons: Instagram, WhatsApp, Google Maps
- Footer text + terima kasih
- Button **"Book Again"** → wa.me/{whatsapp_number}
- Framer Motion animations

## Invoice Page (`/invoice/[bookingId]`)

**Buttons**: Back to Booking (hanya jika authenticated), Copy Link, Share WA, Download/Print

**Layout (professional)**:
- Header: logo, nama studio, alamat, telepon
- Invoice info: number, date, booking date, booking ref, status badge
- Bill To: nama, telepon, email
- Rincian: paket + addons (label "Belum Lunas" jika unpaid) + diskon = total
- Footer: "Yoonjaespace Studio" (teks, tanpa gambar)
- @media print: hide buttons, A4, proper margins
