-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text NOT NULL DEFAULT ''::text,
  user_role text NOT NULL DEFAULT ''::text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL DEFAULT ''::text,
  description text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.addon_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT addon_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price bigint NOT NULL DEFAULT 0,
  need_extra_time boolean NOT NULL DEFAULT false,
  extra_time_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  extra_time_position text NOT NULL DEFAULT 'after'::text CHECK (extra_time_position = ANY (ARRAY['before'::text, 'after'::text])),
  category text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  CONSTRAINT addons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT backgrounds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.booking_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  price bigint NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  is_extra boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity integer NOT NULL DEFAULT 1,
  CONSTRAINT booking_addons_pkey PRIMARY KEY (id),
  CONSTRAINT booking_addons_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.addons(id)
);
CREATE TABLE public.booking_backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  background_id uuid NOT NULL,
  CONSTRAINT booking_backgrounds_pkey PRIMARY KEY (id),
  CONSTRAINT booking_backgrounds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_backgrounds_background_id_fkey FOREIGN KEY (background_id) REFERENCES public.backgrounds(id)
);
CREATE TABLE public.booking_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  custom_field_id uuid NOT NULL,
  value text NOT NULL DEFAULT ''::text,
  CONSTRAINT booking_custom_fields_pkey PRIMARY KEY (id),
  CONSTRAINT booking_custom_fields_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_custom_fields_custom_field_id_fkey FOREIGN KEY (custom_field_id) REFERENCES public.custom_fields(id)
);
CREATE TABLE public.booking_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  package_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_snapshot bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_packages_pkey PRIMARY KEY (id),
  CONSTRAINT booking_packages_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_packages_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id)
);
CREATE TABLE public.booking_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['reminder'::text, 'thank_you'::text, 'thank_you_payment'::text])),
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_by uuid,
  CONSTRAINT booking_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT booking_reminders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT booking_reminders_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id)
);
CREATE TABLE public.booking_status_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  status_type text NOT NULL,
  status_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_status_dates_pkey PRIMARY KEY (id),
  CONSTRAINT booking_status_dates_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  booking_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  package_id uuid NOT NULL,
  photo_for_id uuid,
  person_count integer NOT NULL DEFAULT 1,
  notes text NOT NULL DEFAULT ''::text,
  behind_the_scenes boolean NOT NULL DEFAULT false,
  status USER-DEFINED NOT NULL DEFAULT 'BOOKED'::booking_status,
  print_order_status USER-DEFINED,
  google_drive_link text NOT NULL DEFAULT ''::text,
  voucher_id uuid,
  manual_discount bigint NOT NULL DEFAULT 0,
  subtotal bigint NOT NULL DEFAULT 0,
  total bigint NOT NULL DEFAULT 0,
  staff_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_rescheduled boolean NOT NULL DEFAULT false,
  commission_amount bigint NOT NULL DEFAULT 0,
  dp_amount bigint,
  dp_paid_at timestamp with time zone,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT bookings_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT bookings_photo_for_id_fkey FOREIGN KEY (photo_for_id) REFERENCES public.photo_for(id),
  CONSTRAINT bookings_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id),
  CONSTRAINT bookings_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id),
  CONSTRAINT bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  booking_count integer NOT NULL DEFAULT 0,
  total_amount bigint NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'unpaid'::commission_status,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT commissions_pkey PRIMARY KEY (id),
  CONSTRAINT commissions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id)
);
CREATE TABLE public.custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_type USER-DEFINED NOT NULL DEFAULT 'text'::custom_field_type,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_fields_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text NOT NULL DEFAULT ''::text,
  instagram text NOT NULL DEFAULT ''::text,
  address text NOT NULL DEFAULT ''::text,
  domicile text NOT NULL DEFAULT ''::text,
  lead_id uuid,
  notes text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.domiciles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT domiciles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT ''::text,
  amount bigint NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT ''::text,
  vendor_id uuid,
  notes text NOT NULL DEFAULT ''::text,
  source text NOT NULL DEFAULT 'manual'::text,
  source_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  booking_id uuid NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.package_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT package_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  price bigint NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  include_all_photos boolean NOT NULL DEFAULT false,
  need_extra_time boolean NOT NULL DEFAULT false,
  extra_time_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  include_print boolean DEFAULT false,
  extra_time_position character varying DEFAULT 'after'::character varying,
  category text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  commission_bonus bigint NOT NULL DEFAULT 0,
  CONSTRAINT packages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.photo_for (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT photo_for_pkey PRIMARY KEY (id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''::text,
  menu_access jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.settings_general (
  lock boolean NOT NULL DEFAULT true CHECK (lock = true),
  open_time text NOT NULL DEFAULT '09:00'::text,
  close_time text NOT NULL DEFAULT '21:00'::text,
  default_payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (default_payment_status = ANY (ARRAY['paid'::text, 'unpaid'::text])),
  time_slot_interval integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  commission_cutoff_day integer NOT NULL DEFAULT 26,
  commission_default_bonus bigint NOT NULL DEFAULT 0,
  CONSTRAINT settings_general_pkey PRIMARY KEY (lock)
);
CREATE TABLE public.settings_reminder_templates (
  lock boolean NOT NULL DEFAULT true CHECK (lock = true),
  reminder_message text NOT NULL DEFAULT ''::text,
  thank_you_message text NOT NULL DEFAULT ''::text,
  thank_you_payment_message text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT settings_reminder_templates_pkey PRIMARY KEY (lock)
);
CREATE TABLE public.settings_studio_info (
  lock boolean NOT NULL DEFAULT true CHECK (lock = true),
  studio_name text NOT NULL DEFAULT ''::text,
  address text NOT NULL DEFAULT ''::text,
  google_maps_url text NOT NULL DEFAULT ''::text,
  whatsapp_number text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  instagram text NOT NULL DEFAULT ''::text,
  logo_url text NOT NULL DEFAULT ''::text,
  front_photo_url text NOT NULL DEFAULT ''::text,
  footer_text text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT settings_studio_info_pkey PRIMARY KEY (lock)
);
CREATE TABLE public.studio_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  label text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT studio_holidays_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL DEFAULT ''::text,
  role_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT ''::text,
  phone text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text,
  address text NOT NULL DEFAULT ''::text,
  notes text NOT NULL DEFAULT ''::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type USER-DEFINED NOT NULL DEFAULT 'percentage'::discount_type,
  discount_value bigint NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL DEFAULT CURRENT_DATE,
  minimum_purchase bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_pkey PRIMARY KEY (id)
);