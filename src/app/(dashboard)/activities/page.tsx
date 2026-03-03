import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/utils/supabase/server";
import { ActivitiesClient } from "./_components/activities-client";

export const metadata = { title: "Activities — Yoonjaespace" };

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const [currentUser, initialResult] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("activity_log")
      .select("id, user_id, user_name, user_role, action, entity, entity_id, description, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 24),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <ActivitiesClient
      initialData={{
        logs: initialResult.data ?? [],
        total: initialResult.count ?? 0,
      }}
    />
  );
}
