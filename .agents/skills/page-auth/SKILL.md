---
name: page-auth
description: Login page and authentication flow including user context provider and role-based menu filtering. Use when building login, logout, auth protection, or user session management.
---

# Auth / Login — Use Case Detail

## Login Page (`/login`)
- Full-screen centered, logo/branding Yoonjaespace
- Form: email + password, Button Login + loading state
- Error handling (salah password dll)
- Redirect ke /dashboard setelah berhasil
- Design: light theme, aksen merah maroon, mobile responsive

## Auth Flow
1. User buka app → middleware → redirect /login
2. Input credentials → Supabase Auth signInWithPassword
3. Berhasil → fetch profile dari tabel users JOIN roles (match auth_id)
4. Simpan di context → redirect /dashboard
5. Sidebar tampilkan menu sesuai role.menu_access

## User Context/Provider
- Fetch: nama, email, role name, menu_access (jsonb array)
- Simpan di React context, tidak re-fetch setiap navigasi
- Dipakai sidebar (nama, role, menu filter) dan semua halaman (current user info)

## Sidebar Integration
- Nama user + role di sidebar
- Menu di-filter: hanya tampilkan menu yang ada di role.menu_access
- Logout: clear session → redirect /login

## Test Account
- Email: yoonjae@gmail.com, Password: admin123, Role: Owner (full access)
