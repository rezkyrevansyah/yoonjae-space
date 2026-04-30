-- ============================================================
-- Yoonjaespace Studio Management - Supabase Setup Script
-- ============================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard.
-- 2. Masuk ke SQL Editor.
-- 3. Copy seluruh isi file ini.
-- 4. Run di project Supabase yang masih fresh atau belum memiliki tabel app ini.
--
-- Script ini membuat:
-- - Enum aplikasi
-- - Semua tabel public yang dibutuhkan project
-- - Foreign key, check constraint, unique constraint
-- - Index penting untuk performa
-- - Function RPC generate_booking_number dan generate_invoice_number
-- - Singleton settings default
-- - Role default
-- - Bucket storage images-yoonjae dan policy upload/read
--
-- Catatan:
-- - Script ini tidak membuat user Auth. Buat user pertama dari Supabase Auth,
--   lalu hubungkan ke tabel public.users sebagai primary/admin.
-- - RLS tabel public tidak diaktifkan di script ini agar cocok dengan pola akses
--   project saat ini. Proteksi menu/role dilakukan di aplikasi.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- Enums
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum (
      'BOOKED',
      'DP_PAID',
      'PAID',
      'SHOOT_DONE',
      'PHOTOS_DELIVERED',
      'ADDON_UNPAID',
      'CLOSED',
      'CANCELED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'print_order_status') then
    create type public.print_order_status as enum (
      'SELECTION',
      'VENDOR',
      'PRINTING',
      'RECEIVE',
      'PACKING',
      'SHIPPED',
      'DONE'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('percentage', 'fixed');
  end if;

  if not exists (select 1 from pg_type where typname = 'custom_field_type') then
    create type public.custom_field_type as enum ('text', 'select', 'checkbox', 'number', 'url');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type public.commission_status as enum ('unpaid', 'paid');
  end if;
end $$;

-- ============================================================
-- Helper trigger
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Master tables and settings
-- ============================================================

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  menu_access jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text not null default '',
  role_id uuid not null references public.roles(id),
  is_active boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings_general (
  lock boolean primary key default true check (lock = true),
  open_time text not null default '09:00',
  close_time text not null default '21:00',
  default_payment_status text not null default 'unpaid' check (default_payment_status in ('paid', 'unpaid')),
  time_slot_interval integer not null default 15,
  commission_cutoff_day integer not null default 26 check (commission_cutoff_day between 1 and 28),
  commission_default_bonus bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings_reminder_templates (
  lock boolean primary key default true check (lock = true),
  reminder_message text not null default '',
  thank_you_message text not null default '',
  thank_you_payment_message text not null default '',
  custom_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings_studio_info (
  lock boolean primary key default true check (lock = true),
  studio_name text not null default '',
  address text not null default '',
  google_maps_url text not null default '',
  whatsapp_number text not null default '',
  email text not null default '',
  instagram text not null default '',
  logo_url text not null default '',
  front_photo_url text not null default '',
  footer_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_holidays (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.photo_for (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.domiciles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.package_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.addon_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price bigint not null default 0,
  duration_minutes integer not null default 60,
  include_all_photos boolean not null default false,
  include_print boolean not null default false,
  need_extra_time boolean not null default false,
  extra_time_minutes integer not null default 0,
  extra_time_position text not null default 'after' check (extra_time_position in ('before', 'after')),
  category text not null default '',
  sort_order integer not null default 0,
  commission_bonus bigint not null default 0,
  is_active boolean not null default true,
  is_mua boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price >= 0),
  check (duration_minutes > 0),
  check (extra_time_minutes >= 0),
  check (commission_bonus >= 0)
);

create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price bigint not null default 0,
  category text not null default '',
  sort_order integer not null default 0,
  need_extra_time boolean not null default false,
  extra_time_minutes integer not null default 0,
  extra_time_position text not null default 'after' check (extra_time_position in ('before', 'after')),
  is_active boolean not null default true,
  is_mua boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price >= 0),
  check (extra_time_minutes >= 0)
);

create table if not exists public.backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  field_type public.custom_field_type not null default 'text',
  options jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.discount_type not null default 'percentage',
  discount_value bigint not null default 0,
  valid_from date default current_date,
  valid_until date default current_date,
  minimum_purchase bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_value >= 0),
  check (minimum_purchase >= 0),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text not null default '',
  instagram text not null default '',
  address text not null default '',
  domicile text not null default '',
  lead_id uuid references public.leads(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Core booking tables
-- ============================================================

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid(),
  booking_number text not null unique,
  customer_id uuid not null references public.customers(id),
  booking_date date not null,
  start_time text not null,
  end_time text not null,
  package_id uuid not null references public.packages(id),
  photo_for_id uuid references public.photo_for(id) on delete set null,
  person_count integer not null default 1,
  notes text not null default '',
  behind_the_scenes boolean not null default false,
  status public.booking_status not null default 'BOOKED',
  print_order_status public.print_order_status,
  google_drive_link text not null default '',
  voucher_id uuid references public.vouchers(id) on delete set null,
  manual_discount bigint not null default 0,
  subtotal bigint not null default 0,
  total bigint not null default 0,
  dp_amount bigint,
  dp_paid_at timestamptz,
  transaction_date date,
  payment_method text not null default 'transfer' check (payment_method in ('transfer', 'tunai', 'qris', 'other')),
  payment_account_name text not null default '',
  staff_id uuid references public.users(id),
  created_by uuid references public.users(id),
  is_rescheduled boolean not null default false,
  commission_amount bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_token),
  check (person_count > 0),
  check (manual_discount >= 0),
  check (subtotal >= 0),
  check (total >= 0),
  check (dp_amount is null or dp_amount >= 0),
  check (commission_amount >= 0)
);

create table if not exists public.booking_packages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  quantity integer not null default 1,
  price_snapshot bigint not null,
  created_at timestamptz not null default now(),
  check (quantity > 0),
  check (price_snapshot >= 0)
);

create table if not exists public.booking_backgrounds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  background_id uuid not null references public.backgrounds(id),
  unique (booking_id, background_id)
);

create table if not exists public.booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  addon_id uuid not null references public.addons(id),
  price bigint not null default 0,
  quantity integer not null default 1,
  is_paid boolean not null default false,
  is_extra boolean not null default false,
  created_at timestamptz not null default now(),
  check (price >= 0),
  check (quantity > 0)
);

create table if not exists public.booking_custom_fields (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  custom_field_id uuid not null references public.custom_fields(id),
  value text not null default '',
  unique (booking_id, custom_field_id)
);

create table if not exists public.booking_status_dates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status_type text not null,
  status_date date not null,
  created_at timestamptz not null default now(),
  unique (booking_id, status_type)
);

create table if not exists public.booking_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null check (type in ('reminder', 'thank_you', 'thank_you_payment', 'custom')),
  sent_at timestamptz not null default now(),
  sent_by uuid references public.users(id) on delete set null
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  invoice_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Finance, commissions, audit
-- ============================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null default '',
  amount bigint not null default 0,
  category text not null default '',
  vendor_id uuid references public.vendors(id) on delete set null,
  notes text not null default '',
  source text not null default 'manual' check (source in ('manual', 'commission')),
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount >= 0)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.users(id),
  period_start date not null,
  period_end date not null,
  booking_count integer not null default 0,
  total_amount bigint not null default 0,
  status public.commission_status not null default 'unpaid',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (booking_count >= 0),
  check (total_amount >= 0)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  user_name text not null default '',
  user_role text not null default '',
  action text not null,
  entity text not null,
  entity_id text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Triggers
-- ============================================================

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_settings_general_updated_at on public.settings_general;
create trigger set_settings_general_updated_at
before update on public.settings_general
for each row execute function public.set_updated_at();

drop trigger if exists set_settings_reminder_templates_updated_at on public.settings_reminder_templates;
create trigger set_settings_reminder_templates_updated_at
before update on public.settings_reminder_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_settings_studio_info_updated_at on public.settings_studio_info;
create trigger set_settings_studio_info_updated_at
before update on public.settings_studio_info
for each row execute function public.set_updated_at();

drop trigger if exists set_packages_updated_at on public.packages;
create trigger set_packages_updated_at
before update on public.packages
for each row execute function public.set_updated_at();

drop trigger if exists set_addons_updated_at on public.addons;
create trigger set_addons_updated_at
before update on public.addons
for each row execute function public.set_updated_at();

drop trigger if exists set_backgrounds_updated_at on public.backgrounds;
create trigger set_backgrounds_updated_at
before update on public.backgrounds
for each row execute function public.set_updated_at();

drop trigger if exists set_custom_fields_updated_at on public.custom_fields;
create trigger set_custom_fields_updated_at
before update on public.custom_fields
for each row execute function public.set_updated_at();

drop trigger if exists set_vouchers_updated_at on public.vouchers;
create trigger set_vouchers_updated_at
before update on public.vouchers
for each row execute function public.set_updated_at();

drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_commissions_updated_at on public.commissions;
create trigger set_commissions_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

-- ============================================================
-- RPC functions used by the app
-- ============================================================

create or replace function public.generate_booking_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next integer;
begin
  v_prefix := 'YJ-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-';

  perform pg_advisory_xact_lock(hashtext('yoonjae_generate_booking_number'));

  select coalesce(max(substring(booking_number from length(v_prefix) + 1)::integer), 0) + 1
  into v_next
  from public.bookings
  where booking_number like v_prefix || '%'
    and substring(booking_number from length(v_prefix) + 1) ~ '^[0-9]+$';

  return v_prefix || lpad(v_next::text, 3, '0');
end;
$$;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next integer;
begin
  v_prefix := 'INV-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-';

  perform pg_advisory_xact_lock(hashtext('yoonjae_generate_invoice_number'));

  select coalesce(max(substring(invoice_number from length(v_prefix) + 1)::integer), 0) + 1
  into v_next
  from public.invoices
  where invoice_number like v_prefix || '%'
    and substring(invoice_number from length(v_prefix) + 1) ~ '^[0-9]+$';

  return v_prefix || lpad(v_next::text, 3, '0');
end;
$$;

-- ============================================================
-- Indexes
-- ============================================================

create unique index if not exists bookings_public_token_idx on public.bookings(public_token);
create index if not exists bookings_booking_date_idx on public.bookings(booking_date);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_print_order_status_idx on public.bookings(print_order_status);
create index if not exists bookings_customer_id_idx on public.bookings(customer_id);
create index if not exists bookings_staff_id_idx on public.bookings(staff_id);
create index if not exists bookings_created_at_idx on public.bookings(created_at);
create index if not exists bookings_active_date_idx on public.bookings(booking_date, start_time) where status <> 'CANCELED';

create index if not exists booking_packages_booking_id_idx on public.booking_packages(booking_id);
create index if not exists booking_packages_package_id_idx on public.booking_packages(package_id);
create index if not exists booking_addons_booking_id_idx on public.booking_addons(booking_id);
create index if not exists booking_addons_addon_id_idx on public.booking_addons(addon_id);
create index if not exists booking_backgrounds_booking_id_idx on public.booking_backgrounds(booking_id);
create index if not exists booking_custom_fields_booking_id_idx on public.booking_custom_fields(booking_id);
create index if not exists booking_reminders_booking_id_idx on public.booking_reminders(booking_id);
create index if not exists booking_status_dates_booking_id_idx on public.booking_status_dates(booking_id);

create index if not exists customers_lead_id_idx on public.customers(lead_id);
create index if not exists customers_name_idx on public.customers(name);
create index if not exists users_auth_id_idx on public.users(auth_id);
create index if not exists users_role_id_idx on public.users(role_id);
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists expenses_vendor_id_idx on public.expenses(vendor_id);
create index if not exists expenses_source_idx on public.expenses(source, source_id);
create index if not exists commissions_staff_period_idx on public.commissions(staff_id, period_start, period_end);
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log(entity);

create index if not exists package_categories_sort_order_idx on public.package_categories(sort_order);
create index if not exists addon_categories_sort_order_idx on public.addon_categories(sort_order);
create index if not exists packages_sort_order_idx on public.packages(sort_order);
create index if not exists addons_sort_order_idx on public.addons(sort_order);
create index if not exists packages_is_mua_idx on public.packages(id) where is_mua = true;
create index if not exists addons_is_mua_idx on public.addons(id) where is_mua = true;

-- ============================================================
-- Default singleton data
-- ============================================================

insert into public.settings_general(lock)
values (true)
on conflict (lock) do nothing;

insert into public.settings_reminder_templates(lock)
values (true)
on conflict (lock) do nothing;

insert into public.settings_studio_info(lock)
values (true)
on conflict (lock) do nothing;

insert into public.roles(name, description, menu_access, is_system)
values
(
  'Administrator',
  'Akses penuh untuk semua menu dan permission operasional.',
  '[
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
  ]'::jsonb,
  true
),
(
  'Staff',
  'Akses operasional harian tanpa pengaturan role dan user.',
  '[
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
  ]'::jsonb,
  true
)
on conflict (name) do nothing;

-- ============================================================
-- Storage bucket for studio images
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images-yoonjae',
  'images-yoonjae',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images_yoonjae_public_read" on storage.objects;
create policy "images_yoonjae_public_read"
on storage.objects
for select
using (bucket_id = 'images-yoonjae');

drop policy if exists "images_yoonjae_authenticated_insert" on storage.objects;
create policy "images_yoonjae_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'images-yoonjae');

drop policy if exists "images_yoonjae_authenticated_update" on storage.objects;
create policy "images_yoonjae_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'images-yoonjae')
with check (bucket_id = 'images-yoonjae');

drop policy if exists "images_yoonjae_authenticated_delete" on storage.objects;
create policy "images_yoonjae_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'images-yoonjae');

-- ============================================================
-- Grants for Supabase API roles
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant all privileges on all tables in schema public to authenticated, service_role;
grant all privileges on all routines in schema public to authenticated, service_role;
grant execute on function public.generate_booking_number() to authenticated, service_role;
grant execute on function public.generate_invoice_number() to authenticated, service_role;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all privileges on tables to authenticated, service_role;
alter default privileges in schema public grant all privileges on routines to authenticated, service_role;

commit;

-- ============================================================
-- Optional bootstrap primary user
-- ============================================================
-- Setelah membuat Auth user pertama di Supabase Authentication,
-- jalankan query manual berikut dengan mengganti value email/name/phone:
--
-- insert into public.users (auth_id, name, email, phone, role_id, is_active, is_primary)
-- select
--   au.id,
--   'Admin Yoonjae',
--   au.email,
--   '',
--   r.id,
--   true,
--   true
-- from auth.users au
-- cross join public.roles r
-- where au.email = 'admin@example.com'
--   and r.name = 'Administrator'
-- on conflict (email) do update
-- set
--   auth_id = excluded.auth_id,
--   role_id = excluded.role_id,
--   is_active = true,
--   is_primary = true;
