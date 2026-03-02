import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedActiveVendors } from "@/lib/cached-queries";
import { FinanceClient } from "./_components/finance-client";

export const metadata = { title: "Finance — Yoonjaespace" };

export default async function FinancePage() {
  const [currentUser, vendors] = await Promise.all([
    getCurrentUser(),
    getCachedActiveVendors(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <FinanceClient
      currentUser={currentUser}
      vendors={vendors ?? []}
    />
  );
}
