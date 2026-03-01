"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

// Module-level singleton — stable across renders
const supabase = createClient();
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";
import type { BookingDetail, BookingAddonRow, AvailableAddon } from "./booking-detail-client";
import type { CurrentUser } from "@/lib/types/database";
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  booking: BookingDetail;
  currentUser: CurrentUser;
  availableAddons: AvailableAddon[];
  onUpdate: (updated: Partial<BookingDetail>) => void;
}

export function TabPricing({ booking, currentUser, availableAddons, onUpdate }: Props) {
  const { toast } = useToast();

  const [addons, setAddons] = useState<BookingAddonRow[]>(booking.booking_addons);
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const originalAddons = useMemo(() => addons.filter((a) => !a.is_extra), [addons]);
  const extraAddons = useMemo(() => addons.filter((a) => a.is_extra), [addons]);

  const availableToAdd = useMemo(() => {
    const usedIds = new Set(addons.map((a) => a.addon_id));
    return availableAddons.filter((a) => !usedIds.has(a.id));
  }, [addons, availableAddons]);

  const packagePrice = booking.packages?.price ?? 0;
  const originalAddonsTotal = useMemo(
    () => originalAddons.reduce((s, a) => s + a.price, 0),
    [originalAddons]
  );
  const extraAddonsTotal = useMemo(
    () => extraAddons.reduce((s, a) => s + a.price, 0),
    [extraAddons]
  );
  const discount = booking.manual_discount > 0
    ? booking.manual_discount
    : (() => {
        const v = booking.vouchers;
        if (!v) return 0;
        if (v.discount_type === "percentage")
          return Math.floor(((packagePrice + originalAddonsTotal) * v.discount_value) / 100);
        return v.discount_value;
      })();
  const total = Math.max(0, packagePrice + originalAddonsTotal - discount) + extraAddonsTotal;

  async function addExtraAddon() {
    if (!selectedAddonId) return;
    const addon = availableAddons.find((a) => a.id === selectedAddonId);
    if (!addon) return;

    setAdding(true);
    try {
      const { error } = await supabase.from("booking_addons").insert({
        booking_id: booking.id,
        addon_id: addon.id,
        price: addon.price,
        is_paid: false,
        is_extra: true,
      });
      if (error) throw error;

      const newAddon: BookingAddonRow = {
        addon_id: addon.id,
        price: addon.price,
        is_paid: false,
        is_extra: true,
        addons: {
          id: addon.id,
          name: addon.name,
          need_extra_time: addon.need_extra_time,
          extra_time_minutes: addon.extra_time_minutes,
        },
      };

      const updated = [...addons, newAddon];
      setAddons(updated);
      onUpdate({ booking_addons: updated });
      setSelectedAddonId("");

      // Check if we need ADDON_UNPAID status
      await checkAndUpdateStatus(updated);

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "booking_addons",
        entity_id: booking.id,
        description: `Menambah extra add-on ${addon.name} ke booking ${booking.booking_number}`,
      });

      toast({ title: "Add-on ditambahkan", description: addon.name });
    } catch {
      toast({ title: "Error", description: "Gagal menambahkan add-on", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function togglePaid(addonId: string, currentPaid: boolean) {
    setTogglingId(addonId);
    try {
      const { error } = await supabase
        .from("booking_addons")
        .update({ is_paid: !currentPaid })
        .eq("booking_id", booking.id)
        .eq("addon_id", addonId);
      if (error) throw error;

      const updated = addons.map((a) =>
        a.addon_id === addonId ? { ...a, is_paid: !currentPaid } : a
      );
      setAddons(updated);
      onUpdate({ booking_addons: updated });

      await checkAndUpdateStatus(updated);

      const addonName = addons.find((a) => a.addon_id === addonId)?.addons?.name ?? addonId;
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "booking_addons",
        entity_id: booking.id,
        description: `Add-on ${addonName} di booking ${booking.booking_number}: ${currentPaid ? "Belum Lunas" : "Lunas"}`,
      });

      toast({
        title: !currentPaid ? "Tandai Lunas" : "Tandai Belum Lunas",
        description: addonName,
      });
    } catch {
      toast({ title: "Error", description: "Gagal memperbarui status add-on", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  }

  async function checkAndUpdateStatus(currentAddons: BookingAddonRow[]) {
    // Only manage status when booking is relevant
    const relevantStatuses = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];
    if (!relevantStatuses.includes(booking.status)) return;

    const extraUnpaid = currentAddons.filter((a) => a.is_extra && !a.is_paid);
    let newStatus = booking.status;

    if (extraUnpaid.length > 0 && booking.status !== "ADDON_UNPAID") {
      newStatus = "ADDON_UNPAID";
    } else if (extraUnpaid.length === 0 && booking.status === "ADDON_UNPAID") {
      // Revert to previous logical status
      newStatus = "PHOTOS_DELIVERED";
    }

    if (newStatus !== booking.status) {
      await supabase.from("bookings").update({ status: newStatus }).eq("id", booking.id);
      onUpdate({ status: newStatus });
    }
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Original addons */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-gray-800">Paket & Add-on Awal</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
            <span className="text-gray-600">Paket: {booking.packages?.name}</span>
            <span className="font-medium">{formatRupiah(packagePrice)}</span>
          </div>
          {originalAddons.map((a) => (
            <div key={a.addon_id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-600">{a.addons?.name ?? a.addon_id}</span>
              <span className="font-medium">{formatRupiah(a.price)}</span>
            </div>
          ))}
          {discount > 0 && (
            <div className="flex justify-between text-sm py-1.5 text-green-700">
              <span>
                Diskon{" "}
                {booking.vouchers ? `(${booking.vouchers.code})` : "(manual)"}
              </span>
              <span>− {formatRupiah(discount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Extra add-ons */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Extra Add-on</h3>

        {extraAddons.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada extra add-on</p>
        ) : (
          <div className="space-y-2">
            {extraAddons.map((a) => (
              <div
                key={a.addon_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{a.addons?.name ?? a.addon_id}</p>
                  <p className="text-xs text-gray-500">{formatRupiah(a.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={a.is_paid
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                    }
                  >
                    {a.is_paid ? "Lunas" : "Belum Lunas"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePaid(a.addon_id, a.is_paid)}
                    disabled={togglingId === a.addon_id}
                    className="h-8 px-2"
                  >
                    {togglingId === a.addon_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : a.is_paid ? (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add extra addon */}
        {availableToAdd.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Select value={selectedAddonId} onValueChange={setSelectedAddonId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tambah add-on extra..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {formatRupiah(a.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={addExtraAddon}
              disabled={!selectedAddonId || adding}
              className="gap-1"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah
            </Button>
          </div>
        )}
      </div>

      {/* Total summary */}
      <div className="rounded-xl border-2 border-maroon-200 bg-maroon-50 p-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal awal</span>
          <span>{formatRupiah(Math.max(0, packagePrice + originalAddonsTotal - discount))}</span>
        </div>
        {extraAddonsTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Extra add-on</span>
            <span>{formatRupiah(extraAddonsTotal)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t border-maroon-300 pt-2 text-maroon-900">
          <span>Total</span>
          <span>{formatRupiah(total)}</span>
        </div>
      </div>
    </div>
  );
}
