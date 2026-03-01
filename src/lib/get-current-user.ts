import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type { CurrentUser } from "@/lib/types/database";

/**
 * Fetch the current authenticated user with role data.
 * Wrapped in React.cache() — result is deduplicated per request,
 * so calling this from layout.tsx AND page.tsx only hits the DB once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("id, auth_id, name, email, phone, role_id, is_primary, is_active, roles(name, menu_access)")
    .eq("auth_id", authUser.id)
    .single();

  if (!userData) return null;

  const rolesData = userData.roles as unknown;
  const role = (Array.isArray(rolesData) ? rolesData[0] : rolesData) as {
    name: string;
    menu_access: string[];
  } | null;

  return {
    id: userData.id,
    auth_id: userData.auth_id!,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    role_id: userData.role_id,
    role_name: role?.name ?? "",
    menu_access: role?.menu_access ?? [],
    is_primary: userData.is_primary,
    is_active: userData.is_active,
  };
});
