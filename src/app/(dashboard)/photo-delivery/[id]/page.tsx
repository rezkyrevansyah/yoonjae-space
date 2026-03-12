import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import dynamic from "next/dynamic";

const PhotoDeliveryDetailClient = dynamic(
  () => import("./_components/photo-delivery-detail-client").then((m) => ({ default: m.PhotoDeliveryDetailClient })),
  { ssr: false }
);

export const metadata = { title: "Detail Foto — Yoonjaespace" };

export default async function PhotoDeliveryDetailPage({ params }: { params: { id: string } }) {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, booking_date, start_time, end_time, status, print_order_status,
      is_rescheduled, google_drive_link, person_count, notes, behind_the_scenes, subtotal, total,
      dp_amount, dp_paid_at, voucher_id, manual_discount, staff_id, created_by, created_at,
      customers(id, name, phone, email, instagram, address, domicile),
      packages(id, name, price, duration_minutes),
      photo_for:photo_for(id, name),
      vouchers(id, code, discount_type, discount_value),
      staff:users!bookings_staff_id_fkey(id, name),
      creator:users!bookings_created_by_fkey(id, name),
      booking_backgrounds(background_id, backgrounds(id, name)),
      booking_addons(addon_id, price, is_paid, is_extra, addons(id, name, need_extra_time, extra_time_minutes)),
      booking_custom_fields(custom_field_id, value, custom_fields(id, label, field_type, options)),
      booking_packages(id, package_id, quantity, price_snapshot, packages(id, name, price, duration_minutes, need_extra_time, extra_time_minutes))
    `)
    .eq("id", params.id)
    .single();

  if (!booking) notFound();

  return (
    <PhotoDeliveryDetailClient
      currentUser={currentUser}
      booking={booking as never}
    />
  );
}
