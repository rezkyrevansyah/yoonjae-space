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

interface Props {
  sessionData: SessionFormData;
  selectedPackage: Package | undefined;
  selectedAddons: Addon[];
  actualStartTime: string;
  endTime: string;
  totalDuration: number;
  conflictingBookings?: ConflictingBooking[];
}

export function StepTimeEstimate({
  sessionData,
  selectedPackage,
  selectedAddons,
  actualStartTime,
  endTime,
  totalDuration,
  conflictingBookings = [],
}: Props) {
  if (!selectedPackage || !sessionData.start_time) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Estimasi Waktu</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-700 text-sm">
          Pilih sesi dan paket terlebih dahulu.
        </div>
      </div>
    );
  }

  const extraAddons = selectedAddons.filter((a) => a.need_extra_time);
  const beforeAddons = extraAddons.filter((a) => a.extra_time_position === "before");
  const afterAddons = extraAddons.filter((a) => a.extra_time_position === "after");
  const displayStart = actualStartTime || sessionData.start_time;
  const hasBeforeAddon = beforeAddons.length > 0;

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
            {hasBeforeAddon && (
              <p className="text-xs text-amber-600 mt-0.5">
                ⚠ Waktu mulai lebih awal dari sesi yang dipilih ({formatTime(sessionData.start_time)}) karena ada add-on sebelum sesi
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          {beforeAddons.map((a) => (
            <div key={a.id} className="flex justify-between text-amber-700">
              <span>{a.name} (sebelum sesi)</span>
              <span>−{a.extra_time_minutes} mnt</span>
            </div>
          ))}
          <div className="flex justify-between text-maroon-700">
            <span>Paket: {selectedPackage.name}</span>
            <span>{selectedPackage.duration_minutes} mnt</span>
          </div>
          {selectedPackage.need_extra_time && (
            <div className="flex justify-between text-maroon-600">
              <span>Extra time paket</span>
              <span>+{selectedPackage.extra_time_minutes} mnt</span>
            </div>
          )}
          {afterAddons.map((a) => (
            <div key={a.id} className="flex justify-between text-maroon-600">
              <span>{a.name} (setelah sesi)</span>
              <span>+{a.extra_time_minutes} mnt</span>
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
