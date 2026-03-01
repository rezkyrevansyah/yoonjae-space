"use client";

import { usePathname } from "next/navigation";
import { MENU_ITEMS } from "@/lib/constants";
import { MobileNav } from "./mobile-nav";
import type { CurrentUser } from "@/lib/types/database";

interface HeaderProps {
  user: CurrentUser | null;
  logoUrl?: string | null;
  studioName?: string;
}

export function Header({ user, logoUrl, studioName }: HeaderProps) {
  const pathname = usePathname();

  const currentPage = MENU_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  const pageTitle = currentPage?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-white border-b border-border md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile nav trigger */}
        <MobileNav user={user} logoUrl={logoUrl} studioName={studioName} />
        <h1 className="font-semibold text-base">{pageTitle}</h1>
      </div>

      {/* User info on mobile */}
      {user && (
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-maroon-100 text-maroon-700 text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  );
}
