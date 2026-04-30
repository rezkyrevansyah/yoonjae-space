import { redirect } from "next/navigation";
import { getCurrentUser } from "./get-current-user";
import { MENU_ITEMS } from "./constants";
import type { CurrentUser } from "./types/database";

/**
 * Gate a Server Component on authentication AND a specific menu slug.
 *
 * Behaviour:
 *   - Not logged in → redirect to /login
 *   - is_primary → always allowed (owner bypass)
 *   - menu_access includes slug → allowed
 *   - otherwise → redirect to first allowed menu, or /login if none
 *
 * Returns a non-null CurrentUser so the caller doesn't need its own null-check.
 *
 * Usage:
 *   const currentUser = await requireMenu("settings");
 */
export async function requireMenu(slug: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.is_primary || user.menu_access.includes(slug)) {
    return user;
  }

  const firstSlug = user.menu_access[0];
  const firstItem = firstSlug ? MENU_ITEMS.find((m) => m.slug === firstSlug) : undefined;
  redirect(firstItem?.href ?? "/login");
}
