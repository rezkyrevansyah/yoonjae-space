import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedStudioInfo } from "@/lib/cached-queries";
import { InvoiceClient } from "./_components/invoice-client";

export default async function InvoicePage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();
  const currentUser = await getCurrentUser();

  const [{ data: booking }, studioInfo] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id, public_token, booking_number, booking_date, start_time, end_time, status,
        subtotal, total, manual_discount, dp_amount, dp_paid_at,
        customers(name, email),
        packages(name, price),
        vouchers(code, discount_type, discount_value),
        booking_addons(addon_id, price, quantity, is_paid, is_extra, addons(name)),
        booking_packages(package_id, quantity, price_snapshot, packages(name)),
        invoices(invoice_number, invoice_date)
      `)
      .eq("public_token", params.token)
      .single(),
    getCachedStudioInfo(),
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
