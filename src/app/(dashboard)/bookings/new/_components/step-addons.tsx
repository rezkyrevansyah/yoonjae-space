"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatRupiah } from "@/lib/utils";
import type { AddonFormData } from "./new-booking-client";
import type { Addon } from "@/lib/types/database";
import { Clock } from "lucide-react";

interface Props {
  addonData: AddonFormData;
  onChange: (data: AddonFormData) => void;
  addons: Addon[];
}

export function StepAddons({ addonData, onChange, addons }: Props) {
  function toggle(id: string) {
    const current = addonData.addon_ids;
    onChange({
      addon_ids: current.includes(id)
        ? current.filter((a) => a !== id)
        : [...current, id],
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Add-ons</h2>
        <p className="text-sm text-gray-500">Pilih add-on yang diinginkan (opsional)</p>
      </div>

      {addons.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">Belum ada add-on aktif</p>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => {
            const checked = addonData.addon_ids.includes(addon.id);
            return (
              <label
                key={addon.id}
                className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  checked
                    ? "bg-maroon-50 border-maroon-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(addon.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${checked ? "text-maroon-800" : "text-gray-800"}`}>
                      {addon.name}
                    </p>
                    <p className={`text-sm font-semibold ${checked ? "text-maroon-700" : "text-gray-600"}`}>
                      {formatRupiah(addon.price)}
                    </p>
                  </div>
                  {addon.need_extra_time && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600">
                        +{addon.extra_time_minutes} menit extra
                      </span>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {addonData.addon_ids.length > 0 && (
        <p className="text-sm text-maroon-700 font-medium">
          {addonData.addon_ids.length} add-on dipilih
        </p>
      )}
    </div>
  );
}
