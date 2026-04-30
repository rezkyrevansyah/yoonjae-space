import { requireMenu } from "@/lib/require-menu";
import { createClient } from "@/utils/supabase/server";
import type { BookingStatus } from "@/lib/types/database";
import { BookingsClient } from "./_components/bookings-client";

export const metadata = { title: "Bookings — Yoonjaespace" };
export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  print_order_status: string | null;
  is_rescheduled: boolean;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  packages: { name: string } | null;
  booking_packages: { packages: { name: string } | null }[];
  staff: { name: string } | null;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ print?: string }>;
}) {
  const { print } = await searchParams;
  const supabase = await createClient();

  let initialQuery = supabase
    .from("bookings")
    .select(
      `id, booking_number, booking_date, start_time, end_time, status, print_order_status, is_rescheduled, total, created_at,
       customers(name),
       packages(name),
       booking_packages(packages(name)),
       staff:users!bookings_staff_id_fkey(name)`,
      { count: "exact" }
    )
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (print) {
    initialQuery = initialQuery.eq("print_order_status", print);
  }

  const [currentUser, initialResult] = await Promise.all([
    requireMenu("bookings"),
    initialQuery.range(0, 9),
  ]);

  return (
    <BookingsClient
      currentUser={currentUser}
      initialPrint={print ?? ""}
      initialData={{
        bookings: (initialResult.data as unknown as BookingRow[]) ?? [],
        total: initialResult.count ?? 0,
      }}
    />
  );
}
