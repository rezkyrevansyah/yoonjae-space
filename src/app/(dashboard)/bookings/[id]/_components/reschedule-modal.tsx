"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { createClient } from "@/utils/supabase/client";
import { generateTimeSlots, formatTime, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CalendarClock, Loader2 } from "lucide-react";
import { Chevron } from "react-day-picker";
import type { BookingDetail } from "./booking-detail-client";
import type { CurrentUser } from "@/lib/types/database";

const supabase = createClient();

interface ExistingSlot {
  id: string;
  start_time: string;
  end_time: string;
  customers: { name: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  booking: BookingDetail;
  currentUser: CurrentUser;
  onRescheduled: (newDate: string, newStart: string, newEnd: string) => void;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function RescheduleModal({ open, onClose, booking, currentUser, onRescheduled }: Props) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [settingsGeneral, setSettingsGeneral] = useState<{ open_time: string; close_time: string; time_slot_interval: number } | null>(null);

  // Fetch settings once
  useEffect(() => {
    if (!open) return;
    supabase
      .from("settings_general")
      .select("open_time, close_time, time_slot_interval")
      .eq("lock", true)
      .maybeSingle()
      .then(({ data }) => {
        setSettingsGeneral(data ?? { open_time: "09:00", close_time: "21:00", time_slot_interval: 30 });
      });
  }, [open]);

  // Fetch bookings for selected date (exclude current booking)
  useEffect(() => {
    if (!selectedDate) { setExistingSlots([]); return; }
    const dateStr = toDateStr(selectedDate);
    supabase
      .from("bookings")
      .select("id, start_time, end_time, customers(name)")
      .eq("booking_date", dateStr)
      .neq("status", "CANCELED")
      .neq("id", booking.id)
      .then(({ data }) => {
        setExistingSlots((data ?? []) as unknown as ExistingSlot[]);
      });
  }, [selectedDate, booking.id]);

  const openTime = settingsGeneral?.open_time ?? "09:00";
  const closeTime = settingsGeneral?.close_time ?? "21:00";
  const interval = settingsGeneral?.time_slot_interval ?? 30;
  const timeSlots = generateTimeSlots(openTime, closeTime, interval);
  const durationMins = booking.packages?.duration_minutes ?? 60;

  function isSlotBooked(slot: string): boolean {
    const slotMins = timeToMinutes(slot);
    return existingSlots.some(
      (b) => slotMins >= timeToMinutes(b.start_time) && slotMins < timeToMinutes(b.end_time)
    );
  }

  function getConflict(slot: string): ExistingSlot | undefined {
    const newStart = timeToMinutes(slot);
    const newEnd = newStart + durationMins;
    return existingSlots.find((b) => {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);
      return newStart < bEnd && newEnd > bStart;
    });
  }

  const conflictBooking = selectedTime ? getConflict(selectedTime) : undefined;
  const newEndTime = selectedTime ? minutesToTime(timeToMinutes(selectedTime) + durationMins) : "";
  const dateStr = selectedDate ? toDateStr(selectedDate) : "";
  const canSubmit = !!selectedDate && !!selectedTime;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const oldDate = booking.booking_date;
      const oldStart = booking.start_time;
      const oldEnd = booking.end_time;

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_date: dateStr,
          start_time: selectedTime,
          end_time: newEndTime,
          is_rescheduled: true,
        })
        .eq("id", booking.id);
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Reschedule booking ${booking.booking_number}: ${formatDate(oldDate)} ${formatTime(oldStart)}–${formatTime(oldEnd)} → ${formatDate(dateStr)} ${formatTime(selectedTime)}–${formatTime(newEndTime)}`,
      });

      toast({ title: "Berhasil", description: `Booking direscheduled ke ${formatDate(dateStr)} ${formatTime(selectedTime)}` });
      onRescheduled(dateStr, selectedTime, newEndTime);
      onClose();
    } catch {
      toast({ title: "Error", description: "Gagal melakukan reschedule", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    setSelectedDate(undefined);
    setSelectedTime("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#8B1A1A]" />
            Reschedule Booking
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            Jadwal saat ini: <span className="font-medium">{formatDate(booking.booking_date)}</span>, {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pilih Tanggal Baru</p>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => { setSelectedDate(date); setSelectedTime(""); }}
                disabled={{ before: new Date() }}
                components={{ Chevron: (props) => <Chevron {...props} /> }}
                classNames={{
                  selected: "!bg-[#8B1A1A] !text-white !rounded-full",
                  today: "font-bold text-[#8B1A1A]",
                  day_button: "rounded-full",
                }}
              />
            </div>
          </div>

          {/* Time slot grid */}
          {selectedDate && !settingsGeneral ? (
            <p className="text-xs text-gray-400 text-center">Memuat jadwal...</p>
          ) : selectedDate && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Pilih Waktu Mulai</p>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => {
                  const booked = isSlotBooked(slot);
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "bg-[#8B1A1A] text-white border-[#8B1A1A]"
                          : booked
                            ? "bg-gray-200 text-gray-400 border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#8B1A1A]/40 hover:bg-red-50"
                      )}
                    >
                      {formatTime(slot)}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#8B1A1A] inline-block" /> Dipilih
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Sudah ada booking
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Tersedia
                </span>
              </div>

              {/* Selected summary */}
              {selectedTime && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium text-gray-700">
                    Jadwal baru: {formatDate(dateStr)}, {formatTime(selectedTime)} – {formatTime(newEndTime)}
                    {" "}({durationMins} mnt)
                  </p>
                </div>
              )}

              {/* Conflict warning */}
              {conflictBooking && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Perhatian: Jam Bertabrakan</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      <span className="font-medium">{conflictBooking.customers?.name ?? "Customer lain"}</span> sudah booking jam {formatTime(conflictBooking.start_time)}–{formatTime(conflictBooking.end_time)}.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Booking tetap bisa disimpan — pastikan koordinasi ruangan sudah oke.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>Batal</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="bg-[#8B1A1A] hover:bg-[#B22222] gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Reschedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
