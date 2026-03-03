import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedReminderTemplates, getCachedStudioInfo } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { RemindersClient, type ReminderBooking } from "./_components/reminders-client";

export const metadata = { title: "Reminders — Yoonjaespace" };

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function RemindersPage() {
  const supabase = await createClient();
  const today = toDateStr(new Date());

  const [currentUser, templates, studioInfo, initialResult] = await Promise.all([
    getCurrentUser(),
    getCachedReminderTemplates(),
    getCachedStudioInfo(),
    supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status,
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

  if (!currentUser) redirect("/login");

  return (
    <RemindersClient
      currentUser={currentUser}
      templates={templates ?? { reminder_message: null, thank_you_message: null, thank_you_payment_message: null }}
      studioName={studioInfo?.studio_name ?? "Studio"}
      initialBookings={(initialResult.data ?? []) as unknown as ReminderBooking[]}
    />
  );
}
