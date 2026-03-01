import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { RemindersClient } from "./_components/reminders-client";

export const metadata = { title: "Reminders — Yoonjaespace" };

export default async function RemindersPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  const [{ data: templates }, { data: studioInfo }] = await Promise.all([
    supabase
      .from("settings_reminder_templates")
      .select("reminder_message, thank_you_message, thank_you_payment_message")
      .eq("lock", true)
      .maybeSingle(),
    supabase
      .from("settings_studio_info")
      .select("studio_name, whatsapp_number")
      .eq("lock", true)
      .maybeSingle(),
  ]);

  return (
    <RemindersClient
      currentUser={currentUser}
      templates={templates ?? { reminder_message: null, thank_you_message: null, thank_you_payment_message: null }}
      studioName={studioInfo?.studio_name ?? "Studio"}
    />
  );
}
