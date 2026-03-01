"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";

interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  status: string;
  total: number;
  customers: { name: string } | null;
  packages: { name: string } | null;
}

interface Props {
  bookings: IncomeBooking[];
  loading: boolean;
}

export function IncomeTable({ bookings, loading }: Props) {
  const total = bookings.reduce((sum, b) => sum + b.total, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Income dari Booking</h2>
        <span className="text-xs text-gray-500">{bookings.length} booking</span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">Tidak ada booking bulan ini</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left font-medium">Booking ID</th>
                  <th className="px-4 py-2.5 text-left font-medium">Customer</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 text-left font-medium">Paket</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {b.booking_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {b.customers?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(b.booking_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.packages?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus] ?? ""}`}>
                        {BOOKING_STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatRupiah(b.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        target="_blank"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#8B1A1A]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                    {formatRupiah(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {b.customers?.name ?? "-"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.booking_number} · {formatDate(b.booking_date)}
                    </p>
                    <p className="text-xs text-gray-500">{b.packages?.name ?? "-"}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{formatRupiah(b.total)}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus] ?? ""}`}>
                      {BOOKING_STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-green-700">{formatRupiah(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
