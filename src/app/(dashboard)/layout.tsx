import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedStudioInfo } from "@/lib/cached-queries";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser uses React.cache() — deduplicated per request
  // getCachedStudioInfo uses unstable_cache — shared across requests (TTL 1hr)
  const [currentUser, studioInfo] = await Promise.all([
    getCurrentUser(),
    getCachedStudioInfo(),
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
