import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedRoles } from "@/lib/cached-queries";
import { RoleManagementClient } from "./_components/role-management-client";
import type { Role } from "@/lib/types/database";

export default async function RoleManagementPage() {
  const [currentUser, roles] = await Promise.all([
    getCurrentUser(),
    getCachedRoles(),
  ]);

  if (!currentUser) redirect("/login");

  return <RoleManagementClient currentUser={currentUser} initialRoles={(roles ?? []) as Role[]} />;
}
