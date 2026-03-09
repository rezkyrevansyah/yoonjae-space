"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus, CurrentUser } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  CalendarSearch,
} from "lucide-react";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarMonthView } from "./calendar-month-view";
import { BookingPopup } from "./booking-popup";
import { AvailabilityModal } from "./availability-modal";
import { toDateStr } from "@/lib/utils";

// ---- Types ----
export interface CalendarBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  person_count: number;
  behind_the_scenes: boolean;
  notes: string | null;
  customers: { name: string; phone: string } | null;
  packages: { name: string; duration_minutes: number } | null;
  photo_for: { name: string } | null;
  booking_backgrounds: { backgrounds: { name: string } | null }[];
  booking_addons: { addons: { name: string; need_extra_time: boolean; extra_time_minutes: number; extra_time_position: 'before' | 'after' } | null; price: number; is_paid: boolean; is_extra: boolean }[];
}

type ViewMode = "day" | "week" | "month";

interface Props {
  currentUser: CurrentUser;
  openTime: string;
  closeTime: string;
  timeSlotInterval: number;
  initialBookings: CalendarBooking[];
  initialDateStr: string;
}

const supabase = createClient();

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday start
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  return result;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatNavLabel(d: Date, mode: ViewMode): string {
  if (mode === "day") {
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (mode === "week") {
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function CalendarClient({ currentUser, openTime, closeTime, timeSlotInterval, initialBookings, initialDateStr }: Props) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);

  const fetchBookings = useCallback(async (mode: ViewMode, date: Date) => {
    setLoading(true);
    let from: string;
    let to: string;

    if (mode === "day") {
      from = to = toDateStr(date);
    } else if (mode === "week") {
      const s = startOfWeek(date);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      from = toDateStr(s);
      to = toDateStr(e);
    } else {
      from = toDateStr(startOfMonth(date));
      to = toDateStr(endOfMonth(date));
    }

    // Day view: fetch full data including backgrounds/addons for popup
    // Week/Month view: fetch lightweight data (no nested arrays) — popup lazy-loads detail
    const selectFields = mode === "day"
      ? `id, booking_number, booking_date, start_time, end_time, status,
         person_count, behind_the_scenes, notes,
         customers(name, phone),
         packages(name, duration_minutes),
         photo_for:photo_for(name),
         booking_backgrounds(backgrounds(name)),
         booking_addons(price, is_paid, is_extra, addons(name, need_extra_time, extra_time_minutes, extra_time_position))`
      : `id, booking_number, booking_date, start_time, end_time, status,
         person_count, behind_the_scenes, notes,
         customers(name, phone),
         packages(name, duration_minutes),
         photo_for:photo_for(name)`;

    const { data, error } = await supabase
      .from("bookings")
      .select(selectFields)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .neq("status", "CANCELED")
      .order("booking_date")
      .order("start_time");

    setLoading(false);
    if (error) {
      console.error("Calendar fetch error:", error);
      toast({ title: "Error", description: `Gagal memuat jadwal: ${error.message}`, variant: "destructive" });
      return;
    }
    // Normalize: fill empty arrays for week/month (only day view fetches nested arrays)
    setBookings((data ?? []).map(b => {
      const raw = b as unknown as CalendarBooking;
      return {
        ...raw,
        booking_backgrounds: raw.booking_backgrounds ?? [],
        booking_addons: raw.booking_addons ?? [],
      };
    }));
  }, [toast]);

  useEffect(() => {
    // Skip initial mount — server already fetched day view for today
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Only skip if current view is "day" and cursor matches server date
      if (view === "day" && toDateStr(cursor) === initialDateStr) return;
    }
    fetchBookings(view, cursor);
  }, [view, cursor, fetchBookings, initialDateStr]);

  function navigate(dir: -1 | 1) {
    setCursor(prev => {
      const d = new Date(prev);
      if (view === "day") d.setDate(d.getDate() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  function goToday() {
    setCursor(new Date());
  }

  function handleStatusUpdate(bookingId: string, newStatus: BookingStatus) {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-[#8B1A1A] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v === "day" ? "Hari" : v === "week" ? "Minggu" : "Bulan"}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hari Ini
          </button>
          <button
            onClick={() => navigate(1)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Label */}
        <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">
          {formatNavLabel(cursor, view)}
        </span>

        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Memuat...</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAvailability(true)}
            className="flex items-center gap-1.5"
          >
            <CalendarSearch className="h-3.5 w-3.5" />
            Cek Ketersediaan
          </Button>
          <Link
            href="/mua"
            target="_blank"
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            MUA Page
          </Link>
          <Button asChild size="sm" className="bg-[#8B1A1A] hover:bg-[#B22222]">
            <Link href="/bookings/new">
              <Plus className="h-4 w-4 mr-1" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      <div className="flex-1 overflow-auto">
        {view === "day" && (
          <CalendarDayView
            date={cursor}
            bookings={bookings}
            openTime={openTime}
            closeTime={closeTime}
            onSelectBooking={setSelectedBooking}
          />
        )}
        {view === "week" && (
          <CalendarWeekView
            weekStart={startOfWeek(cursor)}
            bookings={bookings}
            onSelectBooking={setSelectedBooking}
          />
        )}
        {view === "month" && (
          <CalendarMonthView
            month={cursor}
            bookings={bookings}
            onSelectBooking={setSelectedBooking}
          />
        )}
      </div>

      {/* Availability modal */}
      <AvailabilityModal
        open={showAvailability}
        onClose={() => setShowAvailability(false)}
        date={cursor}
        openTime={openTime}
        closeTime={closeTime}
        timeSlotInterval={timeSlotInterval}
      />

      {/* Booking popup */}
      {selectedBooking && (
        <BookingPopup
          booking={selectedBooking}
          currentUser={currentUser}
          onClose={() => setSelectedBooking(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Status legend */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        {(Object.entries(BOOKING_STATUS_LABEL) as [BookingStatus, string][])
          .filter(([s]) => s !== "CANCELED")
          .map(([status, label]) => (
            <span key={status} className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
              {label}
            </span>
          ))}
      </div>
    </div>
  );
}
