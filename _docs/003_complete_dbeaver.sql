-- ============================================================
-- Yoonjaespace Studio Management — Complete Database Schema
-- Versi: 003 (DBeaver-ready, merged dari 001 + 002 + fix)
--
-- CARA PENGGUNAAN DI DBEAVER:
--   1. Connect ke database PostgreSQL / Supabase
--   2. Buka SQL Editor (Ctrl+])
--   3. Paste seluruh isi file ini
--   4. Klik Execute Script (Alt+X) atau tombol Run
--
-- CATATAN:
--   - Section RLS Policies hanya berlaku di Supabase
--   - Jika dijalankan di PostgreSQL biasa, bagian RLS akan
--     dieksekusi tanpa error tapi tidak ada efeknya
--   - Script ini IDEMPOTENT: aman dijalankan berkali-kali
--     (menggunakan IF NOT EXISTS di semua tempat yang bisa)
-- ============================================================

-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'BOOKED',
    'PAID',
    'SHOOT_DONE',
    'PHOTOS_DELIVERED',
    'ADDON_UNPAID',
    'CLOSED',
    'CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE print_order_status AS ENUM (
    'SELECTION',
    'VENDOR',
    'PRINTING',
    'RECEIVE',
    'PACKING',
    'SHIPPED',
    'DONE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE custom_field_type AS ENUM ('text', 'select', 'checkbox', 'number', 'url');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commission_status AS ENUM ('unpaid', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: SETTINGS / CONFIGURATION TABLES
-- ============================================================

-- ── General Settings (singleton — 1 row) ──────────────────
CREATE TABLE IF NOT EXISTS settings_general (
  lock                   boolean PRIMARY KEY DEFAULT true,
  open_time              text NOT NULL DEFAULT '09:00',
  close_time             text NOT NULL DEFAULT '21:00',
  default_payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (default_payment_status IN ('paid', 'unpaid')),
  time_slot_interval     integer NOT NULL DEFAULT 15,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_general_single_row CHECK (lock = true)
);
INSERT INTO settings_general DEFAULT VALUES ON CONFLICT (lock) DO NOTHING;

-- ── Studio Holidays ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS studio_holidays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  label       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Studio Info (singleton) ────────────────────────────────
CREATE TABLE IF NOT EXISTS settings_studio_info (
  lock              boolean PRIMARY KEY DEFAULT true,
  studio_name       text NOT NULL DEFAULT '',
  address           text NOT NULL DEFAULT '',
  google_maps_url   text NOT NULL DEFAULT '',
  whatsapp_number   text NOT NULL DEFAULT '',
  email             text NOT NULL DEFAULT '',
  instagram         text NOT NULL DEFAULT '',
  logo_url          text NOT NULL DEFAULT '',
  front_photo_url   text NOT NULL DEFAULT '',
  footer_text       text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_studio_info_single_row CHECK (lock = true)
);
INSERT INTO settings_studio_info DEFAULT VALUES ON CONFLICT (lock) DO NOTHING;

-- ── Reminder Message Templates (singleton) ─────────────────
CREATE TABLE IF NOT EXISTS settings_reminder_templates (
  lock                      boolean PRIMARY KEY DEFAULT true,
  reminder_message          text NOT NULL DEFAULT '',
  thank_you_message         text NOT NULL DEFAULT '',
  thank_you_payment_message text NOT NULL DEFAULT '',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_reminder_templates_single_row CHECK (lock = true)
);
INSERT INTO settings_reminder_templates DEFAULT VALUES ON CONFLICT (lock) DO NOTHING;

-- ── Packages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  description        text NOT NULL DEFAULT '',
  price              bigint NOT NULL DEFAULT 0,
  duration_minutes   integer NOT NULL DEFAULT 60,
  include_all_photos boolean NOT NULL DEFAULT false,
  need_extra_time    boolean NOT NULL DEFAULT false,
  extra_time_minutes integer NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Backgrounds ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backgrounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  is_available boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Add-ons ────────────────────────────────────────────────
-- NOTE: extra_time_position ('before'|'after') menentukan
--       apakah waktu extra ditambahkan sebelum/sesudah sesi
CREATE TABLE IF NOT EXISTS addons (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  price                bigint NOT NULL DEFAULT 0,
  need_extra_time      boolean NOT NULL DEFAULT false,
  extra_time_minutes   integer NOT NULL DEFAULT 0,
  extra_time_position  text NOT NULL DEFAULT 'after'
    CHECK (extra_time_position IN ('before', 'after')),
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Vouchers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  discount_type    discount_type NOT NULL DEFAULT 'percentage',
  discount_value   bigint NOT NULL DEFAULT 0,
  valid_from       date NOT NULL DEFAULT CURRENT_DATE,
  valid_until      date NOT NULL DEFAULT CURRENT_DATE,
  minimum_purchase bigint NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Custom Fields ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  field_type  custom_field_type NOT NULL DEFAULT 'text',
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- untuk tipe 'select'
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Leads (sumber referral pelanggan) ─────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Photo For (tujuan foto) ────────────────────────────────
CREATE TABLE IF NOT EXISTS photo_for (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 3: ROLE & USER MANAGEMENT
-- ============================================================

-- ── Roles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  menu_access jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of menu slugs
  is_system   boolean NOT NULL DEFAULT false,       -- true = Owner role, undeletable
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Insert default Owner role
INSERT INTO roles (name, description, menu_access, is_system)
VALUES (
  'Owner',
  'Full access to all features',
  '["dashboard","bookings","calendar","customers","reminders","finance","vendors","commissions","activities","user-management","role-management","settings"]'::jsonb,
  true
) ON CONFLICT (name) DO NOTHING;

-- ── Users (app-level, linked to Supabase Auth) ─────────────
CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id    uuid UNIQUE,  -- references auth.users(id) di Supabase
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  phone      text NOT NULL DEFAULT '',
  role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active  boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,  -- true = first owner, undeletable
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 4: CORE BUSINESS TABLES
-- ============================================================

-- ── Customers ──────────────────────────────────────────────
-- PENTING: phone adalah unique identifier untuk pelanggan
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  phone      text NOT NULL UNIQUE,  -- unique identifier!
  email      text NOT NULL DEFAULT '',
  instagram  text NOT NULL DEFAULT '',
  address    text NOT NULL DEFAULT '',
  domicile   text NOT NULL DEFAULT '',
  lead_id    uuid REFERENCES leads(id) ON DELETE SET NULL,
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Vendors ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  category   text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  address    text NOT NULL DEFAULT '',
  notes      text NOT NULL DEFAULT '',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Bookings (tabel utama) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number     text NOT NULL UNIQUE,           -- format: YJS-YYYYMMDD-XXXX
  customer_id        uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  booking_date       date NOT NULL,
  start_time         text NOT NULL,                  -- e.g. '10:00'
  end_time           text NOT NULL,                  -- auto-calculated
  package_id         uuid NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  photo_for_id       uuid REFERENCES photo_for(id) ON DELETE SET NULL,
  person_count       integer NOT NULL DEFAULT 1,
  notes              text NOT NULL DEFAULT '',
  behind_the_scenes  boolean NOT NULL DEFAULT false,
  status             booking_status NOT NULL DEFAULT 'BOOKED',
  print_order_status print_order_status,             -- null jika tidak ada print order
  google_drive_link  text NOT NULL DEFAULT '',
  voucher_id         uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  manual_discount    bigint NOT NULL DEFAULT 0,
  subtotal           bigint NOT NULL DEFAULT 0,
  total              bigint NOT NULL DEFAULT 0,
  staff_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Booking ↔ Backgrounds (many-to-many) ──────────────────
CREATE TABLE IF NOT EXISTS booking_backgrounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  background_id uuid NOT NULL REFERENCES backgrounds(id) ON DELETE CASCADE,
  UNIQUE(booking_id, background_id)
);

-- ── Booking ↔ Add-ons ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_addons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id   uuid NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  price      bigint NOT NULL DEFAULT 0,   -- snapshot harga saat booking dibuat
  is_paid    boolean NOT NULL DEFAULT false,
  is_extra   boolean NOT NULL DEFAULT false,  -- true = ditambah setelah booking awal
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Booking Custom Field Values ───────────────────────────
CREATE TABLE IF NOT EXISTS booking_custom_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value           text NOT NULL DEFAULT '',
  UNIQUE(booking_id, custom_field_id)
);

-- ── Invoices ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,   -- format: INV-YYYYMMDD-XXXX
  booking_id     uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 5: FINANCE & COMMISSIONS
-- ============================================================

-- ── Expenses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  amount      bigint NOT NULL DEFAULT 0,
  category    text NOT NULL DEFAULT '',
  vendor_id   uuid REFERENCES vendors(id) ON DELETE SET NULL,
  notes       text NOT NULL DEFAULT '',
  source      text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'commission')),
  source_id   uuid,  -- referensi ke commissions.id jika source='commission'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Commissions ────────────────────────────────────────────
-- Period: 26th bulan ini → 25th bulan berikutnya
CREATE TABLE IF NOT EXISTS commissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start  date NOT NULL,  -- tanggal 26
  period_end    date NOT NULL,  -- tanggal 25 bulan berikutnya
  booking_count integer NOT NULL DEFAULT 0,
  total_amount  bigint NOT NULL DEFAULT 0,
  status        commission_status NOT NULL DEFAULT 'unpaid',
  paid_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, period_start)
);

-- ============================================================
-- SECTION 6: SUPPORT TABLES
-- ============================================================

-- ── Booking Reminders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('reminder', 'thank_you', 'thank_you_payment')),
  sent_at    timestamptz NOT NULL DEFAULT now(),
  sent_by    uuid REFERENCES users(id) ON DELETE SET NULL
);

-- ── Activity Log ───────────────────────────────────────────
-- Setiap operasi CRUD harus insert ke sini
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name   text NOT NULL DEFAULT '',
  user_role   text NOT NULL DEFAULT '',
  action      text NOT NULL,       -- e.g. 'create_booking', 'update_status'
  entity      text NOT NULL,       -- e.g. 'bookings', 'customers', 'settings_general'
  entity_id   text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 7: INDEXES (merged 001 + 002, deduplicated)
-- ============================================================

-- bookings: tabel paling banyak di-query
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date    ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status          ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status     ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id     ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id        ON bookings(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_created_at      ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_print_order_status
  ON bookings(print_order_status) WHERE print_order_status IS NOT NULL;

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_source    ON expenses(source, source_id) WHERE source_id IS NOT NULL;

-- commissions
CREATE INDEX IF NOT EXISTS idx_commissions_period   ON commissions(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commissions_staff_id ON commissions(staff_id);

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity     ON activity_log(entity);
CREATE INDEX IF NOT EXISTS idx_activity_log_action     ON activity_log(action);

-- booking relations
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking_id      ON booking_addons(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_backgrounds_booking_id ON booking_backgrounds(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_custom_fields_booking_id ON booking_custom_fields(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id   ON booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id            ON invoices(booking_id);

-- studio holidays
CREATE INDEX IF NOT EXISTS idx_studio_holidays_dates ON studio_holidays(start_date, end_date);

-- ============================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS)
-- CATATAN: Hanya berlaku di Supabase. Di PostgreSQL biasa
--          script ini tetap berjalan tanpa error.
-- ============================================================

-- Enable RLS
ALTER TABLE settings_general          ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_holidays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_studio_info      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_for                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_backgrounds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_custom_fields     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                  ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ (anon) — untuk Customer Page & Invoice (tidak butuh login)
CREATE POLICY "anon_read_bookings"           ON bookings           FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_customers"          ON customers          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_packages"           ON packages           FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_addons"             ON addons             FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_backgrounds"        ON backgrounds        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_booking_addons"     ON booking_addons     FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_booking_backgrounds" ON booking_backgrounds FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_studio_info"        ON settings_studio_info FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_invoices"           ON invoices           FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_settings_general"   ON settings_general   FOR SELECT TO anon USING (true);

-- AUTHENTICATED — full CRUD untuk semua tabel
CREATE POLICY "auth_all_settings_general"     ON settings_general          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_studio_holidays"      ON studio_holidays           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_studio_info"          ON settings_studio_info      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_reminder_templates"   ON settings_reminder_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_packages"             ON packages                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_backgrounds"          ON backgrounds               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_addons"               ON addons                    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vouchers"             ON vouchers                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_custom_fields"        ON custom_fields             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_leads"                ON leads                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_photo_for"            ON photo_for                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_roles"                ON roles                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_users"                ON users                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_customers"            ON customers                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vendors"              ON vendors                   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bookings"             ON bookings                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_booking_backgrounds"  ON booking_backgrounds       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_booking_addons"       ON booking_addons            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_booking_custom_fields" ON booking_custom_fields    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_expenses"             ON expenses                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_commissions"          ON commissions               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_booking_reminders"    ON booking_reminders         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_activity_log"         ON activity_log              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_invoices"             ON invoices                  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 9: HELPER FUNCTIONS
-- ============================================================

-- Generate booking number: YJS-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS text AS $$
DECLARE
  today_str text;
  seq_num   integer;
  result    text;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(booking_number FROM 14) AS integer)
  ), 0) + 1
  INTO seq_num
  FROM bookings
  WHERE booking_number LIKE 'YJS-' || today_str || '-%';

  result := 'YJS-' || today_str || '-' || LPAD(seq_num::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate invoice number: INV-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  today_str text;
  seq_num   integer;
  result    text;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 14) AS integer)
  ), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || today_str || '-%';

  result := 'INV-' || today_str || '-' || LPAD(seq_num::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 10: TRIGGERS (auto-update updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers dulu agar idempotent, lalu buat ulang
DROP TRIGGER IF EXISTS trg_settings_general_updated    ON settings_general;
DROP TRIGGER IF EXISTS trg_studio_info_updated         ON settings_studio_info;
DROP TRIGGER IF EXISTS trg_reminder_templates_updated  ON settings_reminder_templates;
DROP TRIGGER IF EXISTS trg_packages_updated            ON packages;
DROP TRIGGER IF EXISTS trg_backgrounds_updated         ON backgrounds;
DROP TRIGGER IF EXISTS trg_addons_updated              ON addons;
DROP TRIGGER IF EXISTS trg_vouchers_updated            ON vouchers;
DROP TRIGGER IF EXISTS trg_custom_fields_updated       ON custom_fields;
DROP TRIGGER IF EXISTS trg_roles_updated               ON roles;
DROP TRIGGER IF EXISTS trg_users_updated               ON users;
DROP TRIGGER IF EXISTS trg_customers_updated           ON customers;
DROP TRIGGER IF EXISTS trg_vendors_updated             ON vendors;
DROP TRIGGER IF EXISTS trg_bookings_updated            ON bookings;
DROP TRIGGER IF EXISTS trg_expenses_updated            ON expenses;
DROP TRIGGER IF EXISTS trg_commissions_updated         ON commissions;

CREATE TRIGGER trg_settings_general_updated
  BEFORE UPDATE ON settings_general
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_studio_info_updated
  BEFORE UPDATE ON settings_studio_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reminder_templates_updated
  BEFORE UPDATE ON settings_reminder_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_packages_updated
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_backgrounds_updated
  BEFORE UPDATE ON backgrounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_addons_updated
  BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vouchers_updated
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_custom_fields_updated
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_roles_updated
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vendors_updated
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expenses_updated
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commissions_updated
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SELESAI
-- Total: 22 tabel, 5 enum, 2 functions, 15 triggers
-- ============================================================
