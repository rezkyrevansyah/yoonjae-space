"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Receipt } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatRupiah, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";

type IncomeSortField = "created_at" | "total";

const PREVIEW_SIZE = 5;
const PAGE_SIZE = 10;

interface IncomeBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  transaction_date: string | null;
  created_at: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_account_name: string | null;
  customers: { name: string } | null;
  packages: { name: string } | null;
}

interface Props {
  bookings: IncomeBooking[];
  loading: boolean;
}

export function IncomeTable({ bookings, loading }: Props) {
  const [sortField, setSortField] = useState<IncomeSortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);

  const q = searchQuery.toLowerCase().trim();
  const filteredBookings = q
    ? bookings.filter(
        (b) =>
          b.booking_number.toLowerCase().includes(q) ||
          (b.customers?.name ?? "").toLowerCase().includes(q)
      )
    : bookings;

  const total = filteredBookings.reduce((sum, b) => sum + b.total, 0);

  const sorted = [...filteredBookings].sort((a, b) => {
    if (sortField === "created_at") {
      return sortAsc
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    }
    return sortAsc ? a.total - b.total : b.total - a.total;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = expanded
    ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : sorted.slice(0, PREVIEW_SIZE);
  const hiddenCount = sorted.length - PREVIEW_SIZE;

  function handleSort(field: IncomeSortField) {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(false); }
    setPage(0);
  }

  function SortIcon({ field }: { field: IncomeSortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center justify-between flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Income dari Booking</h2>
          <span className="text-xs text-gray-500">
            {searchQuery ? `${filteredBookings.length} / ${bookings.length}` : `${bookings.length}`} booking
          </span>
        </div>
        <div className="relative sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Cari customer / booking..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8B1A1A] focus:border-[#8B1A1A]"
          />
        </div>
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
                  <th className="px-4 py-2 text-left font-medium">Booking ID</th>
                  <th className="px-4 py-2 text-left font-medium">Customer</th>
                  <th
                    className="px-4 py-2 text-left font-medium cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort("created_at")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tanggal
                      <SortIcon field="created_at" />
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Paket</th>
                  <th className="px-4 py-2 text-left font-medium">Pembayaran</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th
                    className="px-4 py-2 text-right font-medium cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort("total")}
                  >
                    <span className="inline-flex items-center justify-end gap-1 w-full">
                      Total
                      <SortIcon field="total" />
                    </span>
                  </th>
                  <th className="px-4 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                      {b.booking_number}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {b.customers?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {formatDate(b.transaction_date ?? b.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {b.packages?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {b.payment_method ? (
                        <div>
                          <span className="capitalize text-xs font-medium">{b.payment_method}</span>
                          {b.payment_account_name && (
                            <p className="text-xs text-gray-400 mt-0.5">{b.payment_account_name}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus] ?? ""}`}>
                        {BOOKING_STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {formatRupiah(b.total)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setInvoiceBookingId(b.id)}
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/bookings/${b.id}`}
                          target="_blank"
                          className="text-gray-400 hover:text-[#8B1A1A] transition-colors"
                          title="Lihat Detail Booking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-2.5 text-sm font-semibold text-gray-700">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-green-700">
                    {formatRupiah(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {paginated.map((b) => (
              <div key={b.id} className="relative">
                <Link
                  href={`/bookings/${b.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {b.customers?.name ?? "-"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {b.booking_number} · {formatDate(b.transaction_date ?? b.created_at)}
                      </p>
                      <p className="text-xs text-gray-500">{b.packages?.name ?? "-"}</p>
                      {b.payment_method && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="capitalize">{b.payment_method}</span>
                          {b.payment_account_name && ` · ${b.payment_account_name}`}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatRupiah(b.total)}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus] ?? ""}`}>
                        {BOOKING_STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setInvoiceBookingId(b.id); }}
                  className="absolute top-3 right-4 text-gray-300 hover:text-[#8B1A1A] transition-colors"
                  title="Lihat Invoice"
                >
                  <Receipt className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-green-700">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Show more / pagination */}
          {!expanded && hiddenCount > 0 ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full px-4 py-3 border-t border-gray-100 text-xs text-center text-[#8B1A1A] font-medium hover:bg-gray-50 transition-colors"
            >
              Tampilkan {hiddenCount} lainnya ↓
            </button>
          ) : expanded && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} dari {sorted.length}
                </p>
                <button
                  onClick={() => { setExpanded(false); setPage(0); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Sembunyikan
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-xs font-medium text-gray-600">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invoice preview modal */}
      {invoiceBookingId && (
        <Dialog open onOpenChange={(open) => { if (!open) setInvoiceBookingId(null); }}>
          <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden">
            <iframe
              src={`/invoice/${invoiceBookingId}`}
              className="w-full h-full border-0"
              title="Invoice Preview"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
