"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR, PRINT_ORDER_STATUS_LABEL } from "@/lib/constants";
import type { CurrentUser, BookingStatus, PrintOrderStatus } from "@/lib/types/database";
import type { BookingDetail } from "@/app/(dashboard)/bookings/[id]/_components/booking-detail-client";
import { TabOverview } from "@/app/(dashboard)/bookings/[id]/_components/tab-overview";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  MessageCircle,
  User,
  Link as LinkIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

const supabase = createClient();

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

function hasStatusPermission(from: BookingStatus, to: BookingStatus, currentUser: CurrentUser): boolean {
  if (currentUser.is_primary) return true;
  if (currentUser.menu_access.includes("booking_full_access")) return true;
  return currentUser.menu_access.includes(`sc:${from}:${to}`);
}

interface Props {
  booking: BookingDetail;
  currentUser: CurrentUser;
}

export function PhotoDeliveryDetailClient({ booking: initialBooking, currentUser }: Props) {
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetail>(initialBooking);
  const [loading, setLoading] = useState(false);

  // Drive link state
  const [driveLink, setDriveLink] = useState(initialBooking.google_drive_link ?? "");
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [deliverDate, setDeliverDate] = useState("");

  // Print Order state
  const [printDate, setPrintDate] = useState("");
  const [statusDates, setStatusDates] = useState<Record<string, string>>({});

  const currentPrintIdx = booking.print_order_status
    ? PRINT_FLOW.indexOf(booking.print_order_status)
    : -1;

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
        description: `Foto dikirim untuk booking ${booking.booking_number} (dari Photo Delivery)`,
      });

      setBooking((prev) => ({ ...prev, status: "PHOTOS_DELIVERED", google_drive_link: normalizedLink }));
      setShowDriveDialog(false);
      setDeliverDate("");
      toast({ title: "Foto berhasil dikirim!", description: "Status → Photos Delivered" });
    } catch {
      toast({ title: "Error", description: "Gagal deliver foto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLink() {
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
        .update({ google_drive_link: normalizedLink })
        .eq("id", booking.id);
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Link foto diperbarui untuk booking ${booking.booking_number}`,
      });

      setBooking((prev) => ({ ...prev, google_drive_link: normalizedLink }));
      toast({ title: "Link berhasil diperbarui" });
    } catch {
      toast({ title: "Error", description: "Gagal memperbarui link", variant: "destructive" });
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

      setBooking((prev) => ({ ...prev, print_order_status: newStatus }));
      setPrintDate("");
      toast({ title: "Print status diperbarui", description: PRINT_ORDER_STATUS_LABEL[newStatus] });
    } catch {
      toast({ title: "Error", description: "Gagal memperbarui print status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const waPhone = booking.customers?.phone?.replace(/\D/g, "").replace(/^0/, "62");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
            <Link href="/photo-delivery">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <p className="font-mono text-sm text-gray-500">{booking.booking_number}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {booking.customers?.name ?? "—"}
              </h1>
              <Badge className={BOOKING_STATUS_COLOR[booking.status as BookingStatus]}>
                {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {waPhone && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50">
              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                WA
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={`/customer/${booking.id}`} target="_blank">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Customer</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="foto">
        <TabsList className="w-full">
          <TabsTrigger value="foto" className="flex-1">Foto & Print</TabsTrigger>
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
        </TabsList>

        {/* Foto & Print Tab */}
        <TabsContent value="foto" className="space-y-4 pt-2">
          {/* Google Drive Link Section */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-maroon-700" />
              Google Drive Link
            </h3>

            {booking.status === "SHOOT_DONE" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Foto belum dikirim. Input link dan deliver ke customer.</p>
                <Button
                  className="w-full gap-2 bg-maroon-700 hover:bg-maroon-600 text-white disabled:opacity-50"
                  onClick={() => setShowDriveDialog(true)}
                  disabled={!hasStatusPermission("SHOOT_DONE", "PHOTOS_DELIVERED", currentUser)}
                >
                  <LinkIcon className="h-4 w-4" />
                  Input Link Foto & Deliver
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {booking.google_drive_link && (
                  <a
                    href={/^https?:\/\//i.test(booking.google_drive_link) ? booking.google_drive_link : `https://${booking.google_drive_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {booking.google_drive_link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Perbarui Link</Label>
                  <Input
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleUpdateLink}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Link"}
                </Button>
              </div>
            )}
          </div>

          {/* Print Order Section */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Printer className="h-4 w-4 text-maroon-700" />
              Print Order
            </h3>

            {!booking.print_order_status ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Belum ada print order untuk booking ini.</p>
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
                  onClick={() => updatePrintStatus("SELECTION", printDate || undefined)}
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
                    style={{ width: `${(currentPrintIdx / (PRINT_FLOW.length - 1)) * 100}%` }}
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
                    <div className="flex-1">
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
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="pt-2">
          <TabOverview booking={booking} />
        </TabsContent>
      </Tabs>

      {/* Drive Link Dialog (for SHOOT_DONE deliver) */}
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
                  className="flex-1 min-w-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-maroon-400"
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
    </div>
  );
}
