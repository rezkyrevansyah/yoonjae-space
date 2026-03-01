import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { CustomersClient } from "./_components/customers-client";

export const metadata = { title: "Customers — Yoonjaespace" };

export default async function CustomersPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <CustomersClient
      currentUser={currentUser}
      leads={(leads ?? []) as { id: string; name: string }[]}
    />
  );
}
