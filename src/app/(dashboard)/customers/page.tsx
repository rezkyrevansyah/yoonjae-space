import { requireMenu } from "@/lib/require-menu";
import { getCachedLeads, getCachedDomiciles } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { CustomersClient, type CustomerRow } from "./_components/customers-client";

export const metadata = { title: "Customers — Yoonjaespace" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function CustomersPage() {
  const supabase = await createClient();
  const [currentUser, leads, domiciles, initialResult] = await Promise.all([
    requireMenu("customers"),
    getCachedLeads(),
    getCachedDomiciles(),
    supabase
      .from("customers")
      .select(
        `id, name, phone, email, instagram, address, domicile, lead_id, notes, created_at,
         leads(name),
         bookings(total, booking_date)`,
        { count: "exact" }
      )
      .order("name")
      .range(0, PAGE_SIZE - 1),
  ]);

  const domicileOptions = (domiciles as { name: string }[]).map(d => d.name);

  type RawCustomer = {
    id: string; name: string; phone: string; email: string | null;
    instagram: string | null; address: string | null; domicile: string | null;
    lead_id: string | null; notes: string | null; created_at: string;
    leads: { name: string } | null;
    bookings: { total: number; booking_date: string }[];
  };

  const initialCustomers: CustomerRow[] = ((initialResult.data ?? []) as unknown as RawCustomer[]).map((c) => {
    const bookings = c.bookings ?? [];
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email,
      instagram: c.instagram, address: c.address, domicile: c.domicile,
      lead_id: c.lead_id, lead_name: c.leads?.name ?? null, notes: c.notes, created_at: c.created_at,
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
      domicileOptions={domicileOptions}
      initialData={{ customers: initialCustomers, total: initialResult.count ?? 0 }}
    />
  );
}
