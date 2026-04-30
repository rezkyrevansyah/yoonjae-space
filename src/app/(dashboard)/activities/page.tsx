import { requireMenu } from "@/lib/require-menu";
import { createClient } from "@/utils/supabase/server";
import { ActivitiesClient } from "./_components/activities-client";

export const metadata = { title: "Activities — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const [, initialResult] = await Promise.all([
    requireMenu("activities"),
    supabase
      .from("activity_log")
      .select("id, user_id, user_name, user_role, action, entity, entity_id, description, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 24),
  ]);

  return (
    <ActivitiesClient
      initialData={{
        logs: initialResult.data ?? [],
        total: initialResult.count ?? 0,
      }}
    />
  );
}
