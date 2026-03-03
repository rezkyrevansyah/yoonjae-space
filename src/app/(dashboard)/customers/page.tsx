import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedLeads } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { CustomersClient, type CustomerRow } from "./_components/customers-client";

export const metadata = { title: "Customers — Yoonjaespace" };

const PAGE_SIZE = 25;

export default async function CustomersPage() {
  const supabase = await createClient();
  const [currentUser, leads, initialResult] = await Promise.all([
    getCurrentUser(),
    getCachedLeads(),
    supabase
      .from("customers")
      .select(
        `id, name, phone, email, instagram, address, domicile, lead_id, notes, created_at,
         bookings(total, booking_date)`,
        { count: "exact" }
      )
      .order("name")
      .range(0, PAGE_SIZE - 1),
  ]);

  if (!currentUser) redirect("/login");

  type RawCustomer = {
    id: string; name: string; phone: string; email: string | null;
    instagram: string | null; address: string | null; domicile: string | null;
    lead_id: string | null; notes: string | null; created_at: string;
    bookings: { total: number; booking_date: string }[];
  };

  const initialCustomers: CustomerRow[] = ((initialResult.data ?? []) as RawCustomer[]).map((c) => {
    const bookings = c.bookings ?? [];
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      instagram: c.instagram, address: c.address, domicile: c.domicile,
      lead_id: c.lead_id, notes: c.notes, created_at: c.created_at,
      total_bookings: bookings.length,
      total_spend: bookings.reduce((sum, b) => sum + (b.total ?? 0), 0),
      last_visit: bookings.length > 0
        ? bookings.sort((a, b) => b.booking_date.localeCompare(a.booking_date))[0].booking_date
        : null,
    };
  });

  return (
    <CustomersClient
      currentUser={currentUser}
      leads={(leads ?? []) as { id: string; name: string }[]}
      initialData={{ customers: initialCustomers, total: initialResult.count ?? 0 }}
    />
  );
}
