"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Label } from "@/components/ui/label";
import { generateTimeSlots, formatTime, toDateStr } from "@/lib/utils";
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

interface SelectedPkg {
  package: { duration_minutes: number; need_extra_time: boolean; extra_time_minutes: number; extra_time_position: string | null };
  quantity: number;
}

interface SelectedAddon {
  addon: { need_extra_time: boolean; extra_time_minutes: number; extra_time_position: string };
  quantity: number;
}

interface Props {
  sessionData: SessionFormData;
  onChange: (data: SessionFormData) => void;
  settingsGeneral: SettingsGeneral | null;
  holidays: StudioHoliday[];
  onExistingBookingsLoaded?: (bookings: ExistingBooking[]) => void;
  allowPastDates?: boolean;
  selectedPackages?: SelectedPkg[];
  selectedAddons?: SelectedAddon[];
}

function isHoliday(dateStr: string, holidays: StudioHoliday[]): StudioHoliday | undefined {
  return holidays.find((h) => {
    const d = new Date(dateStr);
    const start = new Date(h.start_date);
    const end = new Date(h.end_date);
    return d >= start && d <= end;
  });
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

export function StepSession({ sessionData, onChange, settingsGeneral, holidays, onExistingBookingsLoaded, allowPastDates = false, selectedPackages = [], selectedAddons = [] }: Props) {
  const supabase = createClient();
  const now = new Date();
  const initDate = sessionData.booking_date ? new Date(sessionData.booking_date + "T00:00:00") : undefined;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initDate);
  const [displayMonth, setDisplayMonth] = useState<Date>(initDate ?? now);
  const [overridePastDates, setOverridePastDates] = useState(false);
  const [existingBookings, setExistingBookings] = useState<(ExistingBooking & { customers: { name: string } | null })[]>([]);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  const effectiveAllowPast = allowPastDates || overridePastDates;

  // Fetch bookings for selected date
  useEffect(() => {
    if (!sessionData.booking_date) { setExistingBookings([]); setConflictInfo(null); onExistingBookingsLoaded?.([]); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from("bookings")
          .select("start_time, end_time, customers(name), booking_addons(addons(name, need_extra_time, extra_time_minutes, extra_time_position))")
          .eq("booking_date", sessionData.booking_date)
          .neq("status", "CANCELED");
        const bookings = (data ?? []) as unknown as ExistingBooking[];
        setExistingBookings(bookings as (ExistingBooking & { customers: { name: string } | null })[]);
        onExistingBookingsLoaded?.(bookings);
      } catch {
        setExistingBookings([]);
        onExistingBookingsLoaded?.([]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData.booking_date]);

  const openTime = settingsGeneral?.open_time ?? "08:00";
  const closeTime = settingsGeneral?.close_time ?? "17:00";
  const interval = settingsGeneral?.time_slot_interval ?? 30;

  const timeSlots = generateTimeSlots(openTime, closeTime, interval);

  function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    if (date) {
      setDisplayMonth(date);
      onChange({ ...sessionData, booking_date: toDateStr(date), start_time: "" });
    }
  }

  function handleMonthChange(month: Date) {
    setDisplayMonth(month);
    // Auto-select tanggal 1 bulan baru
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    setSelectedDate(firstOfMonth);
    onChange({ ...sessionData, booking_date: toDateStr(firstOfMonth), start_time: "" });
  }

  const holidayMatch = selectedDate
    ? isHoliday(toDateStr(selectedDate), holidays)
    : undefined;

  // Disable past dates (skip if allowed)
  function isDisabled(date: Date): boolean {
    if (effectiveAllowPast) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Check conflict when a time slot is selected
  function handleTimeSelect(slot: string) {
    onChange({ ...sessionData, start_time: slot });
    setConflictInfo(null);
    if (!existingBookings.length) return;

    const newRange = getNewBookingRange(slot);

    if (!newRange) {
      // Package not yet selected — simple check: does start time fall inside an existing booking?
      const newStart = timeToMinutes(slot);
      for (const b of existingBookings) {
        const existingEffStart = getEffectiveStartMinutes(b);
        const existingEnd = timeToMinutes(b.end_time);
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
      return;
    }

    // Package selected — check full range overlap: A.start < B.end && A.end > B.start
    for (const b of existingBookings) {
      const existingEffStart = getEffectiveStartMinutes(b);
      const existingEnd = timeToMinutes(b.end_time);
      if (newRange.effStart < existingEnd && newRange.effEnd > existingEffStart) {
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

  // Compute new booking's occupied range based on selected packages/addons
  function getNewBookingRange(selectedSlot: string): { effStart: number; effEnd: number } | null {
    if (!selectedSlot || selectedPackages.length === 0) return null;
    const [h, m] = selectedSlot.split(":").map(Number);
    let effStart = h * 60 + m;
    let effEnd = h * 60 + m;
    for (const { package: pkg, quantity } of selectedPackages) {
      if (pkg.need_extra_time && pkg.extra_time_position === "before")
        effStart -= pkg.extra_time_minutes * quantity;
      effEnd += pkg.duration_minutes * quantity;
      if (pkg.need_extra_time && pkg.extra_time_position === "after")
        effEnd += pkg.extra_time_minutes * quantity;
    }
    for (const { addon, quantity } of selectedAddons) {
      if (!addon.need_extra_time) continue;
      if (addon.extra_time_position === "before") effStart -= addon.extra_time_minutes * quantity;
      else effEnd += addon.extra_time_minutes * quantity;
    }
    return { effStart, effEnd };
  }

  const newBookingRange = sessionData.start_time ? getNewBookingRange(sessionData.start_time) : null;
  const estimatedEndTime = newBookingRange ? minutesToTime(newBookingRange.effEnd) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Pilih Sesi & Waktu</h2>
        <p className="text-sm text-gray-500">Tentukan tanggal dan waktu sesi foto</p>
      </div>

      {effectiveAllowPast && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">Mode Booking Lama — tanggal masa lalu diizinkan</p>
        </div>
      )}

      {/* Toggle past dates — hanya tampil jika prop allowPastDates belum aktif */}
      {!allowPastDates && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Input tanggal masa lalu</p>
            <p className="text-xs text-gray-500">Aktifkan jika booking ini sudah terjadi sebelumnya</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !overridePastDates;
              setOverridePastDates(next);
              // Reset calendar to today if turning off
              if (!next) {
                const today = new Date();
                setDisplayMonth(today);
                setSelectedDate(undefined);
                onChange({ ...sessionData, booking_date: "", start_time: "" });
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
      )}

      <div>
        <Label className="mb-2 block">Tanggal <span className="text-red-500">*</span></Label>
        <div className="border rounded-lg p-2 flex justify-center">
          <DayPicker
            mode="single"
            month={displayMonth}
            onMonthChange={handleMonthChange}
            selected={selectedDate}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            startMonth={effectiveAllowPast ? new Date(2015, 0) : new Date(now.getFullYear(), now.getMonth())}
            endMonth={new Date(now.getFullYear() + 2, 11)}
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
            {timeSlots.map((slot) => {
              const slotMins = timeToMinutes(slot);
              const isExistingBooked = existingBookings.some(
                (b) => slotMins >= timeToMinutes(b.start_time) && slotMins < timeToMinutes(b.end_time)
              );
              const isSelected = sessionData.start_time === slot;
              // Slot falls within new booking's duration range (but not the start slot itself)
              const isInNewRange = !isSelected && newBookingRange != null &&
                slotMins >= newBookingRange.effStart && slotMins < newBookingRange.effEnd;
              const roundedEffEnd = newBookingRange
                ? Math.round(newBookingRange.effEnd / interval) * interval
                : null;
              const isEndTimeSlot = !isSelected && !isInNewRange && roundedEffEnd != null &&
                slotMins === roundedEffEnd;
              return (
                <button
                  key={slot}
                  onClick={() => handleTimeSelect(slot)}
                  className={cn(
                    "rounded-lg border-2 px-2 py-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-maroon-700 text-white border-maroon-700"
                      : isInNewRange
                        ? "bg-maroon-100 text-maroon-700 border-maroon-200"
                        : isEndTimeSlot
                          ? "bg-white text-maroon-400 border-maroon-300 border-dashed"
                          : isExistingBooked
                            ? "bg-gray-200 text-gray-400 border-gray-200 cursor-pointer hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                            : "bg-white text-gray-700 border-gray-200 hover:border-maroon-300 hover:bg-maroon-50"
                  )}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
          {sessionData.start_time && estimatedEndTime && (
            <p className="text-xs text-maroon-700 font-medium mt-1 text-center">
              Estimasi sesi: {sessionData.start_time} — {estimatedEndTime}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mt-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-maroon-700 border-2 border-maroon-700 inline-block" /> Dipilih
            </span>
            {newBookingRange && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-maroon-100 border-2 border-maroon-200 inline-block" /> Durasi booking ini
              </span>
            )}
            {existingBookings.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200 border-2 border-gray-200 inline-block" /> Sudah ada booking
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border-2 border-gray-200 inline-block" /> Tersedia
            </span>
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
