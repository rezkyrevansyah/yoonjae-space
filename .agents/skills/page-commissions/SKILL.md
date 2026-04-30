---
name: page-commissions
description: Commissions page for staff commission tracking with period-based calculation (26th-25th) and auto-expense creation. Use when building commission features.
---

# Commissions — Use Case Detail

Route: `/commissions`

## Filter: bulan & tahun
## Summary (2 cards): Total Sudah Dibayar, Total Belum

## Card per Staff (active users)
- Nama & email
- Booking count periode (26th → 25th next month)
- Input nominal komisi
- Booking History: Booking ID (clickable), Customer, Date, Package, Total
- Checkbox "Sudah Dibayarkan" + Save

## Save "Sudah Dibayarkan":
1. Insert/update commissions (status='paid')
2. Auto-create expense: "Komisi [nama] - [periode]", category "Commission", source='commission', source_id=commission.id
3. Muncul otomatis di Finance page

## Activity logging
