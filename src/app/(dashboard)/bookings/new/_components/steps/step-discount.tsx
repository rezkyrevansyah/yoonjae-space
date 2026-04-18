"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatRupiah } from "@/lib/utils";
import type { DiscountFormData } from "./new-booking-client";
import { Tag, Percent, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  discountData: DiscountFormData;
  onChange: (data: DiscountFormData) => void;
  subtotal: number;
}

type VoucherStatus = "idle" | "checking" | "valid" | "invalid";

export function StepDiscount({ discountData, onChange, subtotal }: Props) {
  const supabase = createClient();
  const [voucherInput, setVoucherInput] = useState(discountData.voucher_code);
  const [voucherStatus, setVoucherStatus] = useState<VoucherStatus>(
    discountData.voucher_id ? "valid" : "idle"
  );
  const [voucherError, setVoucherError] = useState("");

  async function checkVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherStatus("checking");
    setVoucherError("");

    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    const { data: voucher } = await supabase
      .from("vouchers")
      .select("id, code, discount_type, discount_value, valid_from, valid_until, minimum_purchase, is_active")
      .eq("code", voucherInput.trim().toUpperCase())
      .maybeSingle();

    if (!voucher) {
      setVoucherStatus("invalid");
      setVoucherError("Kode voucher tidak ditemukan");
      return;
    }
    if (!voucher.is_active) {
      setVoucherStatus("invalid");
      setVoucherError("Voucher tidak aktif");
      return;
    }
    if (voucher.valid_from && today < voucher.valid_from) {
      setVoucherStatus("invalid");
      setVoucherError("Voucher belum berlaku");
      return;
    }
    if (voucher.valid_until && today > voucher.valid_until) {
      setVoucherStatus("invalid");
      setVoucherError("Voucher sudah kadaluarsa");
      return;
    }
    if (subtotal < voucher.minimum_purchase) {
      setVoucherStatus("invalid");
      setVoucherError(`Minimum pembelian ${formatRupiah(voucher.minimum_purchase)}`);
      return;
    }

    setVoucherStatus("valid");
    onChange({
      ...discountData,
      discount_type: "voucher",
      voucher_code: voucher.code,
      voucher_id: voucher.id,
      voucher_discount_type: voucher.discount_type as "percentage" | "fixed",
      voucher_discount_value: voucher.discount_value,
      manual_discount: 0,
    });
  }

  function clearVoucher() {
    setVoucherInput("");
    setVoucherStatus("idle");
    setVoucherError("");
    onChange({
      ...discountData,
      discount_type: "none",
      voucher_code: "",
      voucher_id: "",
      voucher_discount_value: 0,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Diskon</h2>
        <p className="text-sm text-gray-500">Gunakan voucher ATAU diskon manual (pilih salah satu)</p>
      </div>

      {/* Voucher */}
      <div className={cn(
        "rounded-lg border p-4 space-y-3 transition-opacity",
        discountData.discount_type === "manual" ? "opacity-40 pointer-events-none" : ""
      )}>
        <div className="flex items-center gap-2 font-medium text-gray-800">
          <Tag className="h-4 w-4 text-maroon-700" />
          Kode Voucher
        </div>

        {discountData.discount_type !== "voucher" ? (
          <div className="flex gap-2">
            <Input
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              placeholder="CONTOH2024"
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && checkVoucher()}
            />
            <Button
              variant="outline"
              onClick={checkVoucher}
              disabled={voucherStatus === "checking" || !voucherInput.trim()}
            >
              {voucherStatus === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : "Cek"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-mono font-medium text-green-800">{discountData.voucher_code}</p>
                <p className="text-xs text-green-600">
                  Diskon:{" "}
                  {discountData.voucher_discount_type === "percentage"
                    ? `${discountData.voucher_discount_value}%`
                    : formatRupiah(discountData.voucher_discount_value)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearVoucher} className="text-green-700">
              Hapus
            </Button>
          </div>
        )}

        {voucherStatus === "invalid" && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            {voucherError}
          </div>
        )}
      </div>

      {/* Manual discount */}
      <div className={cn(
        "rounded-lg border p-4 space-y-3 transition-opacity",
        discountData.discount_type === "voucher" ? "opacity-40 pointer-events-none" : ""
      )}>
        <div className="flex items-center gap-2 font-medium text-gray-800">
          <Percent className="h-4 w-4 text-maroon-700" />
          Diskon Manual (Rp)
        </div>
        <Input
          type="number"
          min={0}
          value={discountData.manual_discount || ""}
          onChange={(e) => {
            const val = Number(e.target.value);
            onChange({
              ...discountData,
              discount_type: val > 0 ? "manual" : "none",
              manual_discount: val,
              voucher_code: "",
              voucher_id: "",
              voucher_discount_value: 0,
            });
          }}
          placeholder="0"
        />
      </div>

      {discountData.discount_type === "none" && (
        <p className="text-sm text-gray-400 text-center">Tidak ada diskon</p>
      )}
    </div>
  );
}
