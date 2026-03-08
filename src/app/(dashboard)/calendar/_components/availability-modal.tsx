"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { generateTimeSlots } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock } from "lucide-react";

const supabase = createClient();

interface BookedSlot {
  start_time: string;
  end_time: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  date: Date;
  openTime: string;
  closeTime: string;
  timeSlotInterval: number;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function AvailabilityModal({ open, onClose, date, openTime, closeTime, timeSlotInterval }: Props) {
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const dateStr = toDateStr(date);

  const fetchBooked = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("booking_date", dateStr)
      .neq("status", "CANCELED");
    setBookedSlots((data ?? []) as BookedSlot[]);
    setLoading(false);
  }, [dateStr]);

  useEffect(() => {
    if (open) fetchBooked();
  }, [open, fetchBooked]);

  const timeSlots = generateTimeSlots(openTime, closeTime, timeSlotInterval);

  const dateLabel = date.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#8B1A1A]" />
            Ketersediaan Jam
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-4 gap-2 py-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : timeSlots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Tidak ada slot waktu tersedia.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const slotMins = timeToMinutes(slot);
                const isBooked = bookedSlots.some(
                  (b) => slotMins >= timeToMinutes(b.start_time) && slotMins < timeToMinutes(b.end_time)
                );
                return (
                  <div
                    key={slot}
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-sm font-medium text-center select-none",
                      isBooked
                        ? "bg-gray-200 text-gray-400 border-gray-200"
                        : "bg-green-50 text-green-700 border-green-200"
                    )}
                  >
                    {slot.slice(0, 5)}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" />
                Tersedia
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
                Sudah ada booking
              </span>
            </div>

            {/* Summary */}
            <p className="text-xs text-center text-gray-400">
              {timeSlots.filter(slot => {
                const slotMins = timeToMinutes(slot);
                return !bookedSlots.some(
                  (b) => slotMins >= timeToMinutes(b.start_time) && slotMins < timeToMinutes(b.end_time)
                );
              }).length} dari {timeSlots.length} slot tersedia
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
