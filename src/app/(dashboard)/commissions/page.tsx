import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { CommissionsClient } from "./_components/commissions-client";

export const metadata = { title: "Commissions — Yoonjaespace" };

export default async function CommissionsPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  // Fetch all active staff users
  const { data: staffUsers } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("is_active", true)
    .order("name");

  return (
    <CommissionsClient
      currentUser={currentUser}
      staffUsers={staffUsers ?? []}
    />
  );
}
