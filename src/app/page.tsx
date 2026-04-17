import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { MENU_ITEMS } from "@/lib/constants";

export default async function RootPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.menu_access.includes("dashboard")) {
    redirect("/dashboard");
  }

  const firstSlug = currentUser.menu_access[0];
  const firstItem = firstSlug ? MENU_ITEMS.find((m) => m.slug === firstSlug) : undefined;
  redirect(firstItem?.href ?? "/login");
}
