import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedActiveUsers } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { CommissionsClient, type InitialCommissionData } from "./_components/commissions-client";

export const metadata = { title: "Commissions — Yoonjaespace" };

function getPeriodRange(month: number, year: number, cutoffDay: number) {
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const endDay = cutoffDay - 1;
  const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(cutoffDay).padStart(2, "0")}`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { start, end };
}

const PAID_STATUSES = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];

export default async function CommissionsPage() {
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Fetch cutoff day from settings
  const { data: settings } = await supabase
    .from("settings_general")
    .select("commission_cutoff_day")
    .eq("lock", true)
    .maybeSingle();
  const cutoffDay = settings?.commission_cutoff_day ?? 26;

  const period = getPeriodRange(month, year, cutoffDay);

  const [currentUser, staffUsers, bookingsResult, commissionsResult] = await Promise.all([
    getCurrentUser(),
    getCachedActiveUsers(),
    supabase
      .from("bookings")
      .select("id, booking_number, booking_date, total, staff_id, commission_amount, customers(name), packages(name)")
      .gte("booking_date", period.start)
      .lte("booking_date", period.end)
      .in("status", PAID_STATUSES)
      .order("booking_date"),
    supabase
      .from("commissions")
      .select("id, staff_id, total_amount, status")
      .eq("period_start", period.start)
      .eq("period_end", period.end),
  ]);

  if (!currentUser) redirect("/login");

  const initialData: InitialCommissionData = {
    month,
    year,
    cutoffDay,
    bookings: (bookingsResult.data ?? []) as unknown as InitialCommissionData["bookings"],
    existingCommissions: (commissionsResult.data ?? []) as unknown as InitialCommissionData["existingCommissions"],
  };

  return (
    <CommissionsClient
      currentUser={currentUser}
      staffUsers={staffUsers ?? []}
      initialData={initialData}
    />
  );
}
