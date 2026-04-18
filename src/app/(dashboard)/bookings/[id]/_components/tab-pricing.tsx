"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";
import type { BookingDetail, BookingAddonRow, AvailableAddon } from "./booking-detail-client";
import type { CurrentUser } from "@/lib/types/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Minus, Loader2, CheckCircle2, XCircle, Trash2, Pencil, CreditCard, BadgeCheck, CalendarDays } from "lucide-react";

// Module-level singleton — stable across renders
const supabase = createClient();

interface Props {
  booking: BookingDetail;
  currentUser: CurrentUser;
  availableAddons: AvailableAddon[];
  onUpdate: (updated: Partial<BookingDetail>) => void;
}

export function TabPricing({ booking, currentUser, availableAddons, onUpdate }: Props) {
  const { toast } = useToast();

  // --- Add-on state ---
  const [addons, setAddons] = useState<BookingAddonRow[]>(booking.booking_addons);
  const [selectedAddonId, setSelectedAddonId] = useState("__none__");
  const [extraQty, setExtraQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // --- DP state ---
  const [dpAmount, setDpAmount] = useState<number | null>(
    booking.dp_amount != null && booking.dp_amount > 0 ? booking.dp_amount : null
  );
  const [dpPaidAt, setDpPaidAt] = useState<string | null>(booking.dp_paid_at ?? null);
  const [editingDp, setEditingDp] = useState(false);
  const [dpInput, setDpInput] = useState("");
  const [dpDateInput, setDpDateInput] = useState("");
  const [savingDp, setSavingDp] = useState(false);
  const [togglingDp, setTogglingDp] = useState(false);
  const [deletingDp, setDeletingDp] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cancelingPaid, setCancelingPaid] = useState(false);
  const [showCancelLunasDialog, setShowCancelLunasDialog] = useState(false);

  const isFullyPaid = booking.status === "PAID";

  const hasDp = dpAmount != null && dpAmount > 0;
  const dpIsLunas = dpPaidAt != null;

  // --- Derived pricing ---
  const originalAddons = useMemo(() => addons.filter((a) => !a.is_extra), [addons]);
  const extraAddons = useMemo(() => addons.filter((a) => a.is_extra), [addons]);

  // Only exclude addons already added as EXTRA (allow re-adding original addons as extra)
  const availableToAdd = useMemo(() => {
    // Only exclude add-ons already added as EXTRA (not originals — client can re-add same addon as extra)
    const extraIds = new Set(extraAddons.map((a) => a.addon_id));
    return availableAddons.filter((a) => !extraIds.has(a.id));
  }, [extraAddons, availableAddons]);

  const packagesTotal = booking.booking_packages.reduce(
    (sum, bp) => sum + bp.price_snapshot * bp.quantity, 0
  );
  const originalAddonsTotal = useMemo(
    () => originalAddons.reduce((s, a) => s + a.price * (a.quantity ?? 1), 0),
    [originalAddons]
  );
  const extraAddonsTotal = useMemo(
    () => extraAddons.reduce((s, a) => s + a.price * (a.quantity ?? 1), 0),
    [extraAddons]
  );
  const discount = booking.manual_discount > 0
    ? booking.manual_discount
    : (() => {
        const v = booking.vouchers;
        if (!v) return 0;
        if (v.discount_type === "percentage")
          return Math.floor(((packagesTotal + originalAddonsTotal) * v.discount_value) / 100);
        return v.discount_value;
      })();
  const total = Math.max(0, packagesTotal + originalAddonsTotal - discount) + extraAddonsTotal;

  // --- DP handlers ---
  async function handleSaveDp() {
    const amount = parseInt(dpInput.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) return;
    if (amount > total) {
      toast({ title: "DP melebihi total", description: `DP tidak boleh lebih dari ${formatRupiah(total)}`, variant: "destructive" });
      return;
    }
    setSavingDp(true);
    const isNew = !hasDp;
    try {
      const paidAt = dpDateInput
        ? new Date(dpDateInput + "T00:00:00").toISOString()
        : new Date().toISOString();
      // New DP: default to Lunas + update status. Edit: optionally update dp_paid_at if user provided a date.
      const updatePayload = isNew
        ? { dp_amount: amount, dp_paid_at: paidAt, status: booking.status === "BOOKED" ? "DP_PAID" : booking.status }
        : { dp_amount: amount, ...(dpDateInput ? { dp_paid_at: paidAt } : {}) };
      const { error } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", booking.id);
      if (error) throw error;

      setDpAmount(amount);
      if (isNew) {
        setDpPaidAt(paidAt);
        onUpdate({ dp_amount: amount, dp_paid_at: paidAt, status: updatePayload.status as typeof booking.status ?? booking.status });
      } else {
        if (dpDateInput) setDpPaidAt(paidAt);
        onUpdate({ dp_amount: amount, ...(dpDateInput ? { dp_paid_at: paidAt } : {}) });
      }

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: hasDp ? "UPDATE" : "CREATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `${hasDp ? "Update" : "Tambah"} DP booking ${booking.booking_number}: ${formatRupiah(amount)}`,
      });

      toast({ title: "DP disimpan", description: formatRupiah(amount) });
      setEditingDp(false);
      setDpInput("");
      setDpDateInput("");
    } catch {
      toast({ title: "Gagal menyimpan DP", variant: "destructive" });
    } finally {
      setSavingDp(false);
    }
  }

  async function handleToggleDpPaid() {
    setTogglingDp(true);
    try {
      const now = new Date().toISOString();
      let newPaidAt: string | null;
      let newStatus = booking.status;

      if (dpIsLunas) {
        newPaidAt = null;
        if (booking.status === "DP_PAID") newStatus = "BOOKED";
      } else {
        newPaidAt = now;
        if (booking.status === "BOOKED") newStatus = "DP_PAID";
      }

      const { error } = await supabase
        .from("bookings")
        .update({ dp_paid_at: newPaidAt, status: newStatus })
        .eq("id", booking.id);
      if (error) throw error;

      setDpPaidAt(newPaidAt);
      onUpdate({ dp_paid_at: newPaidAt, status: newStatus });

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `DP booking ${booking.booking_number}: ${dpIsLunas ? "Belum Lunas" : "Lunas"}`,
      });

      toast({ title: dpIsLunas ? "DP: Belum Lunas" : "DP: Lunas" });
    } catch {
      toast({ title: "Gagal update status DP", variant: "destructive" });
    } finally {
      setTogglingDp(false);
    }
  }

  async function handleDeleteDp() {
    setDeletingDp(true);
    try {
      let newStatus = booking.status;
      if (booking.status === "DP_PAID") newStatus = "BOOKED";

      const { error } = await supabase
        .from("bookings")
        .update({ dp_amount: 0, dp_paid_at: null, status: newStatus })
        .eq("id", booking.id);
      if (error) throw error;

      setDpAmount(null);
      setDpPaidAt(null);
      onUpdate({ dp_amount: 0, dp_paid_at: null, status: newStatus });

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "DELETE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Hapus DP booking ${booking.booking_number}`,
      });

      toast({ title: "DP dihapus" });
    } catch {
      toast({ title: "Gagal menghapus DP", variant: "destructive" });
    } finally {
      setDeletingDp(false);
    }
  }

  // --- Extra add-on handlers ---
  async function addExtraAddon() {
    if (!selectedAddonId || selectedAddonId === "__none__") return;
    const addon = availableAddons.find((a) => a.id === selectedAddonId);
    if (!addon) return;
    const qty = Math.max(1, extraQty);

    setAdding(true);
    try {
      const { error } = await supabase.from("booking_addons").insert({
        booking_id: booking.id,
        addon_id: addon.id,
        price: addon.price,
        quantity: qty,
        is_paid: false,
        is_extra: true,
      });
      if (error) throw error;

      const addedTotal = addon.price * qty;
      const newExtraTotal = extraAddons.reduce((s, a) => s + a.price * (a.quantity ?? 1), 0) + addedTotal;
      const newTotal = Math.max(0, packagesTotal + originalAddonsTotal - discount) + newExtraTotal;
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ total: newTotal })
        .eq("id", booking.id);
      if (updateErr) throw updateErr;
      onUpdate({ total: newTotal });

      const newAddon: BookingAddonRow = {
        addon_id: addon.id,
        price: addon.price,
        quantity: qty,
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
      setSelectedAddonId("__none__");
      setExtraQty(1);

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "booking_addons",
        entity_id: booking.id,
        description: `Menambah extra add-on ${addon.name}${qty > 1 ? ` (${qty}x)` : ""} ke booking ${booking.booking_number}`,
      });

      toast({ title: "Add-on ditambahkan", description: addon.name });
    } catch {
      toast({ title: "Error", description: "Gagal menambahkan add-on", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function removeExtraAddon(addonId: string) {
    setRemovingId(addonId);
    try {
      const addonName = addons.find((a) => a.addon_id === addonId)?.addons?.name ?? addonId;
      const removedAddon = addons.find((a) => a.addon_id === addonId && a.is_extra);
      const removedPrice = removedAddon ? removedAddon.price * (removedAddon.quantity ?? 1) : 0;
      const { error } = await supabase
        .from("booking_addons")
        .delete()
        .eq("booking_id", booking.id)
        .eq("addon_id", addonId)
        .eq("is_extra", true);
      if (error) throw error;

      const newExtraTotal = extraAddons.reduce((s, a) => s + a.price * (a.quantity ?? 1), 0) - removedPrice;
      const newTotal = Math.max(0, packagesTotal + originalAddonsTotal - discount) + newExtraTotal;
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({ total: newTotal })
        .eq("id", booking.id);
      if (updateErr) throw updateErr;
      onUpdate({ total: newTotal });

      const updated = addons.filter((a) => !(a.addon_id === addonId && a.is_extra));
      setAddons(updated);
      onUpdate({ booking_addons: updated });

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "DELETE",
        entity: "booking_addons",
        entity_id: booking.id,
        description: `Menghapus extra add-on ${addonName} dari booking ${booking.booking_number}`,
      });

      toast({ title: "Add-on dihapus", description: addonName });
    } catch {
      toast({ title: "Error", description: "Gagal menghapus add-on", variant: "destructive" });
    } finally {
      setRemovingId(null);
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

  async function handleCancelFullyPaid() {
    setCancelingPaid(true);
    try {
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ status: "BOOKED", dp_paid_at: null })
        .eq("id", booking.id);
      if (bookingErr) throw bookingErr;

      if (addons.length > 0) {
        const { error: addonErr } = await supabase
          .from("booking_addons")
          .update({ is_paid: false })
          .eq("booking_id", booking.id);
        if (addonErr) throw addonErr;
      }

      setDpPaidAt(null);
      const updatedAddons = addons.map((a) => ({ ...a, is_paid: false }));
      setAddons(updatedAddons);
      onUpdate({ status: "BOOKED", dp_paid_at: null, booking_addons: updatedAddons });

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Booking ${booking.booking_number} - Lunas Semua dibatalkan, direset ke BOOKED`,
      });

      toast({ title: "Berhasil", description: "Pembayaran direset. Tandai ulang secara manual." });
    } catch {
      toast({ title: "Gagal membatalkan lunas", variant: "destructive" });
    } finally {
      setCancelingPaid(false);
      setShowCancelLunasDialog(false);
    }
  }

  async function handleMarkFullyPaid() {
    setMarkingPaid(true);
    try {
      const now = new Date().toISOString();
      const bookingUpdate: Record<string, unknown> = { status: "PAID" };
      if (hasDp) bookingUpdate.dp_paid_at = now;

      const { error: bookingErr } = await supabase
        .from("bookings")
        .update(bookingUpdate)
        .eq("id", booking.id);
      if (bookingErr) throw bookingErr;

      if (addons.length > 0) {
        const { error: addonErr } = await supabase
          .from("booking_addons")
          .update({ is_paid: true })
          .eq("booking_id", booking.id);
        if (addonErr) throw addonErr;
      }

      if (hasDp) setDpPaidAt(now);
      const updatedAddons = addons.map((a) => ({ ...a, is_paid: true }));
      setAddons(updatedAddons);
      onUpdate({
        status: "PAID",
        dp_paid_at: hasDp ? now : booking.dp_paid_at,
        booking_addons: updatedAddons,
      });

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Booking ${booking.booking_number} ditandai Lunas Semua`,
      });

      toast({ title: "Lunas Semua", description: `Booking ${booking.booking_number} sudah lunas` });
    } catch {
      toast({ title: "Gagal menandai lunas", variant: "destructive" });
    } finally {
      setMarkingPaid(false);
    }
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Paket & Add-on Awal */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-gray-800">Paket & Add-on Awal</h3>

        <div className="space-y-2">
          {booking.booking_packages.length > 0 ? (
            booking.booking_packages.map((bp) => (
              <div key={bp.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                <span className="text-gray-600">
                  Paket: {bp.packages?.name}
                  {bp.quantity > 1 && <span className="text-gray-400 ml-1">(x{bp.quantity})</span>}
                </span>
                <span className="font-medium">{formatRupiah(bp.price_snapshot * bp.quantity)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
              <span className="text-gray-600">Paket: {booking.packages?.name}</span>
              <span className="font-medium">{formatRupiah(booking.packages?.price ?? 0)}</span>
            </div>
          )}
          {originalAddons.map((a) => (
            <div key={a.addon_id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-600">
                {a.addons?.name ?? a.addon_id}
                {(a.quantity ?? 1) > 1 && <span className="text-gray-400 ml-1">({a.quantity}x @ {formatRupiah(a.price)})</span>}
              </span>
              <span className="font-medium">{formatRupiah(a.price * (a.quantity ?? 1))}</span>
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

      {/* Down Payment */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-maroon-700" />
            Down Payment (DP)
          </h3>
          {!editingDp && !hasDp && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              onClick={() => { setDpInput(""); setDpDateInput(""); setEditingDp(true); }}
            >
              <Plus className="h-3.5 w-3.5" />Tambah DP
            </Button>
          )}
        </div>

        {editingDp ? (
          <div className="space-y-3">
            <div>
              <Input
                type="number"
                min={0}
                placeholder="Nominal DP..."
                value={dpInput}
                onChange={(e) => setDpInput(e.target.value)}
                className="text-sm"
                autoFocus
              />
              {dpInput && parseInt(dpInput) > 0 && (
                <p className="text-xs text-gray-400 mt-1">{formatRupiah(parseInt(dpInput))}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tanggal Pembayaran (opsional)</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dpDateInput}
                  onChange={(e) => setDpDateInput(e.target.value)}
                  className="flex-1 min-w-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => {
                    const d = new Date();
                    const pad = (n: number) => String(n).padStart(2, "0");
                    setDpDateInput(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Hari Ini</span>
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveDp}
                disabled={savingDp || !dpInput || parseInt(dpInput) <= 0}
                className="bg-maroon-700 hover:bg-maroon-600 h-8"
              >
                {savingDp && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Simpan
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingDp(false); setDpDateInput(""); }} className="h-8">
                Batal
              </Button>
            </div>
          </div>
        ) : hasDp ? (
          <div className="flex items-center justify-between rounded-lg border p-3 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-gray-900">{formatRupiah(dpAmount!)}</p>
                <Badge className={dpIsLunas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                  {dpIsLunas ? "Lunas" : "Belum Lunas"}
                </Badge>
              </div>
              {dpPaidAt && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Dibayar:{" "}
                  {new Date(dpPaidAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleDpPaid}
                disabled={togglingDp}
                className="h-8 px-2"
                title={dpIsLunas ? "Tandai Belum Lunas" : "Tandai Lunas"}
              >
                {togglingDp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : dpIsLunas ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDpInput(String(dpAmount)); setDpDateInput(dpPaidAt ? new Date(dpPaidAt).toLocaleDateString("en-CA") : ""); setEditingDp(true); }}
                className="h-8 px-2"
                title="Edit nominal DP"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteDp}
                disabled={deletingDp}
                className="h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                title="Hapus DP"
              >
                {deletingDp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Belum ada DP yang dicatat.</p>
        )}
      </div>

      {/* Extra Add-on */}
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
                  <p className="font-medium text-sm">
                    {a.addons?.name ?? a.addon_id}
                    {(a.quantity ?? 1) > 1 && <span className="text-gray-400 ml-1">({a.quantity}x)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{formatRupiah(a.price * (a.quantity ?? 1))}</p>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExtraAddon(a.addon_id)}
                    disabled={removingId === a.addon_id}
                    className="h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    {removingId === a.addon_id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableToAdd.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <Select value={selectedAddonId} onValueChange={(v) => { setSelectedAddonId(v); setExtraQty(1); }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih add-on..." />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Group by category preserving sort_order
                    const groups = new Map<string, typeof availableToAdd>();
                    const orderMap = new Map<string, number>();
                    let idx = 0;
                    for (const a of availableToAdd) {
                      const cat = a.category ?? "";
                      if (!groups.has(cat)) { groups.set(cat, []); orderMap.set(cat, idx++); }
                      groups.get(cat)!.push(a);
                    }
                    const sorted = Array.from(groups.entries()).sort(([a], [b]) => {
                      if (!a && b) return 1;
                      if (a && !b) return -1;
                      return (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999);
                    });
                    return sorted.map(([cat, items]) =>
                      cat ? (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-gray-400">{cat}</SelectLabel>
                          {items.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} — {formatRupiah(a.price)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : (
                        items.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} — {formatRupiah(a.price)}
                          </SelectItem>
                        ))
                      )
                    );
                  })()}
                </SelectContent>
              </Select>
              {/* Quantity */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExtraQty((q) => Math.max(1, q - 1))}
                  className="px-2 h-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{extraQty}</span>
                <button
                  type="button"
                  onClick={() => setExtraQty((q) => q + 1)}
                  className="px-2 h-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={addExtraAddon}
              disabled={!selectedAddonId || selectedAddonId === "__none__" || adding}
              className="w-full gap-1"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah Add-on
            </Button>
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div className="rounded-xl border-2 border-maroon-200 bg-maroon-50 p-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal awal</span>
          <span>{formatRupiah(Math.max(0, packagesTotal + originalAddonsTotal - discount))}</span>
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
        {hasDp && (
          <>
            <div className="flex justify-between text-sm border-t border-maroon-200 pt-2 text-blue-700">
              <span>DP {dpIsLunas ? "(Lunas)" : "(Belum Lunas)"}</span>
              <span>− {formatRupiah(dpAmount!)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${isFullyPaid ? "text-green-700" : "text-maroon-800"}`}>
              <span>Sisa Tagihan</span>
              <span>{isFullyPaid ? formatRupiah(0) : formatRupiah(Math.max(0, total - dpAmount!))}</span>
            </div>
          </>
        )}

        {/* Lunas Semua */}
        <div className="border-t border-maroon-200 pt-3 mt-1">
          {isFullyPaid ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Lunas Semua</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowCancelLunasDialog(true)}
                disabled={cancelingPaid}
              >
                Batalkan Lunas
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleMarkFullyPaid}
              disabled={markingPaid}
              className="w-full bg-green-700 hover:bg-green-600 text-white gap-2"
              size="sm"
            >
              {markingPaid ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Lunas Semua
            </Button>
          )}
        </div>
      </div>

      {/* Dialog: Batalkan Lunas Semua */}
      <AlertDialog open={showCancelLunasDialog} onOpenChange={setShowCancelLunasDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Lunas Semua?</AlertDialogTitle>
            <AlertDialogDescription>
              Status booking akan direset ke <strong>BOOKED</strong>, DP dan semua add-on akan
              ditandai belum lunas. Tandai ulang pembayaran secara manual setelahnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelingPaid}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelFullyPaid}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelingPaid}
            >
              {cancelingPaid && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Batalkan Lunas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
