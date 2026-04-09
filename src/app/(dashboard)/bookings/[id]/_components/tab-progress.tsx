"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, PRINT_ORDER_STATUS_LABEL } from "@/lib/constants";
import type { BookingDetail } from "./booking-detail-client";
import type { CurrentUser, BookingStatus, PrintOrderStatus } from "@/lib/types/database";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  XCircle,
  Printer,
  Link as LinkIcon,
  Loader2,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

const supabase = createClient();

const BOOKING_FLOW: BookingStatus[] = [
  "BOOKED",
  "PAID",
  "SHOOT_DONE",
  "PHOTOS_DELIVERED",
  "CLOSED",
];

const PRINT_FLOW: PrintOrderStatus[] = [
  "SELECTION",
  "VENDOR",
  "PRINTING",
  "RECEIVE",
  "PACKING",
  "SHIPPED",
  "DONE",
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  booking: BookingDetail;
  currentUser: CurrentUser;
  onUpdate: (updated: Partial<BookingDetail>) => void;
}

function hasStatusPermission(from: BookingStatus, to: BookingStatus, currentUser: CurrentUser): boolean {
  if (currentUser.is_primary) return true;
  if (currentUser.menu_access.includes("booking_full_access")) return true;
  return currentUser.menu_access.includes(`sc:${from}:${to}`);
}

export function TabProgress({ booking, currentUser, onUpdate }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState(booking.google_drive_link ?? "");
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const canCancel = currentUser.is_primary || currentUser.menu_access.includes("booking_full_access") || currentUser.menu_access.includes("sc:cancel");

  // Date tracking
  const [statusDate, setStatusDate] = useState("");
  const [printDate, setPrintDate] = useState("");
  const [deliverDate, setDeliverDate] = useState("");
  const [statusDates, setStatusDates] = useState<Record<string, string>>({});

  const effectiveStatus: BookingStatus =
    booking.status === "ADDON_UNPAID" ? "PHOTOS_DELIVERED" : booking.status;
  const currentStatusIdx = BOOKING_FLOW.indexOf(effectiveStatus);
  const currentPrintIdx = booking.print_order_status
    ? PRINT_FLOW.indexOf(booking.print_order_status)
    : -1;
  const isCanceled = booking.status === "CANCELED";

  // Fetch saved dates on mount
  useEffect(() => {
    supabase
      .from("booking_status_dates")
      .select("status_type, status_date")
      .eq("booking_id", booking.id)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: { status_type: string; status_date: string }) => {
          map[r.status_type] = r.status_date;
        });
        setStatusDates(map);
      });
  }, [booking.id]);

  async function saveStatusDate(statusType: string, date: string) {
    if (!date) return;
    await supabase.from("booking_status_dates").upsert(
      { booking_id: booking.id, status_type: statusType, status_date: date },
      { onConflict: "booking_id,status_type" }
    );
    setStatusDates((prev) => ({ ...prev, [statusType]: date }));
  }

  async function updateStatus(newStatus: BookingStatus, date?: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", booking.id);
      if (error) throw error;

      await saveStatusDate(newStatus, date ?? "");

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Status booking ${booking.booking_number}: ${BOOKING_STATUS_LABEL[booking.status]} → ${BOOKING_STATUS_LABEL[newStatus]}`,
      });

      onUpdate({ status: newStatus });
      setStatusDate("");
      toast({ title: "Status diperbarui", description: BOOKING_STATUS_LABEL[newStatus] });
    } catch {
      toast({ title: "Error", description: "Gagal memperbarui status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeliver() {
    const rawLink = driveLink.trim();
    if (!rawLink) {
      toast({ title: "Error", description: "Isi Google Drive link terlebih dahulu", variant: "destructive" });
      return;
    }
    const normalizedLink = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "PHOTOS_DELIVERED", google_drive_link: normalizedLink })
        .eq("id", booking.id);
      if (error) throw error;

      await saveStatusDate("PHOTOS_DELIVERED", deliverDate);

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Foto dikirim untuk booking ${booking.booking_number}`,
      });

      onUpdate({ status: "PHOTOS_DELIVERED", google_drive_link: normalizedLink });
      setShowDriveDialog(false);
      setDeliverDate("");
      toast({ title: "Foto berhasil dikirim!", description: "Status → Photos Delivered" });
    } catch {
      toast({ title: "Error", description: "Gagal deliver foto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function updatePrintStatus(newStatus: PrintOrderStatus, date?: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ print_order_status: newStatus })
        .eq("id", booking.id);
      if (error) throw error;

      await saveStatusDate(newStatus, date ?? "");

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Print order ${booking.booking_number}: ${booking.print_order_status ?? "START"} → ${PRINT_ORDER_STATUS_LABEL[newStatus]}`,
      });

      onUpdate({ print_order_status: newStatus });
      setPrintDate("");
      toast({ title: "Print status diperbarui", description: PRINT_ORDER_STATUS_LABEL[newStatus] });
    } catch {
      toast({ title: "Error", description: "Gagal memperbarui print status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function startPrint() {
    await updatePrintStatus("SELECTION", printDate || undefined);
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Booking Status Stepper */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Status Booking</h3>

        {/* Stepper */}
        <div className="relative">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-maroon-600 transition-all"
            style={{
              width: isCanceled
                ? "0%"
                : `${(currentStatusIdx / (BOOKING_FLOW.length - 1)) * 100}%`,
            }}
          />
          <div className="relative flex justify-between">
            {BOOKING_FLOW.map((status, idx) => {
              const isPast = idx < currentStatusIdx;
              const isCurrent = idx === currentStatusIdx && !isCanceled;
              const savedDate = statusDates[status]
                ?? (status === "BOOKED" ? booking.created_at.slice(0, 10) : undefined)
                ?? (status === "PAID" ? booking.booking_date : undefined);
              return (
                <div key={status} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white z-10",
                      isPast || isCurrent ? "border-maroon-600" : "border-gray-300"
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="h-5 w-5 text-maroon-600" />
                    ) : isCurrent ? (
                      <Circle className="h-3 w-3 fill-maroon-600 text-maroon-600" />
                    ) : (
                      <Circle className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs text-center leading-tight max-w-[60px]",
                    isCurrent ? "text-maroon-700 font-semibold" : isPast ? "text-maroon-500" : "text-gray-400"
                  )}>
                    {BOOKING_STATUS_LABEL[status]}
                  </span>
                  {savedDate && (
                    <span className="text-[10px] text-gray-400 leading-none text-center max-w-[60px]">
                      {formatDate(savedDate)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isCanceled && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Booking ini telah dibatalkan</span>
          </div>
        )}

        {booking.status === "ADDON_UNPAID" && (
          <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3 text-orange-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Ada extra add-on yang belum lunas. Cek tab <strong>Pricing</strong>.
          </div>
        )}

        {/* Action buttons */}
        {!isCanceled && (
          <div className="space-y-3">
            {/* SHOOT_DONE → PHOTOS_DELIVERED: need drive link */}
            {booking.status === "SHOOT_DONE" && (
              <>
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => updateStatus("PAID")}
                  disabled={loading || !hasStatusPermission("SHOOT_DONE", "PAID", currentUser)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Kembali ke Paid
                </Button>
                <Button
                  className="w-full gap-2 bg-maroon-700 hover:bg-maroon-600 text-white disabled:opacity-50"
                  onClick={() => setShowDriveDialog(true)}
                  disabled={!hasStatusPermission("SHOOT_DONE", "PHOTOS_DELIVERED", currentUser)}
                >
                  <LinkIcon className="h-4 w-4" />
                  Input Link Foto & Deliver
                </Button>
              </>
            )}

            {/* Date input for next status (non SHOOT_DONE) */}
            {booking.status !== "SHOOT_DONE" && currentStatusIdx < BOOKING_FLOW.length - 1 && (
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500 mb-1 block">
                    Tanggal {BOOKING_STATUS_LABEL[BOOKING_FLOW[currentStatusIdx + 1]]} (opsional)
                  </Label>
                  <input
                    type="date"
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setStatusDate(todayStr())}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </Button>
              </div>
            )}

            {/* Next / Back buttons */}
            {booking.status !== "SHOOT_DONE" && (
              <div className="flex gap-2">
                {currentStatusIdx > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => updateStatus(BOOKING_FLOW[currentStatusIdx - 1])}
                    disabled={loading || !hasStatusPermission(effectiveStatus, BOOKING_FLOW[currentStatusIdx - 1], currentUser)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {BOOKING_STATUS_LABEL[BOOKING_FLOW[currentStatusIdx - 1]]}
                  </Button>
                )}
                {currentStatusIdx < BOOKING_FLOW.length - 1 && (
                  <Button
                    className="flex-1 gap-1 bg-maroon-700 hover:bg-maroon-600 text-white disabled:opacity-50"
                    onClick={() => updateStatus(BOOKING_FLOW[currentStatusIdx + 1], statusDate || undefined)}
                    disabled={loading || !hasStatusPermission(effectiveStatus, BOOKING_FLOW[currentStatusIdx + 1], currentUser)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {BOOKING_STATUS_LABEL[BOOKING_FLOW[currentStatusIdx + 1]]}
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Cancel */}
            {booking.status !== "CLOSED" && booking.status !== "CANCELED" && (
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:bg-red-50 disabled:opacity-50"
                onClick={() => setShowCancelConfirm(true)}
                disabled={loading || !canCancel}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Batalkan Booking
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <span className="font-mono font-medium">{booking.booking_number}</span> akan
              dibatalkan. Status akan berubah menjadi{" "}
              <span className="font-medium text-red-600">Canceled</span>. Tindakan ini dapat
              dikembalikan dengan mengubah status secara manual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Tidak, Kembali</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                setShowCancelConfirm(false);
                await updateStatus("CANCELED");
              }}
              disabled={loading}
            >
              Ya, Batalkan Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drive Link Dialog */}
      <Dialog open={showDriveDialog} onOpenChange={(open) => { if (!open) { setShowDriveDialog(false); setDeliverDate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-maroon-700" />
              Input Link Foto & Deliver
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="mb-2 block">Google Drive Link</Label>
              <Input
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Tanggal Photos Delivered (opsional)</Label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deliverDate}
                  onChange={(e) => setDeliverDate(e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setDeliverDate(todayStr())}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDriveDialog(false); setDeliverDate(""); }} disabled={loading}>
              Batal
            </Button>
            <Button
              className="bg-maroon-700 hover:bg-maroon-600 text-white"
              onClick={handleDeliver}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deliver Foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Order */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Printer className="h-4 w-4 text-maroon-700" />
          Print Order
        </h3>

        {!booking.print_order_status ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Belum ada print order untuk booking ini.</p>
            {/* Date input for starting print */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs text-gray-500 mb-1 block">
                  Tanggal Selection (opsional)
                </Label>
                <input
                  type="date"
                  value={printDate}
                  onChange={(e) => setPrintDate(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => setPrintDate(todayStr())}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Today
              </Button>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={startPrint}
              disabled={loading}
            >
              <Printer className="h-4 w-4" />
              Mulai Print Order
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Print stepper */}
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-blue-500 transition-all"
                style={{
                  width: `${(currentPrintIdx / (PRINT_FLOW.length - 1)) * 100}%`,
                }}
              />
              <div className="relative flex justify-between">
                {PRINT_FLOW.map((status, idx) => {
                  const isPast = idx < currentPrintIdx;
                  const isCurrent = idx === currentPrintIdx;
                  const savedDate = statusDates[status];
                  return (
                    <div key={status} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white z-10",
                          isPast || isCurrent ? "border-blue-500" : "border-gray-300"
                        )}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        ) : isCurrent ? (
                          <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                        ) : (
                          <Circle className="h-3 w-3 text-gray-300" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs text-center leading-tight max-w-[50px]",
                        isCurrent ? "text-blue-700 font-semibold" : isPast ? "text-blue-400" : "text-gray-400"
                      )}>
                        {PRINT_ORDER_STATUS_LABEL[status]}
                      </span>
                      {savedDate && (
                        <span className="text-[10px] text-gray-400 leading-none text-center max-w-[50px]">
                          {formatDate(savedDate)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date input for next print step */}
            {currentPrintIdx < PRINT_FLOW.length - 1 && (
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-gray-500 mb-1 block">
                    Tanggal {PRINT_ORDER_STATUS_LABEL[PRINT_FLOW[currentPrintIdx + 1]]} (opsional)
                  </Label>
                  <input
                    type="date"
                    value={printDate}
                    onChange={(e) => setPrintDate(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setPrintDate(todayStr())}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </Button>
              </div>
            )}

            {/* Print nav */}
            <div className="flex gap-2">
              {currentPrintIdx > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => updatePrintStatus(PRINT_FLOW[currentPrintIdx - 1])}
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {PRINT_ORDER_STATUS_LABEL[PRINT_FLOW[currentPrintIdx - 1]]}
                </Button>
              )}
              {currentPrintIdx < PRINT_FLOW.length - 1 && (
                <Button
                  className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => updatePrintStatus(PRINT_FLOW[currentPrintIdx + 1], printDate || undefined)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {PRINT_ORDER_STATUS_LABEL[PRINT_FLOW[currentPrintIdx + 1]]}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
