"use client";

import { BOOKING_STATUS_COLOR } from "@/lib/constants";
import { formatTime, toDateStr } from "@/lib/utils";
import type { CalendarBooking } from "./calendar-client";

interface Props {
  weekStart: Date;
  bookings: CalendarBooking[];
  onSelectBooking: (b: CalendarBooking) => void;
}

const DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarWeekView({ weekStart, bookings, onSelectBooking }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayStr = toDateStr(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px] grid grid-cols-7 gap-1">
        {/* Day headers */}
        {days.map((d, i) => {
          const dateStr = toDateStr(d);
          const isToday = dateStr === todayStr;
          return (
            <div key={i} className="text-center pb-2">
              <p className="text-xs text-gray-500">{DAYS_ID[i]}</p>
              <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium mx-auto ${
                isToday ? "bg-[#8B1A1A] text-white" : "text-gray-700"
              }`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}

        {/* Day columns */}
        {days.map((d, i) => {
          const dateStr = toDateStr(d);
          const dayBookings = bookings.filter(b => b.booking_date === dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              className={`min-h-[200px] rounded-lg p-1 space-y-1 ${
                isToday ? "bg-[#FEF2F2]" : "bg-gray-50"
              }`}
            >
              {dayBookings.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-xs text-gray-300">—</span>
                </div>
              ) : (
                dayBookings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={`w-full text-left rounded-md px-2 py-1.5 text-xs hover:opacity-80 transition-opacity ${BOOKING_STATUS_COLOR[b.status]}`}
                  >
                    <p className="font-semibold truncate">
                      {formatTime(b.start_time)}
                    </p>
                    <p className="truncate">{b.customers?.name ?? "-"}</p>
                    <p className="truncate opacity-80">
                      {b.booking_packages?.length > 0
                        ? b.booking_packages.map((bp) => bp.packages?.name).filter(Boolean).join(", ")
                        : b.packages?.name}
                    </p>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
