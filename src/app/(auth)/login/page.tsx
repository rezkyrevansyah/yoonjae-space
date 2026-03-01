import { createClient } from "@/utils/supabase/server";
import { LoginClient } from "./_components/login-client";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: studioInfo } = await supabase
    .from("settings_studio_info")
    .select("logo_url, studio_name")
    .eq("lock", true)
    .maybeSingle();

  return (
    <LoginClient
      logoUrl={studioInfo?.logo_url ?? null}
      studioName={studioInfo?.studio_name ?? "Yoonjaespace"}
    />
  );
}
