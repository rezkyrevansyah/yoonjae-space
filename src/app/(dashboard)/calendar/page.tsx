import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { CalendarClient } from "./_components/calendar-client";

export const metadata = { title: "Calendar — Yoonjaespace" };

export default async function CalendarPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const { data: settings } = await supabase
    .from("settings_general")
    .select("open_time, close_time")
    .eq("lock", true)
    .maybeSingle();

  return (
    <CalendarClient
      currentUser={currentUser}
      openTime={settings?.open_time ?? "09:00"}
      closeTime={settings?.close_time ?? "21:00"}
    />
  );
}
