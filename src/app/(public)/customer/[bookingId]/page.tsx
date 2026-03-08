import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCachedStudioInfo, getCachedSettingsGeneral } from "@/lib/cached-queries";
import { CustomerPageClient } from "./_components/customer-page-client";

export default async function CustomerPage({ params }: { params: { bookingId: string } }) {
  const supabase = await createClient();

  const [{ data: booking }, studioInfo, settings] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status, print_order_status,
        google_drive_link, person_count, behind_the_scenes,
        customers(name, phone),
        packages(name, duration_minutes),
        booking_addons(addon_id, price, is_paid, is_extra, addons(name)),
        booking_backgrounds(backgrounds(name)),
        invoices(invoice_number)
      `)
      .eq("id", params.bookingId)
      .single(),
    getCachedStudioInfo(),
    getCachedSettingsGeneral(),
  ]);

  if (!booking) notFound();

  return (
    <CustomerPageClient
      booking={booking as never}
      studioInfo={studioInfo}
      settings={settings}
    />
  );
}
