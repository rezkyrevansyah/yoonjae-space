import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createAdminClient } from "@/utils/supabase/admin";

// ── Cache Tag Constants ─────────────────────────────────────
export const CACHE_TAGS = {
  PACKAGES: "packages",
  BACKGROUNDS: "backgrounds",
  ADDONS: "addons",
  LEADS: "leads",
  PHOTO_FOR: "photo_for",
  CUSTOM_FIELDS: "custom_fields",
  STUDIO_HOLIDAYS: "studio_holidays",
  SETTINGS_GENERAL: "settings_general",
  SETTINGS_STUDIO_INFO: "settings_studio_info",
  SETTINGS_REMINDER_TEMPLATES: "settings_reminder_templates",
  ROLES: "roles",
  USERS_ACTIVE: "users_active",
  VENDORS_ACTIVE: "vendors_active",
  DOMICILES: "domiciles",
} as const;

// ── Why admin client? ───────────────────────────────────────
// unstable_cache cannot call cookies() inside its fn.
// createClient() from @supabase/ssr reads cookies for auth.
// createAdminClient() uses SERVICE_ROLE env var — no cookies — safe inside unstable_cache.
// Data cached here is shared across all users (settings, master data) — safe to read via service role.

// ── Settings (TTL: 1 hour) ──────────────────────────────────

const _getCachedStudioInfo = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings_studio_info")
      .select("logo_url, studio_name, whatsapp_number, address, footer_text, front_photo_url, instagram, google_maps_url")
      .eq("lock", true)
      .maybeSingle();
    return data ?? null;
  },
  ["settings_studio_info"],
  { tags: [CACHE_TAGS.SETTINGS_STUDIO_INFO], revalidate: 3600 }
);

const _getCachedSettingsGeneral = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings_general")
      .select("open_time, close_time, default_payment_status, time_slot_interval")
      .eq("lock", true)
      .maybeSingle();
    return data ?? null;
  },
  ["settings_general"],
  { tags: [CACHE_TAGS.SETTINGS_GENERAL], revalidate: 3600 }
);

const _getCachedReminderTemplates = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings_reminder_templates")
      .select("reminder_message, thank_you_message, thank_you_payment_message, custom_message")
      .eq("lock", true)
      .maybeSingle();
    return data ?? null;
  },
  ["settings_reminder_templates"],
  { tags: [CACHE_TAGS.SETTINGS_REMINDER_TEMPLATES], revalidate: 3600 }
);

// ── Master Data (TTL: 1 hour) ───────────────────────────────

const _getCachedPackages = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("packages")
      .select("id, name, price, duration_minutes, category, sort_order, include_print, need_extra_time, extra_time_minutes, extra_time_position, is_active")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    return data ?? [];
  },
  ["packages-active"],
  { tags: [CACHE_TAGS.PACKAGES], revalidate: 3600 }
);

const _getCachedBackgrounds = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("backgrounds")
      .select("id, name, is_available")
      .eq("is_available", true)
      .order("name");
    return data ?? [];
  },
  ["backgrounds-available"],
  { tags: [CACHE_TAGS.BACKGROUNDS], revalidate: 3600 }
);

const _getCachedAddons = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("addons")
      .select("id, name, price, category, sort_order, need_extra_time, extra_time_minutes, extra_time_position, is_active")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    return data ?? [];
  },
  ["addons-active"],
  { tags: [CACHE_TAGS.ADDONS], revalidate: 3600 }
);

const _getCachedLeads = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("leads")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  },
  ["leads-active"],
  { tags: [CACHE_TAGS.LEADS], revalidate: 3600 }
);

const _getCachedDomiciles = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("domiciles")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  },
  ["domiciles-active"],
  { tags: [CACHE_TAGS.DOMICILES], revalidate: 3600 }
);

const _getCachedPhotoFor = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("photo_for")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  },
  ["photo_for-active"],
  { tags: [CACHE_TAGS.PHOTO_FOR], revalidate: 3600 }
);

const _getCachedCustomFields = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("custom_fields")
      .select("id, label, field_type, options, is_active")
      .eq("is_active", true)
      .order("created_at");
    return data ?? [];
  },
  ["custom_fields-active"],
  { tags: [CACHE_TAGS.CUSTOM_FIELDS], revalidate: 3600 }
);

const _getCachedHolidays = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("studio_holidays")
      .select("id, start_date, end_date, label")
      .order("start_date");
    return data ?? [];
  },
  ["studio_holidays"],
  { tags: [CACHE_TAGS.STUDIO_HOLIDAYS], revalidate: 3600 }
);

// ── User & Role Data (TTL: 5 minutes) ───────────────────────

const _getCachedActiveUsers = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  },
  ["users-active"],
  { tags: [CACHE_TAGS.USERS_ACTIVE], revalidate: 300 }
);

const _getCachedRoles = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("roles")
      .select("id, name, description, menu_access, is_system, created_at")
      .order("name");
    return data ?? [];
  },
  ["roles"],
  { tags: [CACHE_TAGS.ROLES], revalidate: 300 }
);

const _getCachedActiveVendors = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    return data ?? [];
  },
  ["vendors-active"],
  { tags: [CACHE_TAGS.VENDORS_ACTIVE], revalidate: 300 }
);

// ── Public exports wrapped with React.cache() ───────────────
// React.cache() deduplicates calls within the same request.
// unstable_cache persists results across requests (server Data Cache).

export const getCachedStudioInfo = cache(_getCachedStudioInfo);
export const getCachedSettingsGeneral = cache(_getCachedSettingsGeneral);
export const getCachedReminderTemplates = cache(_getCachedReminderTemplates);
export const getCachedPackages = cache(_getCachedPackages);
export const getCachedBackgrounds = cache(_getCachedBackgrounds);
export const getCachedAddons = cache(_getCachedAddons);
export const getCachedLeads = cache(_getCachedLeads);
export const getCachedDomiciles = cache(_getCachedDomiciles);
export const getCachedPhotoFor = cache(_getCachedPhotoFor);
export const getCachedCustomFields = cache(_getCachedCustomFields);
export const getCachedHolidays = cache(_getCachedHolidays);
export const getCachedActiveUsers = cache(_getCachedActiveUsers);
export const getCachedRoles = cache(_getCachedRoles);
export const getCachedActiveVendors = cache(_getCachedActiveVendors);
