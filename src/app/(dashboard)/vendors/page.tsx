import { requireMenu } from "@/lib/require-menu";
import { createClient } from "@/utils/supabase/server";
import { VendorsClient, type VendorWithStats } from "./_components/vendors-client";

export const metadata = { title: "Vendors — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const supabase = await createClient();
  const [currentUser, vendorResult, expenseResult] = await Promise.all([
    requireMenu("vendors"),
    supabase
      .from("vendors")
      .select("id, name, category, phone, email, address, notes, is_active, created_at")
      .order("name"),
    supabase
      .from("expenses")
      .select("vendor_id, amount")
      .not("vendor_id", "is", null)
      .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 24)).toISOString().slice(0, 10)),
  ]);

  // Aggregate expenses by vendor server-side
  const statsMap = new Map<string, { count: number; total: number }>();
  for (const e of (expenseResult.data ?? [])) {
    if (!e.vendor_id) continue;
    const existing = statsMap.get(e.vendor_id);
    if (existing) {
      existing.count += 1;
      existing.total += e.amount;
    } else {
      statsMap.set(e.vendor_id, { count: 1, total: e.amount });
    }
  }

  const initialVendors: VendorWithStats[] = (vendorResult.data ?? []).map(v => ({
    ...v,
    expense_count: statsMap.get(v.id)?.count ?? 0,
    expense_total: statsMap.get(v.id)?.total ?? 0,
  }));

  return <VendorsClient currentUser={currentUser} initialVendors={initialVendors} />;
}
