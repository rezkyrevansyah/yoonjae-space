-- ============================================================
-- Yoonjaespace Studio Management - Bootstrap Initial Data
-- ============================================================
-- Cara pakai:
-- 1. Jalankan dulu seluruh isi:
--    supabase/migrations/setup_yoonjae_database.sql
--
-- 2. Buka Supabase Dashboard > Authentication > Users.
--    Buat user Auth pertama, contoh:
--    email: demo@yoonjae.com
--    password: isi dari Dashboard Supabase, jangan ditulis di file SQL.
--
-- 3. Pastikan email Auth user sama dengan nilai bootstrap_owner_email
--    di bagian konfigurasi script ini.
--
-- 4. Copy seluruh isi file ini ke Supabase SQL Editor, lalu Run.
--
-- 5. Setelah success, login ke aplikasi memakai email/password Auth tadi.
--
-- Script ini membuat/memperbarui:
-- - Role Owner dengan akses penuh ke semua menu dan semua permission status booking.
-- - Role Administrator dengan akses penuh operasional.
-- - Role Staff dengan akses operasional harian.
-- - Profile public.users untuk Auth user owner.
--
-- Catatan penting:
-- - Script ini tidak membuat password dan tidak membuat Supabase Auth user.
--   Auth user harus dibuat dari menu Authentication.
-- - Owner di aplikasi ditandai dengan is_primary = true.
--   User primary dapat melewati guard menu walaupun menu_access berubah.
-- - Script ini idempotent: aman dijalankan ulang untuk memperbarui role/user.
-- ============================================================

begin;

do $$
declare
  -- Ubah bagian ini jika email/nama/telepon owner berbeda.
  bootstrap_owner_email text := 'demo@yoonjae.com';
  bootstrap_owner_name text := 'Demo Owner';
  bootstrap_owner_phone text := '';

  full_menu_access jsonb := '[
    "dashboard",
    "bookings",
    "calendar",
    "photo-delivery",
    "customers",
    "reminders",
    "finance",
    "vendors",
    "commissions",
    "activities",
    "user-management",
    "role-management",
    "settings",
    "booking_full_access",
    "sc:BOOKED:PAID",
    "sc:PAID:SHOOT_DONE",
    "sc:SHOOT_DONE:PHOTOS_DELIVERED",
    "sc:PHOTOS_DELIVERED:CLOSED",
    "sc:PAID:BOOKED",
    "sc:SHOOT_DONE:PAID",
    "sc:PHOTOS_DELIVERED:SHOOT_DONE",
    "sc:CLOSED:PHOTOS_DELIVERED",
    "sc:cancel"
  ]'::jsonb;

  staff_menu_access jsonb := '[
    "dashboard",
    "bookings",
    "calendar",
    "photo-delivery",
    "customers",
    "reminders",
    "activities",
    "sc:BOOKED:PAID",
    "sc:PAID:SHOOT_DONE",
    "sc:SHOOT_DONE:PHOTOS_DELIVERED"
  ]'::jsonb;

  owner_auth_id uuid;
  owner_role_id uuid;
  owner_user_id uuid;
begin
  select au.id
  into owner_auth_id
  from auth.users au
  where lower(au.email) = lower(bootstrap_owner_email)
  order by au.created_at desc
  limit 1;

  if owner_auth_id is null then
    raise exception
      'Auth user "%" belum ditemukan. Buat dulu di Supabase Authentication > Users, lalu jalankan ulang script ini.',
      bootstrap_owner_email;
  end if;

  insert into public.roles (name, description, menu_access, is_system)
  values
    (
      'Owner',
      'Owner akun utama dengan akses penuh ke semua menu dan permission.',
      full_menu_access,
      true
    ),
    (
      'Administrator',
      'Akses penuh untuk semua menu dan permission operasional.',
      full_menu_access,
      true
    ),
    (
      'Staff',
      'Akses operasional harian tanpa pengaturan role dan user.',
      staff_menu_access,
      true
    )
  on conflict (name) do update
  set
    description = excluded.description,
    menu_access = excluded.menu_access,
    is_system = excluded.is_system,
    updated_at = now();

  select r.id
  into owner_role_id
  from public.roles r
  where r.name = 'Owner';

  insert into public.users (
    auth_id,
    name,
    email,
    phone,
    role_id,
    is_active,
    is_primary
  )
  values (
    owner_auth_id,
    bootstrap_owner_name,
    bootstrap_owner_email,
    bootstrap_owner_phone,
    owner_role_id,
    true,
    true
  )
  on conflict (email) do update
  set
    auth_id = excluded.auth_id,
    name = excluded.name,
    phone = excluded.phone,
    role_id = excluded.role_id,
    is_active = true,
    is_primary = true,
    updated_at = now()
  returning id into owner_user_id;

  raise notice
    'Bootstrap selesai. Owner user: %, public.users.id: %, auth.users.id: %',
    bootstrap_owner_email,
    owner_user_id,
    owner_auth_id;
end;
$$;

commit;

-- ============================================================
-- Optional check setelah script success
-- ============================================================
-- Jika email owner diganti, ganti juga email pada query check ini.
--
-- select
--   u.name,
--   u.email,
--   u.is_active,
--   u.is_primary,
--   r.name as role_name,
--   r.menu_access
-- from public.users u
-- join public.roles r on r.id = u.role_id
-- where lower(u.email) = lower('demo@yoonjae.com');
