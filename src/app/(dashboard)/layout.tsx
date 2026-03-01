import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser uses React.cache() — result is deduplicated per request
  // so pages that also call getCurrentUser() won't trigger a second DB query
  const [currentUser, studioInfo] = await Promise.all([
    getCurrentUser(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("settings_studio_info")
        .select("logo_url, studio_name")
        .eq("lock", true)
        .maybeSingle();
      return data;
    })(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const logoUrl = studioInfo?.logo_url ?? null;
  const studioName = studioInfo?.studio_name ?? "Yoonjaespace";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={currentUser} logoUrl={logoUrl} studioName={studioName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={currentUser} logoUrl={logoUrl} studioName={studioName} />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
