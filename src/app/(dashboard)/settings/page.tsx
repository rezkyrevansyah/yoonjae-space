import { requireMenu } from "@/lib/require-menu";
import { SettingsClient } from "./_components/settings-client";

export const metadata = { title: "Settings — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireMenu("settings");

  return <SettingsClient currentUser={currentUser} />;
}
