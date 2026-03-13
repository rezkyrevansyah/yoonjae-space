"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, toDateStr } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Package, User } from "lucide-react";

type ViewMode = "day" | "week" | "month";

interface StudioInfo {
  studio_name: string;
  logo_url: string | null;
}

interface MuaBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  customers: { name: string } | null;
  packages: { name: string } | null;
  booking_addons: {
    addons: { name: string } | null;
  }[];
}

interface Props {
  studioInfo: StudioInfo | null;
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  return result;
}

function formatNavLabel(d: Date, view: ViewMode): string {
  if (view === "day") {
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (view === "week") {
    const s = startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return `${s.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function isTodayInRange(cursor: Date, view: ViewMode): boolean {
  const today = toDateStr(new Date());
  if (view === "day") return toDateStr(cursor) === today;
  if (view === "week") {
    const s = startOfWeek(cursor);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return today >= toDateStr(s) && today <= toDateStr(e);
  }
  const from = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const to = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
  return today >= from && today <= to;
}

const supabase = createClient();

export function MuaClient({ studioInfo }: Props) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<MuaBooking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMuaBookings = useCallback(async (mode: ViewMode, d: Date) => {
    setLoading(true);
    let from: string;
    let to: string;

    if (mode === "day") {
      from = to = toDateStr(d);
    } else if (mode === "week") {
      const s = startOfWeek(d);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      from = toDateStr(s);
      to = toDateStr(e);
    } else {
      from = toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
      to = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status,
        customers(name),
        packages(name),
        booking_addons(addons(name))
      `)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .neq("status", "CANCELED")
      .order("booking_date")
      .order("start_time");

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
      return;
    }

    const muaBookings = ((data ?? []) as unknown as MuaBooking[]).filter(b =>
      b.booking_addons.some(ba => ba.addons?.name?.toLowerCase().includes("mua"))
    );
    setBookings(muaBookings);
  }, [toast]);

  useEffect(() => {
    fetchMuaBookings(view, cursor);
  }, [view, cursor, fetchMuaBookings]);

  function navigate(dir: -1 | 1) {
    setCursor(prev => {
      const d = new Date(prev);
      if (view === "day") d.setDate(d.getDate() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  const inRange = isTodayInRange(cursor, view);

  // Group bookings by date for week/month views
  const groupedByDate = view !== "day"
    ? bookings.reduce<Record<string, MuaBooking[]>>((acc, b) => {
        if (!acc[b.booking_date]) acc[b.booking_date] = [];
        acc[b.booking_date].push(b);
        return acc;
      }, {})
    : {};

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {studioInfo?.logo_url ? (
            <Image
              src={studioInfo.logo_url}
              alt={studioInfo.studio_name}
              width={40}
              height={40}
              className="rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#8B1A1A] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base">
                {studioInfo?.studio_name?.[0] ?? "Y"}
              </span>
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-900">{studioInfo?.studio_name ?? "Studio"}</h1>
            <p className="text-xs text-gray-500">Jadwal MUA</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-2">
        {/* View toggle */}
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? "bg-[#8B1A1A] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v === "day" ? "Hari" : v === "week" ? "Minggu" : "Bulan"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Date label + today indicator */}
        <div className="max-w-lg mx-auto text-center">
          <p className="font-semibold text-gray-900 text-sm">
            {formatNavLabel(cursor, view)}
          </p>
          {inRange && view === "day" && (
            <span className="text-xs text-[#8B1A1A] font-medium">Hari Ini</span>
          )}
        </div>

        {/* Back to today */}
        {!inRange && (
          <div className="max-w-lg mx-auto text-center">
            <button
              onClick={() => setCursor(new Date())}
              className="text-xs text-[#8B1A1A] hover:underline"
            >
              Kembali ke Hari Ini
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm animate-pulse">
            Memuat jadwal...
          </div>
        ) : view === "day" ? (
          /* Day view */
          bookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada jadwal MUA hari ini</p>
              <p className="text-gray-300 text-xs mt-1">{formatDate(toDateStr(cursor))}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
            </div>
          )
        ) : (
          /* Week / Month view */
          sortedDates.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                Tidak ada jadwal MUA {view === "week" ? "minggu" : "bulan"} ini
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedDates.map(dateStr => {
                const dayBookings = groupedByDate[dateStr];
                const isToday = dateStr === toDateStr(new Date());
                return (
                  <div key={dateStr}>
                    <div className={`flex items-center gap-2 mb-2 ${isToday ? "text-[#8B1A1A]" : "text-gray-500"}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-[#8B1A1A]" : "text-gray-400"}`}>
                        {new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-[#8B1A1A] text-white px-1.5 py-0.5 rounded-full font-medium">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {dayBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: MuaBooking }) {
  const muaAddons = b.booking_addons
    .filter(ba => ba.addons?.name?.toLowerCase().includes("mua"))
    .map(ba => ba.addons?.name)
    .join(", ");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Status bar */}
      <div className={`h-1.5 w-full ${BOOKING_STATUS_COLOR[b.status].split(" ")[0]}`} />

      <div className="p-4 space-y-2.5">
        {/* Customer + status */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <p className="font-semibold text-gray-900">{b.customers?.name ?? "-"}</p>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{b.booking_number}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${BOOKING_STATUS_COLOR[b.status]}`}>
            {BOOKING_STATUS_LABEL[b.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Package */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Package className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{b.packages?.name ?? "-"}</span>
          </div>

          {/* Session time */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>{formatTime(b.start_time)} — {formatTime(b.end_time)}</span>
          </div>
        </div>

        {/* MUA addon name */}
        {muaAddons && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
              {muaAddons}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
