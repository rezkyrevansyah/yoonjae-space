"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import type { CurrentUser } from "@/lib/types/database";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("id, auth_id, name, email, phone, role_id, is_primary, is_active, roles(name, menu_access)")
          .eq("auth_id", authUser.id)
          .single();

        if (userData) {
          const rolesData = userData.roles as unknown;
          const role = (Array.isArray(rolesData) ? rolesData[0] : rolesData) as { name: string; menu_access: string[] } | null;
          setUser({
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
          });
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
