"use client";

import { Clock } from "lucide-react";
import type { SessionFormData } from "./new-booking-client";
import type { Package, Addon } from "@/lib/types/database";
import { formatTime } from "@/lib/utils";

interface Props {
  sessionData: SessionFormData;
  selectedPackage: Package | undefined;
  selectedAddons: Addon[];
  endTime: string;
  totalDuration: number;
}

export function StepTimeEstimate({
  sessionData,
  selectedPackage,
  selectedAddons,
  endTime,
  totalDuration,
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
              {formatTime(sessionData.start_time)} — {endTime}
            </p>
            <p className="text-sm text-maroon-600">{totalDuration} menit total</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
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
          {extraAddons.map((a) => (
            <div key={a.id} className="flex justify-between text-maroon-600">
              <span>Extra time: {a.name}</span>
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
    </div>
  );
}
