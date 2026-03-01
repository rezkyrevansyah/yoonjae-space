import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { RoleManagementClient } from "./_components/role-management-client";
import type { Role } from "@/lib/types/database";

export default async function RoleManagementPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const { data: roles } = await supabase
    .from("roles")
    .select("id, name, description, menu_access, is_system, created_at")
    .order("created_at");

  return <RoleManagementClient currentUser={currentUser} initialRoles={(roles ?? []) as Role[]} />;
}
