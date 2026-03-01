"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MENU_ITEMS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/types/database";
import {
  LayoutDashboard, CalendarCheck, Calendar, Users, Bell,
  TrendingUp, Store, Percent, Activity, UserCog, Shield,
  Settings, LogOut, Camera, Menu,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CalendarCheck, Calendar, Users, Bell,
  TrendingUp, Store, Percent, Activity, UserCog, Shield, Settings,
};

interface MobileNavProps {
  user: CurrentUser | null;
  logoUrl?: string | null;
  studioName?: string;
}

function StudioLogo({ logoUrl, studioName }: { logoUrl?: string | null; studioName?: string }) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <Image
        src={logoUrl}
        alt={studioName ?? "Studio"}
        width={36}
        height={36}
        className="rounded-lg object-cover w-9 h-9 shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-maroon-700 shrink-0">
      <Camera className="h-5 w-5 text-white" />
    </div>
  );
}

export function MobileNav({ user, logoUrl, studioName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const visibleMenus = user?.menu_access
    ? MENU_ITEMS.filter((item) => user.menu_access.includes(item.slug))
    : MENU_ITEMS;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="flex-row items-center gap-3 px-6 py-5 border-b border-border space-y-0">
            <StudioLogo logoUrl={logoUrl} studioName={studioName} />
            <div>
              <SheetTitle className="text-sm text-maroon-700 leading-tight">
                {studioName ?? "Yoonjaespace"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">Studio Management</p>
            </div>
          </SheetHeader>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {visibleMenus.map((item) => {
              const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.slug}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-maroon-50 text-maroon-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-maroon-700" : "text-gray-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-maroon-100 text-maroon-700 text-sm font-semibold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.role_name}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-gray-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
