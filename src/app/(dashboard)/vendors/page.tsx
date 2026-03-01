import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { VendorsClient } from "./_components/vendors-client";

export const metadata = { title: "Vendors — Yoonjaespace" };

export default async function VendorsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <VendorsClient currentUser={currentUser} />;
}
