import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedActiveUsers } from "@/lib/cached-queries";
import { CommissionsClient } from "./_components/commissions-client";

export const metadata = { title: "Commissions — Yoonjaespace" };

export default async function CommissionsPage() {
  const [currentUser, staffUsers] = await Promise.all([
    getCurrentUser(),
    getCachedActiveUsers(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <CommissionsClient
      currentUser={currentUser}
      staffUsers={staffUsers ?? []}
    />
  );
}
