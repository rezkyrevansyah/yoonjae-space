---
name: page-role-user-management
description: Role Management and User Management pages. CRUD roles with menu access permissions and CRUD users with Supabase Auth integration. Use when building role or user management features.
---

# Role & User Management — Use Case Detail

## Role Management (`/role-management`)
- Tampilan CARD (bukan tabel)
- Card: nama, deskripsi, jumlah menu akses
- Owner role → "System Role" label, TIDAK bisa dihapus (is_system=true)
- Add Role → modal: Nama, Deskripsi, Hak Akses Menu (checkbox 12 menu sidebar), Create & Cancel
- menu_access = jsonb array of slugs: ["dashboard","bookings","calendar","customers","reminders","finance","vendors","commissions","activities","user-management","role-management","settings"]
- Delete role: tidak bisa jika ada user yang pakai role ini

## User Management (`/user-management`)
- Tabel: Nama, Email, Role, Status (Active/Inactive badge), Created At, Actions
- Owner pertama (is_primary=true) → TIDAK bisa dihapus
- Add User → form: Nama, Email, Phone, Password + Konfirmasi, Role (dropdown), Active/Inactive

## PENTING: Create & Delete User via Server Action / API Route
1. Create: `supabase.auth.admin.createUser()` → insert tabel users dengan auth_id
2. Delete: hapus tabel users DAN `supabase.auth.admin.deleteUser()`
3. JANGAN expose service_role key ke client — gunakan admin.ts di server saja

## Activity logging setiap operasi
