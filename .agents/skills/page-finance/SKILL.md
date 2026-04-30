---
name: page-finance
description: Finance page with income/expense tracking, summary dashboard, popular packages chart, and Excel export. Use when building finance or reporting features.
---

# Finance — Use Case Detail

Route: `/finance`

## Filter: dropdown bulan & tahun (default bulan ini)

## Summary (4 cards)
- Income — total bookings status >= PAID bulan ini
- Expense — total expenses bulan ini
- Gross Profit — Income - Expense
- Income from Bookings

## Income from Bookings
- Tabel: Booking ID, Customer, Date, Package, Status, Amount

## Expenses
- Tabel: Date, Description, Category, Vendor, Amount, Actions (Edit, Delete)
- "Add New Expense" → modal: Date, Description, Amount (Rp), Category (free text), Vendor (optional dropdown active vendors), Notes. Save & Cancel
- Note: Commission expenses otomatis masuk dari Commissions page (source='commission')

## Top 5 Most Popular Packages
- Ranking jumlah booking bulan ini: nama, count, revenue. Chart atau cards.

## Export → Excel (income + expenses + summary)
## Activity logging
