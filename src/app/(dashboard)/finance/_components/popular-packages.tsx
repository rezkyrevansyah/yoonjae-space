"use client";

import { Trophy } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface PackageStat {
  package_id: string;
  package_name: string;
  booking_count: number;
  revenue: number;
}

interface Props {
  stats: PackageStat[];
  loading: boolean;
}

const RANK_COLORS = [
  { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", bar: "bg-yellow-400" },
  { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",   bar: "bg-gray-400" },
  { bg: "bg-orange-50", text: "text-orange-600",  border: "border-orange-200", bar: "bg-orange-400" },
  { bg: "bg-blue-50",   text: "text-blue-600",    border: "border-blue-200",   bar: "bg-blue-400" },
  { bg: "bg-green-50",  text: "text-green-600",   border: "border-green-200",  bar: "bg-green-400" },
];

export function PopularPackages({ stats, loading }: Props) {
  const maxCount = stats.length > 0 ? Math.max(...stats.map(s => s.booking_count)) : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h2 className="text-sm font-semibold text-gray-900">Top 5 Paket Populer</h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">Belum ada data booking bulan ini</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {stats.map((stat, idx) => {
            const color = RANK_COLORS[idx] ?? RANK_COLORS[4];
            const pct = Math.round((stat.booking_count / maxCount) * 100);
            return (
              <div
                key={stat.package_id}
                className={`rounded-xl border p-3.5 ${color.bg} ${color.border}`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
                      {idx + 1}
                    </span>
                    <p className={`text-sm font-semibold truncate ${color.text}`}>
                      {stat.package_name}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-sm font-bold ${color.text}`}>
                      {stat.booking_count}x
                    </p>
                    <p className="text-xs text-gray-500">{formatRupiah(stat.revenue)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
