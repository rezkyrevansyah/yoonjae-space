"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toDateStr } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CreditCard, Calendar, Banknote, Smartphone, Coins } from "lucide-react";

export interface PaymentFormData {
  transaction_date: string;
  payment_method: string;
  payment_account_name: string;
}

const PAYMENT_METHODS = [
  { value: "transfer", label: "Transfer", icon: Banknote },
  { value: "tunai", label: "Tunai", icon: Coins },
  { value: "qris", label: "QRIS", icon: Smartphone },
];

interface Props {
  data: PaymentFormData;
  onChange: (data: PaymentFormData) => void;
}

export function StepPayment({ data, onChange }: Props) {
  const todayStr = toDateStr(new Date());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Pembayaran</h2>
        <p className="text-sm text-gray-500">Informasi transaksi (opsional — isi jika ada pembayaran)</p>
      </div>

      {/* Tanggal Transaksi */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar className="h-4 w-4 text-maroon-700" />
          Tanggal Transaksi
        </Label>
        <Input
          type="date"
          value={data.transaction_date}
          max={todayStr}
          onChange={(e) => onChange({ ...data, transaction_date: e.target.value })}
        />
        <p className="text-xs text-gray-400">
          Biarkan kosong jika belum ada transaksi. Isi jika transaksi terjadi sebelum hari ini.
        </p>
      </div>

      {/* Metode Pembayaran */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <CreditCard className="h-4 w-4 text-maroon-700" />
          Metode Pembayaran
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const isSelected = data.payment_method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onChange({ ...data, payment_method: isSelected ? "" : m.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-maroon-50 border-maroon-300 text-maroon-800"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <m.icon className={cn("h-5 w-5", isSelected ? "text-maroon-700" : "text-gray-400")} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nama Rekening / Akun Transfer */}
      {data.payment_method === "transfer" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Nama Rekening / Akun Transfer</Label>
          <Input
            value={data.payment_account_name}
            onChange={(e) => onChange({ ...data, payment_account_name: e.target.value })}
            placeholder="Contoh: BCA a.n. John Doe"
          />
          <p className="text-xs text-gray-400">
            Untuk cross-check dengan mutasi rekening
          </p>
        </div>
      )}
    </div>
  );
}
