import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { SettingsClient } from "./_components/settings-client";

export const metadata = { title: "Settings — Yoonjaespace" };

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <SettingsClient currentUser={currentUser} />;
}
