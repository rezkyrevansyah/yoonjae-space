"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/utils";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
} from "@/lib/constants";
import type { BookingStatus, CurrentUser } from "@/lib/types/database";
import type { CalendarBooking } from "./calendar-client";
import {
  X,
  User,
  CalendarDays,
  Clock,
  Package,
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BOOKING_FLOW: BookingStatus[] = [
  "BOOKED", "PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "CLOSED",
];

interface Props {
  booking: CalendarBooking;
  currentUser: CurrentUser;
  onClose: () => void;
  onStatusUpdate: (id: string, status: BookingStatus) => void;
}

const supabase = createClient();

export function BookingPopup({ booking, currentUser, onClose, onStatusUpdate }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BookingStatus>(booking.status);

  const currentIdx = BOOKING_FLOW.indexOf(status);
  const canNext = currentIdx < BOOKING_FLOW.length - 1;
  const canBack = currentIdx > 0;

  async function changeStatus(newStatus: BookingStatus) {
    setLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", booking.id);
    if (error) {
      toast({ title: "Error", description: "Gagal mengubah status", variant: "destructive" });
      setLoading(false);
      return;
    }
    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "UPDATE",
      entity: "bookings",
      entity_id: booking.id,
      description: `Status booking diubah ke ${BOOKING_STATUS_LABEL[newStatus]} (dari Calendar)`,
    });
    setStatus(newStatus);
    onStatusUpdate(booking.id, newStatus);
    setLoading(false);
    toast({ title: "Status diperbarui", description: BOOKING_STATUS_LABEL[newStatus] });
  }

  const durationMin = (() => {
    const [sh, sm] = booking.start_time.split(":").map(Number);
    const [eh, em] = booking.end_time.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 ${BOOKING_STATUS_COLOR[status]}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono opacity-70">{booking.booking_number}</p>
              <h2 className="font-bold text-base">{booking.customers?.name ?? "Customer"}</h2>
            </div>
            <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
          <span className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[status]}`}>
            {BOOKING_STATUS_LABEL[status]}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <InfoRow icon={<CalendarDays className="h-4 w-4" />} value={formatDate(booking.booking_date)} />
          <InfoRow
            icon={<Clock className="h-4 w-4" />}
            value={`${formatTime(booking.start_time)} — ${formatTime(booking.end_time)} (${durationMin} menit)`}
          />
          {booking.booking_packages.length > 0 ? (
            <div className="flex gap-2 text-sm text-gray-700">
              <span className="text-gray-400 flex-shrink-0 mt-0.5"><Package className="h-4 w-4" /></span>
              <div className="flex flex-col gap-0.5">
                {booking.booking_packages.map((bp) => (
                  <span key={bp.id}>
                    {bp.packages?.name ?? "-"}
                    {bp.quantity > 1 && (
                      <span className="ml-1 text-xs text-gray-400">×{bp.quantity}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <InfoRow icon={<Package className="h-4 w-4" />} value={booking.packages?.name ?? "-"} />
          )}
          <InfoRow icon={<Users className="h-4 w-4" />} value={`${booking.person_count} orang`} />
          {booking.photo_for && (
            <InfoRow icon={<User className="h-4 w-4" />} value={`Foto untuk: ${booking.photo_for.name}`} />
          )}

          {/* Backgrounds */}
          {booking.booking_backgrounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {booking.booking_backgrounds.map((b, i) => (
                <span key={i} className="text-xs bg-[#FEF2F2] text-[#8B1A1A] px-2 py-0.5 rounded-full border border-[#8B1A1A]/20">
                  {b.backgrounds?.name}
                </span>
              ))}
            </div>
          )}

          {/* Add-ons */}
          {booking.booking_addons.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-1">Add-ons</p>
              <div className="flex flex-wrap gap-1.5">
                {booking.booking_addons.map((a, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {a.addons?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {booking.behind_the_scenes && (
            <p className="text-xs text-purple-600 font-medium">BTS ✓</p>
          )}

          {booking.notes && (
            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-1">Catatan</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{booking.notes}</p>
            </div>
          )}

          {/* Custom Fields */}
          {booking.booking_custom_fields.length > 0 && (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Informasi Tambahan</p>
              <div className="space-y-1.5">
                {booking.booking_custom_fields.map((cf) => (
                  <div key={cf.custom_field_id} className="flex justify-between text-sm gap-3">
                    <span className="text-gray-500 flex-shrink-0">{cf.custom_fields?.label ?? cf.custom_field_id}</span>
                    <span className="text-gray-800 text-right">{cf.value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Status navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canBack || loading}
              onClick={() => changeStatus(BOOKING_FLOW[currentIdx - 1])}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {canBack ? BOOKING_STATUS_LABEL[BOOKING_FLOW[currentIdx - 1]] : "Back"}
            </Button>
            <Button
              size="sm"
              disabled={!canNext || loading}
              onClick={() => changeStatus(BOOKING_FLOW[currentIdx + 1])}
              className="flex-1 bg-[#8B1A1A] hover:bg-[#B22222]"
            >
              {canNext ? BOOKING_STATUS_LABEL[BOOKING_FLOW[currentIdx + 1]] : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Bottom buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
              Tutup
            </Button>
            <Button asChild size="sm" className="flex-1 bg-gray-800 hover:bg-gray-700">
              <Link href={`/bookings/${booking.id}`} target="_blank">
                Lihat Detail
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span>{value}</span>
    </div>
  );
}
