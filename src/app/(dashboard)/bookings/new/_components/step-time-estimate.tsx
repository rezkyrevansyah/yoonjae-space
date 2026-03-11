"use client";

import { Clock, AlertTriangle } from "lucide-react";
import type { SessionFormData } from "./new-booking-client";
import type { Package, Addon } from "@/lib/types/database";
import { formatTime } from "@/lib/utils";

interface ConflictingBooking {
  customerName: string;
  startTime: string;
  endTime: string;
}

interface SelectedPackageItem {
  package: Package;
  quantity: number;
}

interface SelectedAddonItem {
  addon: Addon;
  quantity: number;
}

interface Props {
  sessionData: SessionFormData;
  selectedPackages: SelectedPackageItem[];
  selectedAddons: SelectedAddonItem[];
  actualStartTime: string;
  endTime: string;
  totalDuration: number;
  conflictingBookings?: ConflictingBooking[];
}

export function StepTimeEstimate({
  sessionData,
  selectedPackages,
  selectedAddons,
  actualStartTime,
  endTime,
  totalDuration,
  conflictingBookings = [],
}: Props) {
  if (selectedPackages.length === 0 || !sessionData.start_time) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Estimasi Waktu</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700 text-sm">
          Pilih sesi dan paket terlebih dahulu.
        </div>
      </div>
    );
  }

  const extraAddons = selectedAddons.filter((a) => a.addon.need_extra_time);
  const beforeAddons = extraAddons.filter((a) => a.addon.extra_time_position === "before");
  const afterAddons = extraAddons.filter((a) => a.addon.extra_time_position === "after");
  const beforePackages = selectedPackages.filter((p) => p.package.need_extra_time && p.package.extra_time_position === "before");
  const displayStart = actualStartTime || sessionData.start_time;
  const hasBeforeAddon = beforeAddons.length > 0;
  const hasBeforePackage = beforePackages.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Estimasi Waktu</h2>
        <p className="text-sm text-gray-500">Berdasarkan paket dan add-on yang dipilih</p>
      </div>

      <div className="rounded-xl border-2 border-maroon-200 bg-maroon-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-8 w-8 text-maroon-700" />
          <div>
            <p className="text-2xl font-bold text-maroon-900">
              {formatTime(displayStart)} — {endTime}
            </p>
            <p className="text-sm text-maroon-600">{totalDuration} menit total</p>
            {(hasBeforeAddon || hasBeforePackage) && (
              <p className="text-xs text-amber-600 mt-0.5">
                ⚠ Waktu mulai lebih awal dari sesi yang dipilih ({formatTime(sessionData.start_time)}) karena ada {hasBeforePackage ? "paket" : ""}{hasBeforePackage && hasBeforeAddon ? " dan " : ""}{hasBeforeAddon ? "add-on" : ""} sebelum sesi
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          {beforePackages.map(({ package: pkg, quantity }) => (
            <div key={`pkg-before-${pkg.id}`} className="flex justify-between text-amber-700">
              <span>Extra time: {pkg.name}{quantity > 1 ? ` ×${quantity}` : ""} (sebelum sesi)</span>
              <span>−{pkg.extra_time_minutes * quantity} mnt</span>
            </div>
          ))}
          {beforeAddons.map(({ addon, quantity }) => (
            <div key={addon.id} className="flex justify-between text-amber-700">
              <span>{addon.name}{quantity > 1 ? ` ×${quantity}` : ""} (sebelum sesi)</span>
              <span>−{addon.extra_time_minutes * quantity} mnt</span>
            </div>
          ))}
          {selectedPackages.map(({ package: pkg, quantity }) => (
            <div key={pkg.id}>
              <div className="flex justify-between text-maroon-700">
                <span>Paket: {pkg.name}{quantity > 1 ? ` ×${quantity}` : ""}</span>
                <span>{pkg.duration_minutes * quantity} mnt</span>
              </div>
              {pkg.need_extra_time && pkg.extra_time_position === "after" && (
                <div className="flex justify-between text-maroon-600 text-xs pl-2">
                  <span>Extra time paket (setelah sesi){quantity > 1 ? ` ×${quantity}` : ""}</span>
                  <span>+{pkg.extra_time_minutes * quantity} mnt</span>
                </div>
              )}
            </div>
          ))}
          {afterAddons.map(({ addon, quantity }) => (
            <div key={addon.id} className="flex justify-between text-maroon-600">
              <span>{addon.name}{quantity > 1 ? ` ×${quantity}` : ""} (setelah sesi)</span>
              <span>+{addon.extra_time_minutes * quantity} mnt</span>
            </div>
          ))}
        </div>
      </div>

      {selectedAddons.length > 0 && extraAddons.length === 0 && (
        <p className="text-sm text-gray-500">
          Add-on yang dipilih tidak menambah waktu sesi.
        </p>
      )}

      {conflictingBookings.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">Waktu Efektif Bertabrakan</p>
            <p className="text-xs text-amber-700">
              Rentang waktu efektif booking ini overlap dengan:
            </p>
            <ul className="space-y-0.5">
              {conflictingBookings.map((c, i) => (
                <li key={i} className="text-xs text-amber-800 font-medium">
                  • {c.customerName} ({formatTime(c.startTime)}–{formatTime(c.endTime)})
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-1">
              Booking tetap bisa dibuat — pastikan koordinasi ruangan sudah oke dengan owner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
