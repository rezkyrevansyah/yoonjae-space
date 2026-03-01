"use client";

import { Clock, MapPin, User } from "lucide-react";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { CalendarBooking } from "./calendar-client";

interface Props {
  date: Date;
  bookings: CalendarBooking[];
  openTime: string;
  closeTime: string;
  onSelectBooking: (b: CalendarBooking) => void;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getDurationLabel(start: string, end: string) {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins} menit`;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  PENDING:           { bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200" },
  CONFIRMED:         { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  PAID:              { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200" },
  IN_SESSION:        { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
  EDITING:           { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  PHOTOS_DELIVERED:  { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200" },
  CLOSED:            { bg: "bg-gray-50",    text: "text-gray-500",    border: "border-gray-200" },
  CANCELED:          { bg: "bg-red-50",     text: "text-red-500",     border: "border-red-200" },
};

const STATUS_DOT: Record<string, string> = {
  PENDING:           "bg-yellow-400",
  CONFIRMED:         "bg-blue-400",
  PAID:              "bg-green-500",
  IN_SESSION:        "bg-purple-500",
  EDITING:           "bg-indigo-500",
  PHOTOS_DELIVERED:  "bg-teal-500",
  CLOSED:            "bg-gray-400",
  CANCELED:          "bg-red-400",
};

export function CalendarDayView({ date, bookings, onSelectBooking }: Props) {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dayBookings = bookings
    .filter(b => b.booking_date === dateStr)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });
  const dayFull = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="text-center pb-2 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{dayName}, {dayFull}</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {dayBookings.length === 0
            ? "Tidak ada booking"
            : `${dayBookings.length} Booking${dayBookings.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Empty state */}
      {dayBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Tidak ada sesi foto hari ini</p>
        </div>
      )}

      {/* Booking cards */}
      <div className="space-y-3">
        {dayBookings.map((b) => {
          const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING;
          const dot = STATUS_DOT[b.status] ?? "bg-gray-400";
          const duration = getDurationLabel(b.start_time, b.end_time);

          return (
            <button
              key={b.id}
              onClick={() => onSelectBooking(b)}
              className={`w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md active:scale-[0.99] ${style.bg} ${style.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: time block */}
                <div className="flex-shrink-0 text-center min-w-[52px]">
                  <p className={`text-base font-bold leading-none ${style.text}`}>
                    {formatTime(b.start_time)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(b.end_time)}</p>
                  <p className={`text-xs font-medium mt-1 ${style.text}`}>{duration}</p>
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center self-stretch">
                  <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${dot}`} />
                  <div className="w-px flex-1 bg-gray-200 my-1" />
                </div>

                {/* Right: booking info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {b.customers?.name ?? "-"}
                    </p>
                    <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {b.packages?.name && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        {b.packages.name}
                      </span>
                    )}
                    {b.booking_backgrounds.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {b.booking_backgrounds
                          .map(bg => bg.backgrounds?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>

                  {b.booking_number && (
                    <p className="mt-1.5 text-xs text-gray-400">#{b.booking_number}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
