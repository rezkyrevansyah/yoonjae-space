"use client";

import { TrendingUp, TrendingDown, DollarSign, CalendarCheck } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Props {
  totalIncome: number;
  totalExpense: number;
  grossProfit: number;
  bookingCount: number;
  loading: boolean;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  loading: boolean;
}

function SummaryCard({ label, value, sub, icon, iconBg, valueColor = "text-gray-900", loading }: CardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="mt-2 h-6 w-32 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <p className={`mt-1 text-base font-bold leading-tight break-all ${valueColor}`}>{value}</p>
          )}
          {sub && !loading && (
            <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
          )}
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ totalIncome, totalExpense, grossProfit, bookingCount, loading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryCard
        label="Total Income"
        value={formatRupiah(totalIncome)}
        sub={`${bookingCount} booking`}
        icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        iconBg="bg-green-50"
        valueColor="text-green-700"
        loading={loading}
      />
      <SummaryCard
        label="Total Expense"
        value={formatRupiah(totalExpense)}
        icon={<TrendingDown className="w-5 h-5 text-red-600" />}
        iconBg="bg-red-50"
        valueColor="text-red-600"
        loading={loading}
      />
      <SummaryCard
        label="Gross Profit"
        value={formatRupiah(grossProfit)}
        icon={<DollarSign className="w-5 h-5 text-[#8B1A1A]" />}
        iconBg="bg-[#FEF2F2]"
        valueColor={grossProfit >= 0 ? "text-[#8B1A1A]" : "text-red-600"}
        loading={loading}
      />
      <SummaryCard
        label="Income Booking"
        value={formatRupiah(totalIncome)}
        sub="dari booking terbayar"
        icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
        iconBg="bg-blue-50"
        valueColor="text-blue-700"
        loading={loading}
      />
    </div>
  );
}
