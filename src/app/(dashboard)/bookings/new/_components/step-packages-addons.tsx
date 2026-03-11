"use client";

import { useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
import type { Package, Addon } from "@/lib/types/database";
import { Clock, Minus, Plus, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function groupBy<T extends { category: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (!a && b) return 1;
    if (a && !b) return -1;
    return a.localeCompare(b);
  });
}

export interface SelectedPackageItem {
  package_id: string;
  quantity: number;
}

export interface SelectedAddonItem {
  addon_id: string;
  quantity: number;
}

export interface PackagesAddonsFormData {
  packages: SelectedPackageItem[];
  addons: SelectedAddonItem[];
}

interface Props {
  data: PackagesAddonsFormData;
  onChange: (data: PackagesAddonsFormData) => void;
  packages: Package[];
  addons: Addon[];
}

function QuantityControl({
  value,
  onIncrease,
  onDecrease,
}: {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onDecrease}
        className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-6 text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function StepPackagesAddons({ data, onChange, packages, addons }: Props) {
  const packageGroups = useMemo(() => groupBy(packages), [packages]);
  const addonGroups = useMemo(() => groupBy(addons), [addons]);

  // --- Package helpers ---
  function getPackageQty(pkg_id: string): number {
    return data.packages.find((p) => p.package_id === pkg_id)?.quantity ?? 0;
  }

  function setPackageQty(pkg_id: string, qty: number) {
    if (qty <= 0) {
      onChange({ ...data, packages: data.packages.filter((p) => p.package_id !== pkg_id) });
    } else {
      const existing = data.packages.find((p) => p.package_id === pkg_id);
      if (existing) {
        onChange({ ...data, packages: data.packages.map((p) => p.package_id === pkg_id ? { ...p, quantity: qty } : p) });
      } else {
        onChange({ ...data, packages: [...data.packages, { package_id: pkg_id, quantity: qty }] });
      }
    }
  }

  // --- Addon helpers ---
  function getAddonQty(addon_id: string): number {
    return data.addons.find((a) => a.addon_id === addon_id)?.quantity ?? 0;
  }

  function setAddonQty(addon_id: string, qty: number) {
    if (qty <= 0) {
      onChange({ ...data, addons: data.addons.filter((a) => a.addon_id !== addon_id) });
    } else {
      const existing = data.addons.find((a) => a.addon_id === addon_id);
      if (existing) {
        onChange({ ...data, addons: data.addons.map((a) => a.addon_id === addon_id ? { ...a, quantity: qty } : a) });
      } else {
        onChange({ ...data, addons: [...data.addons, { addon_id: addon_id, quantity: qty }] });
      }
    }
  }

  // Running subtotal
  const packagesSubtotal = data.packages.reduce((sum, item) => {
    const pkg = packages.find((p) => p.id === item.package_id);
    return sum + (pkg?.price ?? 0) * item.quantity;
  }, 0);
  const addonsSubtotal = data.addons.reduce((sum, item) => {
    const addon = addons.find((a) => a.id === item.addon_id);
    return sum + (addon?.price ?? 0) * item.quantity;
  }, 0);
  const runningSubtotal = packagesSubtotal + addonsSubtotal;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Pilih Paket & Add-on</h2>
        <p className="text-sm text-gray-500">Pilih paket dan add-on yang diinginkan</p>
      </div>

      {/* Packages Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PackageOpen className="h-4 w-4 text-maroon-700" />
          <h3 className="text-sm font-semibold text-gray-700">Paket <span className="text-red-500">*</span></h3>
        </div>
        {packages.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Belum ada paket aktif</p>
        ) : (
          <div className="space-y-4">
            {packageGroups.map(([category, items]) => (
              <div key={category || "__uncategorized"}>
                {category && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((pkg) => {
                    const qty = getPackageQty(pkg.id);
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setPackageQty(pkg.id, isSelected ? 0 : 1)}
                        className={cn(
                          "rounded-lg border p-4 cursor-pointer transition-colors",
                          isSelected
                            ? "bg-maroon-50 border-maroon-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium", isSelected ? "text-maroon-800" : "text-gray-800")}>
                              {pkg.name}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className={cn("text-sm font-semibold", isSelected ? "text-maroon-700" : "text-gray-600")}>
                                {formatRupiah(pkg.price)}
                              </p>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {pkg.duration_minutes} mnt
                                {pkg.need_extra_time && ` +${pkg.extra_time_minutes} mnt`}
                              </span>
                            </div>
                            {pkg.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{pkg.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <QuantityControl
                              value={qty}
                              onIncrease={() => setPackageQty(pkg.id, qty + 1)}
                              onDecrease={() => setPackageQty(pkg.id, qty - 1)}
                            />
                          )}
                        </div>
                        {isSelected && qty > 1 && (
                          <p className="text-xs text-maroon-600 mt-2 font-medium">
                            Subtotal: {formatRupiah(pkg.price * qty)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.packages.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Pilih minimal 1 paket</p>
        )}
      </div>

      {/* Add-ons Section */}
      {addons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-maroon-700" />
            <h3 className="text-sm font-semibold text-gray-700">Add-on <span className="text-gray-400 font-normal">(opsional)</span></h3>
          </div>
          <div className="space-y-4">
            {addonGroups.map(([category, items]) => (
              <div key={category || "__uncategorized"}>
                {category && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((addon) => {
                    const qty = getAddonQty(addon.id);
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={addon.id}
                        onClick={() => setAddonQty(addon.id, isSelected ? 0 : 1)}
                        className={cn(
                          "rounded-lg border p-4 cursor-pointer transition-colors",
                          isSelected
                            ? "bg-maroon-50 border-maroon-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium", isSelected ? "text-maroon-800" : "text-gray-800")}>
                              {addon.name}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className={cn("text-sm font-semibold", isSelected ? "text-maroon-700" : "text-gray-600")}>
                                {formatRupiah(addon.price)}
                              </p>
                              {addon.need_extra_time && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  +{addon.extra_time_minutes} mnt {addon.extra_time_position === "before" ? "(sebelum sesi)" : "(setelah sesi)"}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <QuantityControl
                              value={qty}
                              onIncrease={() => setAddonQty(addon.id, qty + 1)}
                              onDecrease={() => setAddonQty(addon.id, qty - 1)}
                            />
                          )}
                        </div>
                        {isSelected && qty > 1 && (
                          <p className="text-xs text-maroon-600 mt-2 font-medium">
                            Subtotal: {formatRupiah(addon.price * qty)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running subtotal */}
      {runningSubtotal > 0 && (
        <div className="rounded-lg bg-maroon-50 border border-maroon-200 p-3 flex justify-between items-center">
          <span className="text-sm text-maroon-700 font-medium">Estimasi subtotal</span>
          <span className="text-base font-bold text-maroon-900">{formatRupiah(runningSubtotal)}</span>
        </div>
      )}
    </div>
  );
}
