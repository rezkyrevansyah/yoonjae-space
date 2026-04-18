import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedActiveVendors } from "@/lib/cached-queries";
import { createClient } from "@/utils/supabase/server";
import { FinanceClient, type IncomeBooking, type PackageStat } from "./_components/finance-client";
import type { Expense } from "@/lib/types/database";

export const metadata = { title: "Finance — Yoonjaespace" };
export const dynamic = "force-dynamic";

const PAID_STATUSES = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];

export default async function FinancePage() {
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [currentUser, vendors, bookingsResult, expensesResult] = await Promise.all([
    getCurrentUser(),
    getCachedActiveVendors(),
    supabase
      .from("bookings")
      .select("id, booking_number, booking_date, transaction_date, created_at, status, total, payment_method, payment_account_name, customers(name), packages(name)")
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .in("status", PAID_STATUSES)
      .order("created_at"),
    supabase
      .from("expenses")
      .select("id, date, description, amount, category, notes, source, source_id, vendor_id, vendors(id, name)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date"),
  ]);

  if (!currentUser) redirect("/login");

  const incomeBookings = (bookingsResult.data ?? []) as unknown as IncomeBooking[];
  const expenses = (expensesResult.data ?? []) as unknown as Expense[];

  // Compute package stats server-side
  const statsMap = new Map<string, PackageStat>();
  for (const b of incomeBookings) {
    const pkgName = b.packages?.name ?? "Unknown";
    const existing = statsMap.get(pkgName);
    if (existing) {
      existing.booking_count += 1;
      existing.revenue += b.total;
    } else {
      statsMap.set(pkgName, { package_id: pkgName, package_name: pkgName, booking_count: 1, revenue: b.total });
    }
  }
  const packageStats: PackageStat[] = Array.from(statsMap.values())
    .sort((a, b) => b.booking_count - a.booking_count)
    .slice(0, 5);

  return (
    <FinanceClient
      currentUser={currentUser}
      vendors={vendors ?? []}
      initialData={{ incomeBookings, expenses, packageStats, month, year }}
    />
  );
}
