import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedRoles } from "@/lib/cached-queries";
import { UserManagementClient, type UserRow } from "./_components/user-management-client";
import type { Role } from "@/lib/types/database";

export default async function UserManagementPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const [usersRes, roles] = await Promise.all([
    supabase
      .from("users")
      .select("id, auth_id, name, email, phone, role_id, is_active, is_primary, created_at, updated_at, roles(id, name)")
      .order("created_at"),
    getCachedRoles(),
  ]);

  return (
    <UserManagementClient
      currentUser={currentUser}
      initialUsers={(usersRes.data ?? []) as unknown as UserRow[]}
      roles={(roles ?? []) as Role[]}
    />
  );
}
