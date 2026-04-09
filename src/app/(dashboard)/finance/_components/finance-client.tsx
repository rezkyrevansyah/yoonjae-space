"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { CurrentUser, Expense } from "@/lib/types/database";
import { SummaryCards } from "./summary-cards";
import { IncomeTable } from "./income-table";
import { ExpenseTable } from "./expense-table";
import { PopularPackages } from "./popular-packages";
import { ExpenseModal } from "./expense-modal";

interface Vendor {
  id: string;
  name: string;
}

export interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  customers: { name: string } | null;
  packages: { name: string } | null;
}

export interface PackageStat {
  package_id: string;
  package_name: string;
  booking_count: number;
  revenue: number;
}

interface Props {
  currentUser: CurrentUser;
  vendors: Vendor[];
  initialData: {
    incomeBookings: IncomeBooking[];
    expenses: Expense[];
    packageStats: PackageStat[];
    month: number;
    year: number;
  };
}

const supabase = createClient();

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PAID_STATUSES = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];

export function FinanceClient({ currentUser, vendors, initialData }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(initialData.month);
  const [selectedYear, setSelectedYear] = useState(initialData.year);

  const [incomeBookings, setIncomeBookings] = useState<IncomeBooking[]>(initialData.incomeBookings);
  const [expenses, setExpenses] = useState<Expense[]>(initialData.expenses);
  const [packageStats, setPackageStats] = useState<PackageStat[]>(initialData.packageStats);
  const [loading, setLoading] = useState(false);
  const [packageFilter, setPackageFilter] = useState<string>("");

  const isInitialMount = useRef(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Year options: current year ± 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [{ data: bookings }, { data: expenseData }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_number, booking_date, transaction_date, created_at, status, total, customers(name), packages(name)")
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

    setIncomeBookings((bookings ?? []) as unknown as IncomeBooking[]);
    setExpenses((expenseData ?? []) as unknown as Expense[]);

    // Package stats from the income bookings
    const statsMap = new Map<string, PackageStat>();
    for (const b of (bookings ?? [])) {
      const booking = b as unknown as IncomeBooking;
      const pkgName = booking.packages?.name ?? "Unknown";
      // Use package name as key since we don't have package_id directly
      const key = pkgName;
      const existing = statsMap.get(key);
      if (existing) {
        existing.booking_count += 1;
        existing.revenue += booking.total;
      } else {
        statsMap.set(key, {
          package_id: key,
          package_name: pkgName,
          booking_count: 1,
          revenue: booking.total,
        });
      }
    }
    const sorted = Array.from(statsMap.values())
      .sort((a, b) => b.booking_count - a.booking_count)
      .slice(0, 5);
    setPackageStats(sorted);

    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  // Unique packages for filter
  const packageOptions = Array.from(
    new Set(incomeBookings.map((b) => b.packages?.name).filter(Boolean))
  ) as string[];

  const filteredIncomeBookings = packageFilter
    ? incomeBookings.filter((b) => b.packages?.name === packageFilter)
    : incomeBookings;

  const totalIncome = filteredIncomeBookings.reduce((sum, b) => sum + b.total, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = totalIncome - totalExpense;

  function handleAddExpense() {
    setEditingExpense(null);
    setModalOpen(true);
  }

  function handleEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setModalOpen(true);
  }

  async function handleDeleteExpense(expense: Expense) {
    if (!confirm(`Hapus pengeluaran "${expense.description}"?`)) return;

    await supabase.from("expenses").delete().eq("id", expense.id);

    // Activity log
    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "DELETE",
      entity: "expenses",
      entity_id: expense.id,
      description: `Hapus pengeluaran: ${expense.description} (${formatRupiah(expense.amount)})`,
    });

    fetchData();
  }

  async function handleSaveExpense(data: {
    date: string;
    description: string;
    amount: number;
    category: string;
    vendor_id: string | null;
    notes: string;
  }) {
    if (editingExpense) {
      await supabase
        .from("expenses")
        .update({
          date: data.date,
          description: data.description,
          amount: data.amount,
          category: data.category || "",
          vendor_id: data.vendor_id,
          notes: data.notes || "",
        })
        .eq("id", editingExpense.id);

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "expenses",
        entity_id: editingExpense.id,
        description: `Edit pengeluaran: ${data.description} (${formatRupiah(data.amount)})`,
      });
    } else {
      const { data: inserted } = await supabase
        .from("expenses")
        .insert({
          date: data.date,
          description: data.description,
          amount: data.amount,
          category: data.category || "",
          vendor_id: data.vendor_id,
          notes: data.notes || "",
          source: "manual",
        })
        .select("id")
        .single();

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "expenses",
        entity_id: inserted?.id ?? null,
        description: `Tambah pengeluaran: ${data.description} (${formatRupiah(data.amount)})`,
      });
    }

    setModalOpen(false);
    fetchData();
  }

  async function handleExportExcel() {
    const XLSX = await import("xlsx");

    const periodLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

    // Summary sheet
    const summaryData = [
      ["Periode", periodLabel],
      ["Total Income", totalIncome],
      ["Total Expense", totalExpense],
      ["Gross Profit", grossProfit],
    ];

    // Income sheet
    const incomeRows = incomeBookings.map((b) => ({
      "Booking ID": b.booking_number,
      "Customer": b.customers?.name ?? "-",
      "Tanggal": formatDate(b.created_at),
      "Paket": b.packages?.name ?? "-",
      "Status": b.status,
      "Total": b.total,
    }));

    // Expense sheet
    const expenseRows = expenses.map((e) => ({
      "Tanggal": formatDate(e.date),
      "Deskripsi": e.description,
      "Kategori": e.category ?? "-",
      "Vendor": (e.vendors as { name: string } | null | undefined)?.name ?? "-",
      "Jumlah": e.amount,
      "Sumber": e.source === "commission" ? "Auto (Komisi)" : "Manual",
      "Catatan": e.notes ?? "",
    }));

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, "Income");

    const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsExpense, "Expenses");

    XLSX.writeFile(wb, `finance_${selectedYear}_${String(selectedMonth + 1).padStart(2, "0")}.xlsx`);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Laporan keuangan bulanan</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>

          {/* Year filter */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-sm font-medium border border-gray-200 rounded-xl px-3.5 py-2 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline text-gray-700">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Package filter */}
      {packageOptions.length > 0 && (
        <div className="flex items-center gap-2 -mt-1">
          <span className="text-xs text-gray-500">Filter paket:</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setPackageFilter("")}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                !packageFilter
                  ? "bg-maroon-700 text-white border-maroon-700"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              Semua
            </button>
            {packageOptions.map((pkg) => (
              <button
                key={pkg}
                onClick={() => setPackageFilter(pkg === packageFilter ? "" : pkg)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  packageFilter === pkg
                    ? "bg-maroon-700 text-white border-maroon-700"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {pkg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <SummaryCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        grossProfit={grossProfit}
        bookingCount={incomeBookings.length}
        loading={loading}
      />

      {/* Income from Bookings */}
      <IncomeTable bookings={filteredIncomeBookings} loading={loading} />

      {/* Expenses */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        onAdd={handleAddExpense}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />

      {/* Top 5 Popular Packages */}
      <PopularPackages stats={packageStats} loading={loading} />

      {/* Expense Modal */}
      <ExpenseModal
        open={modalOpen}
        expense={editingExpense}
        vendors={vendors}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveExpense}
      />
    </div>
  );
}
