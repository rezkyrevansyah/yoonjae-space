import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedSettingsGeneral } from "@/lib/cached-queries";
import { CalendarClient } from "./_components/calendar-client";

export const metadata = { title: "Calendar — Yoonjaespace" };

export default async function CalendarPage() {
  const [currentUser, settings] = await Promise.all([
    getCurrentUser(),
    getCachedSettingsGeneral(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <CalendarClient
      currentUser={currentUser}
      openTime={settings?.open_time ?? "09:00"}
      closeTime={settings?.close_time ?? "21:00"}
    />
  );
}
