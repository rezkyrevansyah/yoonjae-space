import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/utils/supabase/server";
import { BookingsClient } from "./_components/bookings-client";
import type { BookingStatus } from "@/lib/types/database";

export const metadata = { title: "Bookings — Yoonjaespace" };

export default async function BookingsPage() {
  const supabase = await createClient();
  const [currentUser, initialResult] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("bookings")
      .select(
        `id, booking_number, booking_date, start_time, end_time, status, total, created_at,
         customers(name),
         packages(name),
         staff:users!bookings_staff_id_fkey(name)`,
        { count: "exact" }
      )
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(0, 9),
  ]);

  if (!currentUser) redirect("/login");

  interface BookingRow {
    id: string;
    booking_number: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    total: number;
    created_at: string;
    customers: { name: string } | null;
    packages: { name: string } | null;
    staff: { name: string } | null;
  }

  return (
    <BookingsClient
      currentUser={currentUser}
      initialData={{
        bookings: (initialResult.data as unknown as BookingRow[]) ?? [],
        total: initialResult.count ?? 0,
      }}
    />
  );
}
