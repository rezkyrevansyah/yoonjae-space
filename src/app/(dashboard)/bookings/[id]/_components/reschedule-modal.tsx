"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { createClient } from "@/utils/supabase/client";
import { generateTimeSlots, formatTime, formatDate, toDateStr } from "@/lib/utils";
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
export function RescheduleModal({ open, onClose, booking, currentUser, onRescheduled }: Props) {
  const { toast } = useToast();
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [displayMonth, setDisplayMonth] = useState<Date>(now);
  const [overridePastDates, setOverridePastDates] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [settingsGeneral, setSettingsGeneral] = useState<{ open_time: string; close_time: string; time_slot_interval: number } | null>(null);

  // Fetch settings once
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("settings_general")
          .select("open_time, close_time, time_slot_interval")
          .eq("lock", true)
          .maybeSingle();
        setSettingsGeneral(data ?? { open_time: "09:00", close_time: "21:00", time_slot_interval: 30 });
      } catch {
        setSettingsGeneral({ open_time: "09:00", close_time: "21:00", time_slot_interval: 30 });
      }
    })();
  }, [open]);

  // Fetch bookings for selected date (exclude current booking)
  useEffect(() => {
    if (!selectedDate) { setExistingSlots([]); return; }
    const dateStr = toDateStr(selectedDate);
    (async () => {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("id, start_time, end_time, customers(name)")
          .eq("booking_date", dateStr)
          .neq("status", "CANCELED")
          .neq("id", booking.id);
        setExistingSlots((data ?? []) as unknown as ExistingSlot[]);
      } catch {
        setExistingSlots([]);
      }
    })();
  }, [selectedDate, booking.id]);

  const openTime = settingsGeneral?.open_time ?? "09:00";
  const closeTime = settingsGeneral?.close_time ?? "21:00";
  const interval = settingsGeneral?.time_slot_interval ?? 30;
  const timeSlots = generateTimeSlots(openTime, closeTime, interval);

  // Derive duration from actual start/end stored in the booking (includes all addon extra times)
  const durationMins = timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time);

  function handleMonthChange(month: Date) {
    setDisplayMonth(month);
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    setSelectedDate(firstOfMonth);
    setSelectedTime("");
  }

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
    setDisplayMonth(new Date());
    setOverridePastDates(false);
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
        </DialogHeader>

        <div className="space-y-4">
          {/* Past dates toggle */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Input tanggal masa lalu</p>
              <p className="text-xs text-gray-500">Aktifkan jika reschedule ke tanggal yang sudah lewat</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !overridePastDates;
                setOverridePastDates(next);
                if (!next) {
                  setDisplayMonth(new Date());
                  setSelectedDate(undefined);
                  setSelectedTime("");
                }
              }}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                overridePastDates ? "bg-amber-500" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                  overridePastDates ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {overridePastDates && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">Mode tanggal masa lalu — semua tanggal diizinkan</p>
            </div>
          )}

          {/* Date picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pilih Tanggal Baru</p>
            <div className="flex justify-center border rounded-lg p-2">
              <DayPicker
                mode="single"
                month={displayMonth}
                onMonthChange={handleMonthChange}
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) setDisplayMonth(date);
                  setSelectedTime("");
                }}
                captionLayout="dropdown"
                startMonth={new Date(2015, 0)}
                endMonth={new Date(now.getFullYear() + 2, 11)}
                disabled={(date) => {
                  if (overridePastDates) return false;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
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

              {/* Old vs New schedule comparison */}
              {selectedTime ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-400 font-medium mb-1">Jadwal Lama</p>
                    <p className="text-sm font-semibold text-gray-700">{formatDate(booking.booking_date)}</p>
                    <p className="text-xs text-gray-500">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p>
                  </div>
                  <div className="p-3 bg-maroon-50 rounded-lg border border-maroon-200">
                    <p className="text-xs text-maroon-600 font-medium mb-1">Jadwal Baru</p>
                    <p className="text-sm font-semibold text-maroon-800">{formatDate(dateStr)}</p>
                    <p className="text-xs text-maroon-600">{formatTime(selectedTime)} – {formatTime(newEndTime)} ({durationMins} mnt)</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 font-medium mb-1">Jadwal Saat Ini</p>
                  <p className="text-sm font-semibold text-gray-700">{formatDate(booking.booking_date)}</p>
                  <p className="text-xs text-gray-500">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p>
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
