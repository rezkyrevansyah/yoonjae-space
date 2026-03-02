import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedReminderTemplates, getCachedStudioInfo } from "@/lib/cached-queries";
import { RemindersClient } from "./_components/reminders-client";

export const metadata = { title: "Reminders — Yoonjaespace" };

export default async function RemindersPage() {
  const [currentUser, templates, studioInfo] = await Promise.all([
    getCurrentUser(),
    getCachedReminderTemplates(),
    getCachedStudioInfo(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <RemindersClient
      currentUser={currentUser}
      templates={templates ?? { reminder_message: null, thank_you_message: null, thank_you_payment_message: null }}
      studioName={studioInfo?.studio_name ?? "Studio"}
    />
  );
}
