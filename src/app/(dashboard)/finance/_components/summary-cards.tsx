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
  gradient: string;
  textColor: string;
  loading: boolean;
}

function SummaryCard({ label, value, sub, icon, gradient, textColor, loading }: CardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg ${gradient} border border-white/20`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30`}>
            {icon}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{label}</p>
          </div>
        </div>

        <div className="space-y-1">
          {loading ? (
            <div className="h-8 w-24 bg-white/30 rounded-lg animate-pulse" />
          ) : (
            <p className={`text-2xl font-bold text-white leading-none ${textColor}`}>
              {value}
            </p>
          )}
          {sub && !loading && (
            <p className="text-xs text-white/70 font-medium">{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ totalIncome, totalExpense, grossProfit, bookingCount, loading }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        label="Total Income"
        value={formatRupiah(totalIncome)}
        sub={`${bookingCount} booking`}
        icon={<TrendingUp className="w-6 h-6 text-green-600" />}
        gradient="bg-gradient-to-br from-green-500 to-green-600"
        textColor="text-white"
        loading={loading}
      />
      <SummaryCard
        label="Total Expense"
        value={formatRupiah(totalExpense)}
        icon={<TrendingDown className="w-6 h-6 text-red-500" />}
        gradient="bg-gradient-to-br from-red-500 to-red-600"
        textColor="text-white"
        loading={loading}
      />
      <SummaryCard
        label="Gross Profit"
        value={formatRupiah(grossProfit)}
        icon={<DollarSign className="w-6 h-6 text-yellow-600" />}
        gradient={grossProfit >= 0
          ? "bg-gradient-to-br from-yellow-500 to-orange-500"
          : "bg-gradient-to-br from-red-600 to-red-700"
        }
        textColor="text-white"
        loading={loading}
      />
      <SummaryCard
        label="Income Booking"
        value={formatRupiah(totalIncome)}
        sub="dari booking terbayar"
        icon={<CalendarCheck className="w-6 h-6 text-blue-600" />}
        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        textColor="text-white"
        loading={loading}
      />
    </div>
  );
}
