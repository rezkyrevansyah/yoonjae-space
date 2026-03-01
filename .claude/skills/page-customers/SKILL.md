---
name: page-customers
description: Customers list page with aggregated booking data, export, and customer detail with booking history. Use when building customer management features.
---

# Customers Page — Use Case Detail

## List (`/customers`)
- Tabel: Nama, Phone, Email, Total Bookings (COUNT), Total Spend (SUM Rp), Last Visit (MAX date), Actions (Detail, Edit, Delete)
- Search, Pagination
- Button "Add Client" → modal: nama, WhatsApp (⚠️ UNIQUE validation), email, Instagram, alamat, domisili, leads (dropdown), notes
- Button "Export" → CSV atau Excel
- Mobile: cards

## Detail (`/customers/[id]`)
- Info: nama, Client ID, phone, email, Instagram, alamat, leads, notes
- Stats: Total Bookings, Total Spend, Last Visit
- Booking History: Booking ID (clickable → /bookings/[id]), Date, Package, Status, Total
- Edit & Delete buttons
- Activity logging
