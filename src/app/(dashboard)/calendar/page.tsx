import { requireMenu } from "@/lib/require-menu";
import { getCachedSettingsGeneral } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { CalendarClient, type CalendarBooking } from "./_components/calendar-client";
import { toDateStr } from "@/lib/utils";

export const metadata = { title: "Calendar — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const today = toDateStr(new Date());

  const [currentUser, settings, initialResult] = await Promise.all([
    requireMenu("calendar"),
    getCachedSettingsGeneral(),
    // Day view: fetch full data including backgrounds/addons
    supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status,
        person_count, behind_the_scenes, notes,
        customers(name, phone),
        packages(name, duration_minutes),
        photo_for:photo_for(name),
        booking_backgrounds(backgrounds(name)),
        booking_addons(price, is_paid, is_extra, addons(name, need_extra_time, extra_time_minutes, extra_time_position)),
        booking_packages(id, package_id, quantity, price_snapshot, packages(name)),
        booking_custom_fields(custom_field_id, value, custom_fields(label))
      `)
      .gte("booking_date", today)
      .lte("booking_date", today)
      .neq("status", "CANCELED")
      .order("booking_date")
      .order("start_time"),
  ]);

  const initialBookings: CalendarBooking[] = (initialResult.data ?? []).map(b => {
    const raw = b as unknown as CalendarBooking;
    return {
      ...raw,
      booking_backgrounds: raw.booking_backgrounds ?? [],
      booking_addons: raw.booking_addons ?? [],
      booking_packages: raw.booking_packages ?? [],
      booking_custom_fields: raw.booking_custom_fields ?? [],
    };
  });

  return (
    <CalendarClient
      currentUser={currentUser}
      openTime={settings?.open_time ?? "09:00"}
      closeTime={settings?.close_time ?? "21:00"}
      timeSlotInterval={settings?.time_slot_interval ?? 30}
      initialBookings={initialBookings}
      initialDateStr={today}
    />
  );
}
