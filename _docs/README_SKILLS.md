# Panduan Penggunaan Skills — Yoonjaespace

## Struktur Folder

```
yoonjaespace-studio/          ← root project Next.js
├── CLAUDE.md                  ← Project memory (auto-loaded setiap sesi)
├── .claude/
│   └── skills/
│       ├── project-context/   ← ⭐ Database schema + business logic (CORE)
│       │   └── SKILL.md
│       ├── supabase-patterns/ ← Connection patterns + code examples
│       │   └── SKILL.md
│       ├── page-auth/         ← Login + auth flow
│       │   └── SKILL.md
│       ├── page-settings/     ← Settings (10 tabs)
│       │   └── SKILL.md
│       ├── page-role-user-management/
│       │   └── SKILL.md
│       ├── page-bookings/     ← ⭐ Core feature (list + create + detail)
│       │   └── SKILL.md
│       ├── page-customer-invoice/  ← Public pages
│       │   └── SKILL.md
│       ├── page-calendar/     ← Calendar + MUA
│       │   └── SKILL.md
│       ├── page-customers/
│       │   └── SKILL.md
│       ├── page-reminders/
│       │   └── SKILL.md
│       ├── page-finance/
│       │   └── SKILL.md
│       ├── page-vendors/
│       │   └── SKILL.md
│       ├── page-commissions/
│       │   └── SKILL.md
│       ├── page-activities/
│       │   └── SKILL.md
│       └── page-dashboard/
│           └── SKILL.md
```

## Bagaimana Ini Bekerja

### CLAUDE.md (Auto-loaded)
- Di-load OTOMATIS setiap kali Claude Code mulai sesi
- Berisi ringkasan project: tech stack, folder structure, code style
- Merujuk ke skills untuk detail lebih lanjut

### Skills (On-demand)
- Claude Code otomatis membaca skill yang RELEVAN berdasarkan `description` di frontmatter
- Kamu juga bisa minta manual: "Baca skill page-bookings dulu sebelum mulai"
- `project-context` dan `supabase-patterns` adalah skill INTI — Claude akan membaca ini saat butuh info schema/koneksi

### Progressive Disclosure
- Claude TIDAK load semua skill sekaligus (hemat context window)
- Hanya load skill yang cocok dengan task yang sedang dikerjakan
- Ini jauh lebih efisien daripada paste semua docs sekaligus

## Cara Pakai

### Setup Awal
1. Buat project: `npx create-next-app@latest yoonjaespace-studio ...`
2. Copy `CLAUDE.md` ke root project
3. Copy folder `.claude/` ke root project
4. Jalankan SQL schema di Supabase (file `001_yoonjaespace_schema.sql` terpisah)
5. Seed owner account di Supabase (lihat STEP 0 di bawah)

### Development (di Claude Code)
Cukup bilang ke Claude apa yang mau dikerjakan. Contoh:

```
> Buatkan halaman Settings dengan semua 10 tab sesuai skill page-settings
```

Claude Code akan:
1. Baca CLAUDE.md (otomatis)
2. Deteksi skill `page-settings` relevan → baca SKILL.md-nya
3. Juga baca `project-context` untuk schema → dan `supabase-patterns` untuk connection code
4. Mulai implement

### Jika Claude Tidak Otomatis Baca Skill
Tambahkan instruksi eksplisit:
```
> Sebelum mulai, baca skill project-context dan page-bookings
```

## Urutan Development

| Step | Perintah ke Claude Code | Skill yang aktif |
|------|------------------------|------------------|
| 0 | (Manual: setup DB + seed) | - |
| 1 | "Setup project Next.js, Supabase client, layout + sidebar" | supabase-patterns |
| 2 | "Buat login page dan auth flow" | page-auth |
| 3 | "Buat halaman Settings lengkap 10 tab" | page-settings |
| 4 | "Buat Role Management dan User Management" | page-role-user-management |
| 5 | "Buat modul Bookings (list + create + detail)" | page-bookings |
| 6 | "Buat Customer Page dan Invoice (public)" | page-customer-invoice |
| 7 | "Buat Calendar dan MUA Page" | page-calendar |
| 8 | "Buat Customers page" | page-customers |
| 9 | "Buat Reminders page" | page-reminders |
| 10 | "Buat Finance page" | page-finance |
| 11 | "Buat Vendors page" | page-vendors |
| 12 | "Buat Commissions page" | page-commissions |
| 13 | "Buat Activities page" | page-activities |
| 14 | "Buat Dashboard page" | page-dashboard |

## Keuntungan vs Paste Semua Sekaligus

| Pendekatan Lama | Skills |
|-----------------|--------|
| Paste 1 dokumen besar setiap sesi | Auto-loaded, on-demand |
| Memakan banyak context window | Hanya load yang relevan |
| Harus manual tentukan tabel | AI tentukan sendiri dari schema |
| Rawan outdated jika update | Edit 1 file skill, langsung berlaku |
| Tidak bisa share ke tim | Copy folder .claude/, done |
