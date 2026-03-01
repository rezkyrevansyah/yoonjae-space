import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CustomerPageClient } from "./_components/customer-page-client";

export default async function CustomerPage({ params }: { params: { bookingId: string } }) {
  const supabase = await createClient();

  const [{ data: booking }, { data: studioInfo }, { data: settings }] = await Promise.all([
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
    supabase
      .from("settings_studio_info")
      .select("studio_name, logo_url, front_photo_url, address, whatsapp_number, instagram, google_maps_url, footer_text")
      .eq("lock", true)
      .maybeSingle(),
    supabase
      .from("settings_general")
      .select("open_time, close_time")
      .eq("lock", true)
      .maybeSingle(),
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
