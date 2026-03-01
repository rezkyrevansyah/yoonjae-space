"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Expense } from "@/lib/types/database";

interface Vendor {
  id: string;
  name: string;
}

interface ExpenseFormData {
  date: string;
  description: string;
  amount: number;
  category: string;
  vendor_id: string | null;
  notes: string;
}

interface Props {
  open: boolean;
  expense: Expense | null;
  vendors: Vendor[];
  onClose: () => void;
  onSave: (data: ExpenseFormData) => Promise<void>;
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ExpenseModal({ open, expense, vendors, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>({
    date: toLocalDateStr(new Date()),
    description: "",
    amount: 0,
    category: "",
    vendor_id: null,
    notes: "",
  });
  const [amountStr, setAmountStr] = useState("");

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setForm({
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        category: expense.category ?? "",
        vendor_id: expense.vendor_id ?? null,
        notes: expense.notes ?? "",
      });
      setAmountStr(String(expense.amount));
    } else {
      setForm({
        date: toLocalDateStr(new Date()),
        description: "",
        amount: 0,
        category: "",
        vendor_id: null,
        notes: "",
      });
      setAmountStr("");
    }
  }, [open, expense]);

  function handleAmountChange(val: string) {
    const cleaned = val.replace(/\D/g, "");
    setAmountStr(cleaned);
    setForm(f => ({ ...f, amount: Number(cleaned) || 0 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.amount <= 0) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {expense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Deskripsi
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Contoh: Beli kertas foto, listrik, dll"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Jumlah (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0"
                required
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
              />
            </div>
            {form.amount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(form.amount)}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Kategori
            </label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Contoh: Operasional, Peralatan, dll"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Vendor <span className="text-gray-400">(opsional)</span>
            </label>
            <select
              value={form.vendor_id ?? ""}
              onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value || null }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
            >
              <option value="">— Tidak ada vendor —</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Catatan
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Catatan tambahan..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || form.amount <= 0}
              className="flex-1 bg-[#8B1A1A] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-[#B22222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
