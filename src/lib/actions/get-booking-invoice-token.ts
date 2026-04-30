"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";

/**
 * Fetch a booking's public_token on demand for an authenticated staff user.
 *
 * The token is only fetched when staff explicitly opens an invoice/customer page,
 * so it never enters initial list payloads (which could leak via session replay,
 * browser caches, or shared URLs).
 *
 * Returns null if the user isn't logged in or the booking doesn't exist.
 */
export async function getBookingInvoiceToken(bookingId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("public_token")
    .eq("id", bookingId)
    .maybeSingle();

  return (data?.public_token as string | undefined) ?? null;
}
