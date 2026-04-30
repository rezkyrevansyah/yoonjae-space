// =============================================
// Database Types for Yoonjaespace
// =============================================

// --- Enums ---
export type BookingStatus =
  | "BOOKED"
  | "DP_PAID"
  | "PAID"
  | "SHOOT_DONE"
  | "PHOTOS_DELIVERED"
  | "ADDON_UNPAID"
  | "CLOSED"
  | "CANCELED";

export type PrintOrderStatus =
  | "SELECTION"
  | "VENDOR"
  | "PRINTING"
  | "RECEIVE"
  | "PACKING"
  | "SHIPPED"
  | "DONE";

export type DiscountType = "percentage" | "fixed";
export type FieldType = "text" | "select" | "checkbox" | "number" | "url";
export type CommissionPayStatus = "unpaid" | "paid";
export type ExpenseSource = "manual" | "commission";
export type ReminderType = "reminder" | "thank_you" | "thank_you_payment";

// --- Settings ---
export interface SettingsGeneral {
  lock: boolean; // PK, singleton
  open_time: string;
  close_time: string;
  default_payment_status: "paid" | "unpaid";
  time_slot_interval: number;
  commission_cutoff_day: number; // day of month (1-28), default 26
  commission_default_bonus: number; // flat bonus Rp per sale, default 0
  created_at: string;
  updated_at: string;
}

export interface StudioHoliday {
  id: string;
  start_date: string;
  end_date: string;
  label: string;
  created_at: string;
}

export interface SettingsStudioInfo {
  lock: boolean; // PK, singleton
  studio_name: string;
  address: string | null;
  google_maps_url: string | null;
  whatsapp_number: string | null;
  email: string | null;
  instagram: string | null;
  logo_url: string | null;
  front_photo_url: string | null;
  footer_text: string | null;
}

export interface SettingsReminderTemplates {
  lock: boolean; // PK, singleton
  reminder_message: string | null;
  thank_you_message: string | null;
  thank_you_payment_message: string | null;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string;
  sort_order: number;
  include_print: boolean;
  need_extra_time: boolean;
  extra_time_minutes: number;
  extra_time_position: 'before' | 'after';
  commission_bonus: number; // per-package override bonus Rp, default 0
  is_active: boolean;
  is_mua: boolean; // surfaces in /mua public schedule when true
  created_at: string;
  updated_at: string;
}

export interface Background {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  category: string;
  sort_order: number;
  need_extra_time: boolean;
  extra_time_minutes: number;
  extra_time_position: 'before' | 'after';
  is_active: boolean;
  is_mua: boolean; // surfaces in /mua public schedule when true
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  minimum_purchase: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomField {
  id: string;
  label: string;
  field_type: FieldType;
  options: string[] | null; // jsonb
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Domicile {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PhotoFor {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

// --- User & Auth ---
export interface Role {
  id: string;
  name: string;
  description: string | null;
  menu_access: string[]; // jsonb array of slugs
  is_system: boolean;
  created_at: string;
}

export interface User {
  id: string;
  auth_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role_id: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  roles?: Role;
}

// --- Core Business ---
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  address: string | null;
  domicile: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  leads?: Lead;
}

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  public_token: string;
  booking_number: string;
  customer_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  package_id: string | null;
  photo_for_id: string | null;
  person_count: number;
  notes: string | null;
  behind_the_scenes: boolean;
  status: BookingStatus;
  print_order_status: PrintOrderStatus | null;
  is_rescheduled: boolean;
  google_drive_link: string | null;
  voucher_id: string | null;
  manual_discount: number;
  subtotal: number;
  total: number;
  dp_amount: number | null;
  dp_paid_at: string | null;
  payment_method: string | null;
  payment_account_name: string | null;
  staff_id: string | null;
  commission_amount: number; // per-booking commission in Rp
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  customers?: Pick<Customer, "id" | "name" | "phone" | "email" | "instagram">;
  packages?: Pick<Package, "id" | "name" | "price" | "duration_minutes">;
  photo_for?: Pick<PhotoFor, "id" | "name">;
  vouchers?: Pick<Voucher, "id" | "code" | "discount_type" | "discount_value">;
  staff?: Pick<User, "id" | "name">;
  booking_backgrounds?: BookingBackground[];
  booking_addons?: BookingAddon[];
  booking_packages?: BookingPackage[];
}

export interface BookingBackground {
  booking_id: string;
  background_id: string;
  backgrounds?: Pick<Background, "id" | "name">;
}

export interface BookingAddon {
  booking_id: string;
  addon_id: string;
  price: number; // price per unit at booking time
  quantity: number;
  is_paid: boolean;
  is_extra: boolean;
  addons?: Pick<Addon, "id" | "name" | "need_extra_time" | "extra_time_minutes" | "extra_time_position">;
}

export interface BookingPackage {
  id: string;
  booking_id: string;
  package_id: string;
  quantity: number;
  price_snapshot: number; // price per unit at booking time
  created_at: string;
  packages?: Pick<Package, "id" | "name" | "price" | "duration_minutes" | "need_extra_time" | "extra_time_minutes">;
}

export interface BookingCustomField {
  booking_id: string;
  custom_field_id: string;
  value: string | null;
  custom_fields?: Pick<CustomField, "id" | "label" | "field_type" | "options">;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  invoice_date: string;
  created_at: string;
  bookings?: Booking;
}

// --- Finance ---
export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  vendor_id: string | null;
  notes: string | null;
  source: ExpenseSource;
  source_id: string | null;
  created_at: string;
  updated_at: string;
  vendors?: Pick<Vendor, "id" | "name">;
}

export interface Commission {
  id: string;
  staff_id: string;
  period_start: string; // 26th of month
  period_end: string; // 25th of next month
  booking_count: number;
  total_amount: number;
  status: CommissionPayStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  users?: Pick<User, "id" | "name">;
}

// --- Support ---
export interface BookingReminder {
  id: string;
  booking_id: string;
  type: ReminderType;
  sent_at: string;
  sent_by: string | null;
  users?: Pick<User, "id" | "name">;
}

export interface BookingStatusDate {
  id: string;
  booking_id: string;
  status_type: string;
  status_date: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  created_at: string;
}

// --- Derived / UI Types ---
export interface CurrentUser {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone: string | null;
  role_id: string;
  role_name: string;
  menu_access: string[];
  is_primary: boolean;
  is_active: boolean;
}
