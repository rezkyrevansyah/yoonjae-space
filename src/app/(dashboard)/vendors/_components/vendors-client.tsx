"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Store, Phone, MapPin, Receipt, DollarSign, Pencil, Trash2, Eye } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatRupiah } from "@/lib/utils";
import type { CurrentUser } from "@/lib/types/database";
import { invalidateActiveVendors } from "@/lib/cache-invalidation";
import { VendorModal } from "./vendor-modal";
import { VendorDetailModal } from "./vendor-detail-modal";

export interface VendorWithStats {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  expense_count: number;
  expense_total: number;
}

interface Props {
  currentUser: CurrentUser;
  initialVendors: VendorWithStats[];
}

const supabase = createClient();

export function VendorsClient({ currentUser, initialVendors }: Props) {
  const isInitialMount = useRef(true);
  const [vendors, setVendors] = useState<VendorWithStats[]>(initialVendors);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorWithStats | null>(null);
  const [detailVendor, setDetailVendor] = useState<VendorWithStats | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);

    const { data: vendorData } = await supabase
      .from("vendors")
      .select("id, name, category, phone, email, address, notes, is_active, created_at")
      .order("name");

    if (!vendorData) { setLoading(false); return; }

    // Fetch expense aggregates per vendor (only expenses linked to a vendor)
    const { data: expenseData } = await supabase
      .from("expenses")
      .select("vendor_id, amount")
      .not("vendor_id", "is", null);

    const statsMap = new Map<string, { count: number; total: number }>();
    for (const e of (expenseData ?? [])) {
      if (!e.vendor_id) continue;
      const existing = statsMap.get(e.vendor_id);
      if (existing) {
        existing.count += 1;
        existing.total += e.amount;
      } else {
        statsMap.set(e.vendor_id, { count: 1, total: e.amount });
      }
    }

    const withStats: VendorWithStats[] = vendorData.map(v => ({
      ...v,
      expense_count: statsMap.get(v.id)?.count ?? 0,
      expense_total: statsMap.get(v.id)?.total ?? 0,
    }));

    setVendors(withStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchVendors();
  }, [fetchVendors]);

  function handleAdd() {
    setEditingVendor(null);
    setModalOpen(true);
  }

  function handleEdit(v: VendorWithStats) {
    setEditingVendor(v);
    setDetailVendor(null);
    setModalOpen(true);
  }

  async function handleDelete(v: VendorWithStats) {
    if (!confirm(`Hapus vendor "${v.name}"? Riwayat pengeluaran yang terkait tidak akan terhapus.`)) return;

    await supabase.from("vendors").delete().eq("id", v.id);
    await invalidateActiveVendors();
    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "DELETE",
      entity: "vendors",
      entity_id: v.id,
      description: `Hapus vendor: ${v.name}`,
    });
    fetchVendors();
  }

  async function handleSave(data: {
    name: string;
    category: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    is_active: boolean;
  }) {
    if (editingVendor) {
      await supabase.from("vendors").update({
        name: data.name,
        category: data.category || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        notes: data.notes || "",
        is_active: data.is_active,
      }).eq("id", editingVendor.id);

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "vendors",
        entity_id: editingVendor.id,
        description: `Edit vendor: ${data.name}`,
      });
    } else {
      const { data: inserted } = await supabase.from("vendors").insert({
        name: data.name,
        category: data.category || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        notes: data.notes || "",
        is_active: data.is_active,
      }).select("id").single();

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "vendors",
        entity_id: inserted?.id ?? null,
        description: `Tambah vendor baru: ${data.name}`,
      });
    }

    await invalidateActiveVendors();
    setModalOpen(false);
    fetchVendors();
  }

  const activeVendors = vendors.filter(v => v.is_active);
  const inactiveVendors = vendors.filter(v => !v.is_active);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500">Kelola vendor & supplier</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-[#8B1A1A] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#B22222] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Vendor</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Store className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Belum ada vendor. Tambah vendor pertama!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active vendors */}
          {activeVendors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Aktif ({activeVendors.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeVendors.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    onDetail={() => setDetailVendor(v)}
                    onEdit={() => handleEdit(v)}
                    onDelete={() => handleDelete(v)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive vendors */}
          {inactiveVendors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Tidak Aktif ({inactiveVendors.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactiveVendors.map(v => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    inactive
                    onDetail={() => setDetailVendor(v)}
                    onEdit={() => handleEdit(v)}
                    onDelete={() => handleDelete(v)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <VendorModal
        open={modalOpen}
        vendor={editingVendor}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <VendorDetailModal
        vendor={detailVendor}
        onClose={() => setDetailVendor(null)}
        onEdit={() => { if (detailVendor) handleEdit(detailVendor); }}
      />
    </div>
  );
}

// ── Vendor Card ──────────────────────────────────────────────

interface CardProps {
  vendor: VendorWithStats;
  inactive?: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VendorCard({ vendor: v, inactive, onDetail, onEdit, onDelete }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${inactive ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
      {/* Top color bar */}
      <div className={`h-1 ${inactive ? "bg-gray-200" : "bg-[#8B1A1A]"}`} />

      <div className="p-4">
        {/* Name + category */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">{v.name}</h3>
            {v.category && (
              <span className="inline-block mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {v.category}
              </span>
            )}
          </div>
          {inactive && (
            <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Nonaktif
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 mb-4">
          {v.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{v.phone}</span>
            </div>
          )}
          {v.address && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{v.address}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Receipt className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Transaksi</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{v.expense_count}x</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <DollarSign className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">{formatRupiah(v.expense_total)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onDetail}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detail
          </button>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-100 bg-blue-50 rounded-lg py-2 hover:bg-blue-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center p-2 text-red-400 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
