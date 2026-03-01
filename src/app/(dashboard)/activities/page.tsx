import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { ActivitiesClient } from "./_components/activities-client";

export const metadata = { title: "Activities — Yoonjaespace" };

export default async function ActivitiesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <ActivitiesClient />;
}
