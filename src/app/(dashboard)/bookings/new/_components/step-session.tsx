"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Label } from "@/components/ui/label";
import { generateTimeSlots, formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SessionFormData } from "./new-booking-client";
import type { SettingsGeneral, StudioHoliday } from "@/lib/types/database";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Chevron } from "react-day-picker";
import { createClient } from "@/utils/supabase/client";

export interface ExistingBooking {
  start_time: string;
  end_time: string;
  customers: { name: string } | null;
  booking_addons: { addons: { name: string; need_extra_time: boolean; extra_time_minutes: number; extra_time_position: string } | null }[];
}

interface ConflictInfo {
  customerName: string;
  startTime: string;
  endTime: string;
  effectiveStart: string;
  addonNames: string[];
}

interface Props {
  sessionData: SessionFormData;
  onChange: (data: SessionFormData) => void;
  settingsGeneral: SettingsGeneral | null;
  holidays: StudioHoliday[];
  onExistingBookingsLoaded?: (bookings: ExistingBooking[]) => void;
}

function isHoliday(dateStr: string, holidays: StudioHoliday[]): StudioHoliday | undefined {
  return holidays.find((h) => {
    const d = new Date(dateStr);
    const start = new Date(h.start_date);
    const end = new Date(h.end_date);
    return d >= start && d <= end;
  });
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function getEffectiveStartMinutes(b: ExistingBooking): number {
  let start = timeToMinutes(b.start_time);
  for (const ba of b.booking_addons) {
    if (ba.addons?.need_extra_time && ba.addons.extra_time_position === "before") {
      start -= ba.addons.extra_time_minutes;
    }
  }
  return start;
}

export function StepSession({ sessionData, onChange, settingsGeneral, holidays, onExistingBookingsLoaded }: Props) {
  const supabase = createClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    sessionData.booking_date ? new Date(sessionData.booking_date + "T00:00:00") : undefined
  );
  const [existingBookings, setExistingBookings] = useState<(ExistingBooking & { customers: { name: string } | null })[]>([]);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Fetch bookings for selected date
  useEffect(() => {
    if (!sessionData.booking_date) { setExistingBookings([]); setConflictInfo(null); onExistingBookingsLoaded?.([]); return; }
    supabase
      .from("bookings")
      .select("start_time, end_time, customers(name), booking_addons(addons(name, need_extra_time, extra_time_minutes, extra_time_position))")
      .eq("booking_date", sessionData.booking_date)
      .neq("status", "CANCELED")
      .then(({ data }) => {
        const bookings = (data ?? []) as unknown as ExistingBooking[];
        setExistingBookings(bookings as (ExistingBooking & { customers: { name: string } | null })[]);
        onExistingBookingsLoaded?.(bookings);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData.booking_date]);

  const openTime = settingsGeneral?.open_time ?? "08:00";
  const closeTime = settingsGeneral?.close_time ?? "17:00";
  const interval = settingsGeneral?.time_slot_interval ?? 30;

  const timeSlots = generateTimeSlots(openTime, closeTime, interval);

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    if (date) {
      onChange({ ...sessionData, booking_date: toDateStr(date), start_time: "" });
    }
  }

  const holidayMatch = selectedDate
    ? isHoliday(toDateStr(selectedDate), holidays)
    : undefined;

  // Disable past dates
  function isDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Check conflict when a time slot is selected
  function handleTimeSelect(slot: string) {
    onChange({ ...sessionData, start_time: slot });
    setConflictInfo(null);
    if (!existingBookings.length) return;

    // New booking: we don't know end time yet (no package selected),
    // so check if slot overlaps with any existing booking's effective window
    const newStart = timeToMinutes(slot);

    for (const b of existingBookings) {
      const existingEffStart = getEffectiveStartMinutes(b);
      const existingEnd = timeToMinutes(b.end_time);
      // New booking starts inside an existing booking's effective window
      if (newStart >= existingEffStart && newStart < existingEnd) {
        const beforeAddons = b.booking_addons.filter(
          ba => ba.addons?.need_extra_time && ba.addons.extra_time_position === "before"
        );
        setConflictInfo({
          customerName: b.customers?.name ?? "Customer lain",
          startTime: b.start_time,
          endTime: b.end_time,
          effectiveStart: minutesToTime(existingEffStart),
          addonNames: beforeAddons.map(ba => ba.addons!.name ?? "add-on"),
        });
        return;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Pilih Sesi</h2>
        <p className="text-sm text-gray-500">Tentukan tanggal dan waktu sesi foto</p>
      </div>

      <div>
        <Label className="mb-2 block">Tanggal <span className="text-red-500">*</span></Label>
        <div className="border rounded-lg p-2 flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={isDisabled}
            components={{ Chevron }}
            classNames={{
              selected: "bg-maroon-700 text-white rounded-md",
              today: "font-bold text-maroon-700",
            }}
          />
        </div>
      </div>

      {holidayMatch && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Studio Tutup</p>
            <p className="text-sm text-red-600">{holidayMatch.label}</p>
          </div>
        </div>
      )}

      {sessionData.booking_date && !holidayMatch && (
        <div>
          <Label className="mb-2 block">
            Waktu Mulai <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => handleTimeSelect(slot)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                  sessionData.start_time === slot
                    ? "bg-maroon-700 text-white border-maroon-700"
                    : "bg-white text-gray-700 border-gray-200 hover:border-maroon-300 hover:bg-maroon-50"
                )}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>
      )}

      {conflictInfo && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Perhatian: Jam Bertabrakan</p>
            <p className="text-sm text-amber-700 mt-0.5">
              <span className="font-medium">{conflictInfo.customerName}</span> sudah booking jam {formatTime(conflictInfo.startTime)}–{formatTime(conflictInfo.endTime)}.
              {conflictInfo.addonNames.length > 0 && (
                <> Karena add-on <span className="font-medium">{conflictInfo.addonNames.join(", ")}</span>, mereka akan tiba lebih awal sejak jam {formatTime(conflictInfo.effectiveStart)}.</>
              )}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Booking tetap bisa dibuat — pastikan koordinasi ruangan sudah oke dengan owner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
