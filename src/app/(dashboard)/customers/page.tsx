import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedLeads } from "@/lib/cached-queries";
import { CustomersClient } from "./_components/customers-client";

export const metadata = { title: "Customers — Yoonjaespace" };

export default async function CustomersPage() {
  const [currentUser, leads] = await Promise.all([
    getCurrentUser(),
    getCachedLeads(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <CustomersClient
      currentUser={currentUser}
      leads={(leads ?? []) as { id: string; name: string }[]}
    />
  );
}
