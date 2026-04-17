"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Bot, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { Expense } from "@/lib/types/database";

type ExpenseSortField = "date" | "amount";

const PREVIEW_SIZE = 5;
const PAGE_SIZE = 10;

interface Props {
  expenses: Expense[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseTable({ expenses, loading, onAdd, onEdit, onDelete }: Props) {
  const [sortField, setSortField] = useState<ExpenseSortField>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const sorted = [...expenses].sort((a, b) => {
    if (sortField === "date") {
      return sortAsc
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    }
    return sortAsc ? a.amount - b.amount : b.amount - a.amount;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = expanded
    ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : sorted.slice(0, PREVIEW_SIZE);
  const hiddenCount = sorted.length - PREVIEW_SIZE;

  function handleSort(field: ExpenseSortField) {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(false); }
    setPage(0);
  }

  function SortIcon({ field }: { field: ExpenseSortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Pengeluaran</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-medium bg-[#8B1A1A] text-white px-3 py-1.5 rounded-lg hover:bg-[#B22222] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah
        </button>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">Belum ada pengeluaran bulan ini</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th
                    className="px-4 py-2 text-left font-medium cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tanggal
                      <SortIcon field="date" />
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Deskripsi</th>
                  <th className="px-4 py-2 text-left font-medium">Kategori</th>
                  <th className="px-4 py-2 text-left font-medium">Vendor</th>
                  <th
                    className="px-4 py-2 text-right font-medium cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort("amount")}
                  >
                    <span className="inline-flex items-center justify-end gap-1 w-full">
                      Jumlah
                      <SortIcon field="amount" />
                    </span>
                  </th>
                  <th className="px-4 py-2 w-20 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((e) => {
                  const isAuto = e.source === "commission";
                  const vendor = e.vendors as { name: string } | null | undefined;
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{e.description}</span>
                          {isAuto && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100">
                              <Bot className="w-3 h-3" />
                              Auto
                            </span>
                          )}
                        </div>
                        {e.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{e.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {e.category ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {vendor?.name ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {formatRupiah(e.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEdit(e)}
                            disabled={isAuto}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isAuto ? "Auto-generated, tidak bisa diedit" : "Edit"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(e)}
                            disabled={isAuto}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isAuto ? "Auto-generated, tidak bisa dihapus" : "Hapus"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                    {formatRupiah(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {paginated.map((e) => {
              const isAuto = e.source === "commission";
              const vendor = e.vendors as { name: string } | null | undefined;
              return (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{e.description}</p>
                        {isAuto && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100">
                            <Bot className="w-3 h-3" />
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(e.date)}
                        {e.category && ` · ${e.category}`}
                        {vendor?.name && ` · ${vendor.name}`}
                      </p>
                      {e.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{e.notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{formatRupiah(e.amount)}</span>
                      {!isAuto && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEdit(e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="px-4 py-3 bg-gray-50 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-red-600">{formatRupiah(total)}</span>
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
    </div>
  );
}
