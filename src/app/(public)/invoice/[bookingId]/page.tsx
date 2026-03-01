import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { InvoiceClient } from "./_components/invoice-client";

export default async function InvoicePage({ params }: { params: { bookingId: string } }) {
  const [supabase, currentUser] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);

  const [{ data: booking }, { data: studioInfo }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status,
        subtotal, total, manual_discount,
        customers(name, phone, email),
        packages(name, price),
        vouchers(code, discount_type, discount_value),
        booking_addons(addon_id, price, is_paid, is_extra, addons(name)),
        invoices(invoice_number, invoice_date)
      `)
      .eq("id", params.bookingId)
      .single(),
    supabase
      .from("settings_studio_info")
      .select("studio_name, logo_url, address, whatsapp_number, footer_text")
      .eq("lock", true)
      .maybeSingle(),
  ]);

  if (!booking) notFound();

  return (
    <InvoiceClient
      booking={booking as never}
      studioInfo={studioInfo}
      currentUser={currentUser}
    />
  );
}
