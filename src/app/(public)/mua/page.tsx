import { createClient } from "@/utils/supabase/server";
import { MuaClient } from "./_components/mua-client";

export const metadata = { title: "MUA Schedule — Yoonjaespace" };

export default async function MuaPage() {
  const supabase = await createClient();

  const { data: studioInfo } = await supabase
    .from("settings_studio_info")
    .select("studio_name, logo_url")
    .eq("lock", true)
    .maybeSingle();

  return <MuaClient studioInfo={studioInfo} />;
}
