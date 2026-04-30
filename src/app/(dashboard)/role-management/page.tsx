import { requireMenu } from "@/lib/require-menu";
import { getCachedRoles } from "@/lib/cached-queries";
import { RoleManagementClient } from "./_components/role-management-client";
import type { Role } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function RoleManagementPage() {
  const [currentUser, roles] = await Promise.all([
    requireMenu("role-management"),
    getCachedRoles(),
  ]);

  return <RoleManagementClient currentUser={currentUser} initialRoles={(roles ?? []) as Role[]} />;
}
