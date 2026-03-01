"use client";

import { X, Phone, Mail, MapPin, FileText, Tag, Pencil } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface VendorWithStats {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  expense_count: number;
  expense_total: number;
}

interface Props {
  vendor: VendorWithStats | null;
  onClose: () => void;
  onEdit: () => void;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function VendorDetailModal({ vendor, onClose, onEdit }: Props) {
  if (!vendor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">{vendor.name}</h2>
                {!vendor.is_active && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Nonaktif</span>
                )}
              </div>
              {vendor.category && (
                <span className="inline-block mt-1 text-xs text-[#8B1A1A] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                  {vendor.category}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FEF2F2] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-[#8B1A1A]">{vendor.expense_count}x</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Transaksi</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-green-700 truncate">{formatRupiah(vendor.expense_total)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Nilai</p>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            {vendor.phone && (
              <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="Phone" value={vendor.phone} />
            )}
            {vendor.email && (
              <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="Email" value={vendor.email} />
            )}
            {vendor.address && (
              <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="Alamat" value={vendor.address} />
            )}
            {vendor.category && (
              <InfoRow icon={<Tag className="w-4 h-4 text-gray-400" />} label="Kategori" value={vendor.category} />
            )}
            {vendor.notes && (
              <InfoRow icon={<FileText className="w-4 h-4 text-gray-400" />} label="Catatan" value={vendor.notes} />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 bg-[#8B1A1A] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-[#B22222] transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
