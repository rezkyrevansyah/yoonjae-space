-- ============================================================
-- Yoonjaespace Studio Management — Supabase Schema
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Enum Types ────────────────────────────────────────────────

CREATE TYPE booking_status AS ENUM (
  'BOOKED',
  'PAID',
  'SHOOT_DONE',
  'PHOTOS_DELIVERED',
  'ADDON_UNPAID',
  'CLOSED',
  'CANCELED'
);

CREATE TYPE print_order_status AS ENUM (
  'SELECTION',
  'VENDOR',
  'PRINTING',
  'RECEIVE',
  'PACKING',
  'SHIPPED',
  'DONE'
);

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

CREATE TYPE custom_field_type AS ENUM ('text', 'select', 'checkbox', 'number', 'url');

CREATE TYPE commission_status AS ENUM ('unpaid', 'paid');

-- ============================================================
-- SETTINGS / CONFIGURATION TABLES
-- ============================================================

-- ── General Settings (singleton) ──────────────────────────────
CREATE TABLE settings_general (
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

-- ── Studio Holidays ───────────────────────────────────────────
CREATE TABLE studio_holidays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  label       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Studio Info (singleton) ───────────────────────────────────
CREATE TABLE settings_studio_info (
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

-- ── Reminder Message Templates (singleton) ────────────────────
CREATE TABLE settings_reminder_templates (
  lock                      boolean PRIMARY KEY DEFAULT true,
  reminder_message          text NOT NULL DEFAULT '',
  thank_you_message         text NOT NULL DEFAULT '',
  thank_you_payment_message text NOT NULL DEFAULT '',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_reminder_templates_single_row CHECK (lock = true)
);
INSERT INTO settings_reminder_templates DEFAULT VALUES ON CONFLICT (lock) DO NOTHING;

-- ── Packages ──────────────────────────────────────────────────
CREATE TABLE packages (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  description             text NOT NULL DEFAULT '',
  price                   bigint NOT NULL DEFAULT 0,
  duration_minutes        integer NOT NULL DEFAULT 60,
  include_all_photos      boolean NOT NULL DEFAULT false,
  need_extra_time         boolean NOT NULL DEFAULT false,
  extra_time_minutes      integer NOT NULL DEFAULT 0,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Backgrounds ───────────────────────────────────────────────
CREATE TABLE backgrounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  is_available    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Add-ons ───────────────────────────────────────────────────
CREATE TABLE addons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  price               bigint NOT NULL DEFAULT 0,
  need_extra_time     boolean NOT NULL DEFAULT false,
  extra_time_minutes  integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Vouchers ──────────────────────────────────────────────────
CREATE TABLE vouchers (
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

-- ── Custom Fields ─────────────────────────────────────────────
CREATE TABLE custom_fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  field_type  custom_field_type NOT NULL DEFAULT 'text',
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- for select type
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Leads (source tracking) ──────────────────────────────────
CREATE TABLE leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Photo For ─────────────────────────────────────────────────
CREATE TABLE photo_for (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLE & USER MANAGEMENT
-- ============================================================

-- ── Roles ─────────────────────────────────────────────────────
CREATE TABLE roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  description     text NOT NULL DEFAULT '',
  menu_access     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of menu slugs
  is_system       boolean NOT NULL DEFAULT false,      -- true = Owner role, undeletable
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Insert default Owner role
INSERT INTO roles (name, description, menu_access, is_system)
VALUES (
  'Owner',
  'Full access to all features',
  '["dashboard","bookings","calendar","customers","reminders","finance","vendors","commissions","activities","user-management","role-management","settings"]'::jsonb,
  true
);

-- ── Users (app-level, linked to Supabase Auth) ────────────────
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         uuid UNIQUE,                          -- references auth.users(id)
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  phone           text NOT NULL DEFAULT '',
  role_id         uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active       boolean NOT NULL DEFAULT true,
  is_primary      boolean NOT NULL DEFAULT false,       -- true = first owner, undeletable
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL UNIQUE,                    -- unique identifier
  email       text NOT NULL DEFAULT '',
  instagram   text NOT NULL DEFAULT '',
  address     text NOT NULL DEFAULT '',
  domicile    text NOT NULL DEFAULT '',
  lead_id     uuid REFERENCES leads(id) ON DELETE SET NULL,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE vendors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  address     text NOT NULL DEFAULT '',
  notes       text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number      text NOT NULL UNIQUE,             -- formatted: YJS-YYYYMMDD-XXXX
  customer_id         uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  booking_date        date NOT NULL,
  start_time          text NOT NULL,                    -- e.g. '10:00'
  end_time            text NOT NULL,                    -- auto-calculated
  package_id          uuid NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  photo_for_id        uuid REFERENCES photo_for(id) ON DELETE SET NULL,
  person_count        integer NOT NULL DEFAULT 1,
  notes               text NOT NULL DEFAULT '',
  behind_the_scenes   boolean NOT NULL DEFAULT false,
  status              booking_status NOT NULL DEFAULT 'BOOKED',
  print_order_status  print_order_status,               -- null if no print order
  google_drive_link   text NOT NULL DEFAULT '',
  voucher_id          uuid REFERENCES vouchers(id) ON DELETE SET NULL,
  manual_discount     bigint NOT NULL DEFAULT 0,
  subtotal            bigint NOT NULL DEFAULT 0,
  total               bigint NOT NULL DEFAULT 0,
  staff_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Booking ↔ Backgrounds (many-to-many) ─────────────────────
CREATE TABLE booking_backgrounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  background_id uuid NOT NULL REFERENCES backgrounds(id) ON DELETE CASCADE,
  UNIQUE(booking_id, background_id)
);

-- ── Booking ↔ Add-ons ────────────────────────────────────────
CREATE TABLE booking_addons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id    uuid NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  price       bigint NOT NULL DEFAULT 0,             -- snapshot price at booking time
  is_paid     boolean NOT NULL DEFAULT false,
  is_extra    boolean NOT NULL DEFAULT false,         -- true = added after initial booking
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Booking Custom Field Values ──────────────────────────────
CREATE TABLE booking_custom_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value           text NOT NULL DEFAULT '',
  UNIQUE(booking_id, custom_field_id)
);

-- ============================================================
-- FINANCE
-- ============================================================

CREATE TABLE expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  amount      bigint NOT NULL DEFAULT 0,
  category    text NOT NULL DEFAULT '',
  vendor_id   uuid REFERENCES vendors(id) ON DELETE SET NULL,
  notes       text NOT NULL DEFAULT '',
  source      text NOT NULL DEFAULT 'manual',         -- 'manual' or 'commission'
  source_id   uuid,                                    -- reference to commission record if applicable
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMISSIONS
-- ============================================================

CREATE TABLE commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start    date NOT NULL,                       -- 26th of month
  period_end      date NOT NULL,                       -- 25th of next month
  booking_count   integer NOT NULL DEFAULT 0,
  total_amount    bigint NOT NULL DEFAULT 0,
  status          commission_status NOT NULL DEFAULT 'unpaid',
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, period_start)
);

-- ============================================================
-- REMINDERS
-- ============================================================

CREATE TABLE booking_reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('reminder', 'thank_you', 'thank_you_payment')),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  sent_by     uuid REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name   text NOT NULL DEFAULT '',
  user_role   text NOT NULL DEFAULT '',
  action      text NOT NULL,                           -- e.g. 'create_booking', 'update_status'
  entity      text NOT NULL,                           -- e.g. 'booking', 'customer', 'settings'
  entity_id   text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INVOICES (metadata, actual render is frontend)
-- ============================================================

CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text NOT NULL UNIQUE,                -- formatted: INV-YYYYMMDD-XXXX
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_date    date NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_commissions_staff ON commissions(staff_id);
CREATE INDEX idx_commissions_period ON commissions(period_start, period_end);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);
CREATE INDEX idx_booking_backgrounds_booking ON booking_backgrounds(booking_id);
CREATE INDEX idx_booking_custom_fields_booking ON booking_custom_fields(booking_id);
CREATE INDEX idx_booking_reminders_booking ON booking_reminders(booking_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_studio_holidays_dates ON studio_holidays(start_date, end_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE settings_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_studio_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_for ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ── PUBLIC READ (anon) — for Customer Page & Invoice ─────────
-- Customer page & invoice need to read certain data without auth

CREATE POLICY "anon_read_bookings" ON bookings
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_customers" ON customers
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_packages" ON packages
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_addons" ON addons
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_backgrounds" ON backgrounds
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_booking_addons" ON booking_addons
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_booking_backgrounds" ON booking_backgrounds
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_studio_info" ON settings_studio_info
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_invoices" ON invoices
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_settings_general" ON settings_general
  FOR SELECT TO anon USING (true);

-- ── AUTHENTICATED — full CRUD ─────────────────────────────────

CREATE POLICY "auth_all_settings_general" ON settings_general
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_studio_holidays" ON studio_holidays
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_studio_info" ON settings_studio_info
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_reminder_templates" ON settings_reminder_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_packages" ON packages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_backgrounds" ON backgrounds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_addons" ON addons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_vouchers" ON vouchers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_custom_fields" ON custom_fields
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_leads" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_photo_for" ON photo_for
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_roles" ON roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_customers" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_vendors" ON vendors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_bookings" ON bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_booking_backgrounds" ON booking_backgrounds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_booking_addons" ON booking_addons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_booking_custom_fields" ON booking_custom_fields
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_expenses" ON expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_commissions" ON commissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_booking_reminders" ON booking_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_activity_log" ON activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_invoices" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Generate booking number: YJS-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS text AS $$
DECLARE
  today_str text;
  seq_num integer;
  result text;
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
  seq_num integer;
  result text;
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
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on modify
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_settings_general_updated BEFORE UPDATE ON settings_general
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_studio_info_updated BEFORE UPDATE ON settings_studio_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reminder_templates_updated BEFORE UPDATE ON settings_reminder_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_backgrounds_updated BEFORE UPDATE ON backgrounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_addons_updated BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vouchers_updated BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_custom_fields_updated BEFORE UPDATE ON custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commissions_updated BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
