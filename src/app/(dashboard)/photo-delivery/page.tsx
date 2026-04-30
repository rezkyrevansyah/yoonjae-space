import nextDynamic from "next/dynamic";
import { requireMenu } from "@/lib/require-menu";
import { createClient } from "@/utils/supabase/server";
import type { BookingStatus, PrintOrderStatus } from "@/lib/types/database";

const PhotoDeliveryClient = nextDynamic(
  () => import("./_components/photo-delivery-client").then((m) => ({ default: m.PhotoDeliveryClient })),
  { ssr: false }
);

export const metadata = { title: "Photo Delivery — Yoonjaespace" };
export const dynamic = "force-dynamic";

export interface PhotoDeliveryRow {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  print_order_status: PrintOrderStatus | null;
  google_drive_link: string | null;
  created_at: string;
  customers: { name: string; phone: string } | null;
  packages: { name: string } | null;
}

export default async function PhotoDeliveryPage() {
  const [, supabase] = await Promise.all([
    requireMenu("photo-delivery"),
    createClient(),
  ]);

  const initialResult = await supabase
    .from("bookings")
    .select(
      `id, booking_number, booking_date, start_time, end_time, status,
       print_order_status, google_drive_link, created_at,
       customers(name, phone),
       packages(name)`,
      { count: "exact" }
    )
    .in("status", ["SHOOT_DONE", "PHOTOS_DELIVERED"])
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(0, 9);

  return (
    <PhotoDeliveryClient
      initialData={{
        rows: (initialResult.data as unknown as PhotoDeliveryRow[]) ?? [],
        total: initialResult.count ?? 0,
      }}
    />
  );
}
