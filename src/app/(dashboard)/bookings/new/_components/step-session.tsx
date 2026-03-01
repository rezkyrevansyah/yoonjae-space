"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Label } from "@/components/ui/label";
import { generateTimeSlots, formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SessionFormData } from "./new-booking-client";
import type { SettingsGeneral, StudioHoliday } from "@/lib/types/database";
import { AlertCircle } from "lucide-react";
import { Chevron } from "react-day-picker";

interface Props {
  sessionData: SessionFormData;
  onChange: (data: SessionFormData) => void;
  settingsGeneral: SettingsGeneral | null;
  holidays: StudioHoliday[];
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

export function StepSession({ sessionData, onChange, settingsGeneral, holidays }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    sessionData.booking_date ? new Date(sessionData.booking_date + "T00:00:00") : undefined
  );

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
                onClick={() => onChange({ ...sessionData, start_time: slot })}
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
    </div>
  );
}
