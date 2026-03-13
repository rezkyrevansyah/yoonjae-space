"use client";

import { useMemo } from "react";
import { BOOKING_STATUS_COLOR } from "@/lib/constants";
import { formatTime, toDateStr } from "@/lib/utils";
import type { CalendarBooking } from "./calendar-client";

interface Props {
  month: Date;
  bookings: CalendarBooking[];
  onSelectBooking: (b: CalendarBooking) => void;
}

const DAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarMonthView({ month, bookings, onSelectBooking }: Props) {
  const todayStr = toDateStr(new Date());

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const mon = month.getMonth();
    const firstDay = new Date(year, mon, 1);
    // Monday-based: 0=Mon ... 6=Sun
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const result: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        result.push(null);
      } else {
        result.push(new Date(year, mon, dayNum));
      }
    }
    return result;
  }, [month]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const b of bookings) {
      if (!map[b.booking_date]) map[b.booking_date] = [];
      map[b.booking_date].push(b);
    }
    return map;
  }, [bookings]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_ID.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={i} className="bg-gray-50 min-h-[90px]" />;
            }
            const dateStr = toDateStr(cell);
            const dayBookings = bookingsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            return (
              <div
                key={i}
                className={`bg-white min-h-[90px] p-1 ${isToday ? "ring-2 ring-inset ring-[#8B1A1A]" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 h-5 w-5 flex items-center justify-center rounded-full ${
                  isToday ? "bg-[#8B1A1A] text-white" : "text-gray-700"
                }`}>
                  {cell.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 3).map(b => (
                    <button
                      key={b.id}
                      onClick={() => onSelectBooking(b)}
                      className={`w-full text-left rounded px-1 py-0.5 text-xs truncate hover:opacity-80 transition-opacity ${BOOKING_STATUS_COLOR[b.status]}`}
                    >
                      {formatTime(b.start_time)} {b.customers?.name}
                    </button>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{dayBookings.length - 3} lagi</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
