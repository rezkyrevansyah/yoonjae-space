import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { NewBookingClient } from "./_components/new-booking-client";
import type { Package, Background, Addon, Lead, PhotoFor, CustomField, SettingsGeneral, StudioHoliday } from "@/lib/types/database";

export const metadata = { title: "Buat Booking — Yoonjaespace" };

export default async function NewBookingPage() {
  // getCurrentUser uses React.cache() — no duplicate DB hit vs layout.tsx
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const [
    { data: packages },
    { data: backgrounds },
    { data: addons },
    { data: leads },
    { data: photoFors },
    { data: customFields },
    { data: settingsGeneral },
    { data: holidays },
    { data: users },
  ] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, price, duration_minutes, need_extra_time, extra_time_minutes, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("backgrounds")
      .select("id, name, is_available")
      .eq("is_available", true)
      .order("name"),
    supabase
      .from("addons")
      .select("id, name, price, need_extra_time, extra_time_minutes, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("leads")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("photo_for")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("custom_fields")
      .select("id, label, field_type, options, is_active")
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("settings_general")
      .select("open_time, close_time, default_payment_status, time_slot_interval")
      .eq("lock", true)
      .maybeSingle(),
    supabase
      .from("studio_holidays")
      .select("id, start_date, end_date, label")
      .order("start_date"),
    supabase
      .from("users")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <NewBookingClient
      currentUser={currentUser}
      packages={(packages as Package[]) ?? []}
      backgrounds={(backgrounds as Background[]) ?? []}
      addons={(addons as Addon[]) ?? []}
      leads={(leads as Lead[]) ?? []}
      photoFors={(photoFors as PhotoFor[]) ?? []}
      customFields={(customFields as CustomField[]) ?? []}
      settingsGeneral={settingsGeneral as SettingsGeneral | null}
      holidays={(holidays as StudioHoliday[]) ?? []}
      users={(users as { id: string; name: string }[]) ?? []}
    />
  );
}
