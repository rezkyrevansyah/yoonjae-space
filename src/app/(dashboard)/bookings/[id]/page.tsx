import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedPackages, getCachedBackgrounds, getCachedPhotoFor, getCachedActiveUsers, getCachedCustomFields, getCachedAddons } from "@/lib/cached-queries";
import { BookingDetailClient } from "./_components/booking-detail-client";

export const metadata = { title: "Detail Booking — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  // getCurrentUser uses React.cache() — no duplicate DB hit vs layout.tsx
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const [{ data: booking }, addons, packages, backgrounds, photoFors, users, customFields] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, public_token, booking_number, booking_date, start_time, end_time, status, print_order_status,
        is_rescheduled, google_drive_link, person_count, notes, behind_the_scenes, subtotal, total,
        dp_amount, dp_paid_at, voucher_id, manual_discount, staff_id, created_by, created_at,
        customers(id, name, phone, email, instagram, address, domicile),
        packages(id, name, price, duration_minutes),
        photo_for:photo_for(id, name),
        vouchers(id, code, discount_type, discount_value),
        staff:users!bookings_staff_id_fkey(id, name),
        creator:users!bookings_created_by_fkey(id, name),
        booking_backgrounds(background_id, backgrounds(id, name)),
        booking_addons(addon_id, price, quantity, is_paid, is_extra, addons(id, name, need_extra_time, extra_time_minutes)),
        booking_custom_fields(custom_field_id, value, custom_fields(id, label, field_type, options)),
        booking_packages(id, package_id, quantity, price_snapshot, packages(id, name, price, duration_minutes, need_extra_time, extra_time_minutes))
      `)
      .eq("id", params.id)
      .single(),
    getCachedAddons(),
    getCachedPackages(),
    getCachedBackgrounds(),
    getCachedPhotoFor(),
    getCachedActiveUsers(),
    getCachedCustomFields(),
  ]);

  if (!booking) notFound();

  return (
    <BookingDetailClient
      currentUser={currentUser}
      booking={booking as never}
      availableAddons={addons as never}
      packages={packages}
      backgrounds={backgrounds}
      photoFors={photoFors}
      users={users}
      customFields={customFields as never}
    />
  );
}
