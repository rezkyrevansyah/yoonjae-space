"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah, formatDate, formatTime } from "@/lib/utils";
import type {
  CustomerFormData,
  SessionFormData,
  DetailFormData,
  DiscountFormData,
  StaffFormData,
  CustomFieldValues,
} from "./new-booking-client";
import type { Package, Addon, Background, PhotoFor, CustomField } from "@/lib/types/database";
import { User, Calendar, Package as PackageIcon, Tag, UserCheck, CreditCard } from "lucide-react";

interface SelectedPackageItem {
  package: Package;
  quantity: number;
}

interface SelectedAddonItem {
  addon: Addon;
  quantity: number;
}

interface Props {
  customerData: CustomerFormData;
  sessionData: SessionFormData;
  detailData: DetailFormData;
  discountData: DiscountFormData;
  staffData: StaffFormData;
  selectedPackages: SelectedPackageItem[];
  selectedAddons: SelectedAddonItem[];
  backgrounds: Background[];
  photoFors: PhotoFor[];
  users: { id: string; name: string }[];
  pricing: {
    packagesTotal: number;
    addonsTotal: number;
    subtotal: number;
    discount: number;
    total: number;
  };
  endTime: string;
  totalDuration: number;
  customFields: CustomField[];
  customFieldValues: CustomFieldValues;
  dpAmount: number;
  onDpAmountChange: (amount: number) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export function StepSummary({
  customerData,
  sessionData,
  detailData,
  discountData,
  staffData,
  selectedPackages,
  selectedAddons,
  backgrounds,
  photoFors,
  users,
  pricing,
  endTime,
  totalDuration,
  customFields,
  customFieldValues,
  dpAmount,
  onDpAmountChange,
}: Props) {
  const selectedBgs = backgrounds.filter((b) => detailData.background_ids.includes(b.id));
  const selectedPhotoFor = photoFors.find((p) => p.id === detailData.photo_for_id);
  const staffMember = users.find((u) => u.id === staffData.staff_id);
  const remaining = Math.max(0, pricing.total - dpAmount);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Ringkasan</h2>
        <p className="text-sm text-gray-500">Periksa semua data sebelum membuat booking</p>
      </div>

      {/* Customer */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <User className="h-4 w-4 text-maroon-700" />
          Customer
        </div>
        <div className="rounded-lg bg-gray-50 p-3 space-y-0.5">
          {customerData.isExisting ? (
            <>
              <Row label="Nama" value={customerData.existingCustomerName} />
              <Row label="WhatsApp" value={customerData.existingCustomerPhone} />
            </>
          ) : (
            <>
              <Row label="Nama" value={customerData.name} />
              <Row label="WhatsApp" value={customerData.phone} />
              {customerData.email && <Row label="Email" value={customerData.email} />}
              {customerData.instagram && <Row label="Instagram" value={customerData.instagram} />}
              {customerData.domicile && <Row label="Domisili" value={customerData.domicile} />}
            </>
          )}
        </div>
      </section>

      {/* Session */}
      <section>
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <Calendar className="h-4 w-4 text-maroon-700" />
          Sesi
        </div>
        <div className="rounded-lg bg-gray-50 p-3 space-y-0.5">
          <Row label="Tanggal" value={formatDate(sessionData.booking_date)} />
          <Row
            label="Waktu"
            value={`${formatTime(sessionData.start_time)} — ${endTime} (${totalDuration} mnt)`}
          />
          <Row label="Jumlah Orang" value={`${detailData.person_count} orang`} />
          {selectedPhotoFor && <Row label="Photo For" value={selectedPhotoFor.name} />}
          {detailData.behind_the_scenes && <Row label="BTS" value="Ya" />}
        </div>
      </section>

      {/* Notes */}
      {detailData.notes && (
        <section>
          <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
            <Calendar className="h-4 w-4 text-maroon-700" />
            Notes
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{detailData.notes}</p>
          </div>
        </section>
      )}

      {/* Custom Fields */}
      {customFields.length > 0 && Object.values(customFieldValues).some(v => v) && (
        <section>
          <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
            <Tag className="h-4 w-4 text-maroon-700" />
            Informasi Tambahan
          </div>
          <div className="rounded-lg bg-gray-50 p-3 space-y-0.5">
            {customFields.map((cf) => {
              const val = customFieldValues[cf.id];
              if (!val) return null;
              return (
                <Row
                  key={cf.id}
                  label={cf.label}
                  value={val === "true" ? "Ya" : val === "false" ? "Tidak" : val}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Package & add-ons */}
      <section>
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <PackageIcon className="h-4 w-4 text-maroon-700" />
          Paket & Add-ons
        </div>
        <div className="rounded-lg bg-gray-50 p-3 space-y-0.5">
          {selectedPackages.map(({ package: pkg, quantity }) => (
            <Row
              key={pkg.id}
              label={`Paket${selectedPackages.length > 1 ? "" : ""}`}
              value={
                <span>
                  {pkg.name}
                  {quantity > 1 && <span className="text-maroon-600 ml-1">×{quantity}</span>}
                  <span className="text-gray-500 ml-1 text-xs">({formatRupiah(pkg.price * quantity)})</span>
                </span>
              }
            />
          ))}
          {selectedAddons.length > 0 && (
            <Row
              label="Add-ons"
              value={
                <span className="flex flex-wrap gap-1 justify-end">
                  {selectedAddons.map(({ addon, quantity }) => (
                    <Badge key={addon.id} variant="secondary" className="text-xs">
                      {addon.name}{quantity > 1 ? ` ×${quantity}` : ""}
                    </Badge>
                  ))}
                </span>
              }
            />
          )}
          {selectedBgs.length > 0 && (
            <Row
              label="Background"
              value={
                <span className="flex flex-wrap gap-1 justify-end">
                  {selectedBgs.map((b) => (
                    <Badge key={b.id} variant="outline" className="text-xs">{b.name}</Badge>
                  ))}
                </span>
              }
            />
          )}
        </div>
      </section>

      {/* Staff */}
      <section>
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <UserCheck className="h-4 w-4 text-maroon-700" />
          Staff
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <Row label="Handled by" value={staffMember?.name ?? "-"} />
        </div>
      </section>

      {/* Pricing */}
      <section>
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <Tag className="h-4 w-4 text-maroon-700" />
          Harga
        </div>
        <div className="rounded-lg border-2 border-maroon-200 bg-maroon-50 p-4 space-y-2">
          {selectedPackages.map(({ package: pkg, quantity }) => (
            <div key={pkg.id} className="flex justify-between text-sm">
              <span className="text-gray-600">{pkg.name}{quantity > 1 ? ` ×${quantity}` : ""}</span>
              <span>{formatRupiah(pkg.price * quantity)}</span>
            </div>
          ))}
          {pricing.addonsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Add-ons</span>
              <span>{formatRupiah(pricing.addonsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-maroon-200 pt-2">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatRupiah(pricing.subtotal)}</span>
          </div>
          {pricing.discount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>
                Diskon{" "}
                {discountData.discount_type === "voucher"
                  ? `(${discountData.voucher_code})`
                  : "(manual)"}
              </span>
              <span>− {formatRupiah(pricing.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-maroon-300 pt-2 text-maroon-900">
            <span>Total</span>
            <span>{formatRupiah(pricing.total)}</span>
          </div>
        </div>
      </section>

      {/* Down Payment */}
      <section>
        <div className="flex items-center gap-2 font-medium text-gray-700 text-sm mb-2">
          <CreditCard className="h-4 w-4 text-maroon-700" />
          Down Payment (opsional)
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-xs text-gray-500">
            Isi jika customer sudah membayar DP. Kosongkan jika belum ada pembayaran.
          </p>
          <div>
            <Label className="mb-1 block text-sm">Jumlah DP (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={dpAmount || ""}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                const maxDp = Math.floor(pricing.total);
                onDpAmountChange(isNaN(v) || v < 0 ? 0 : Math.min(v, maxDp));
              }}
            />
          </div>
          {dpAmount > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">DP dibayar</span>
                <span className="font-medium text-yellow-700">{formatRupiah(dpAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-yellow-200 pt-1">
                <span className="text-gray-600">Sisa pembayaran</span>
                <span className="font-semibold text-gray-900">{formatRupiah(remaining)}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
