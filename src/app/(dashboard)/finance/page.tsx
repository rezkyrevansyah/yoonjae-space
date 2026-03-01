import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { FinanceClient } from "./_components/finance-client";

export const metadata = { title: "Finance — Yoonjaespace" };

export default async function FinancePage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <FinanceClient
      currentUser={currentUser}
      vendors={vendors ?? []}
    />
  );
}
