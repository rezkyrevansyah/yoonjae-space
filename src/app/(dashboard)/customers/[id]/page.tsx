import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { CustomerDetailClient } from "./_components/customer-detail-client";

export const metadata = { title: "Detail Customer — Yoonjaespace" };

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const [{ data: customer }, { data: leads }, { data: domiciles }] = await Promise.all([
    supabase
      .from("customers")
      .select(`
        id, name, phone, email, instagram, address, domicile, lead_id, notes, created_at,
        leads(id, name),
        bookings(
          id, booking_number, booking_date, status, total,
          packages(name)
        )
      `)
      .eq("id", params.id)
      .single(),
    supabase
      .from("leads")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("domiciles")
      .select("name")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!customer) notFound();

  return (
    <CustomerDetailClient
      currentUser={currentUser}
      customer={customer as never}
      leads={(leads ?? []) as { id: string; name: string }[]}
      domicileOptions={(domiciles ?? []).map((d) => d.name)}
    />
  );
}
