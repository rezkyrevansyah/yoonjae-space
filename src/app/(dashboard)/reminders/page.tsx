import { requireMenu } from "@/lib/require-menu";
import { getCachedReminderTemplates, getCachedStudioInfo } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { RemindersClient, type ReminderBooking } from "./_components/reminders-client";
import { toDateStr } from "@/lib/utils";

export const metadata = { title: "Reminders — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const supabase = await createClient();
  const today = toDateStr(new Date());

  const [currentUser, templates, studioInfo, initialResult] = await Promise.all([
    requireMenu("reminders"),
    getCachedReminderTemplates(),
    getCachedStudioInfo(),
    supabase
      .from("bookings")
      .select(`
        id, public_token, booking_number, booking_date, start_time, end_time, status,
        customers(name, phone),
        packages(name),
        booking_reminders(type, sent_at)
      `)
      .gte("booking_date", today)
      .lte("booking_date", today)
      .not("status", "in", '("CLOSED","CANCELED")')
      .order("booking_date")
      .order("start_time"),
  ]);

  return (
    <RemindersClient
      currentUser={currentUser}
      templates={templates ?? { reminder_message: null, thank_you_message: null, thank_you_payment_message: null, custom_message: null }}
      studioName={studioInfo?.studio_name ?? "Studio"}
      initialBookings={(initialResult.data ?? []) as unknown as ReminderBooking[]}
    />
  );
}
