"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, toDateStr } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Sparkles } from "lucide-react";

type ViewMode = "day" | "week" | "month";

interface StudioInfo {
  studio_name: string;
  logo_url: string | null;
}

interface MuaSlot {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  mua_service: string | null;
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

export function MuaClient({ studioInfo }: Props) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [slots, setSlots] = useState<MuaSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMuaSlots = useCallback(async (mode: ViewMode, d: Date) => {
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

    try {
      const res = await fetch(`/api/mua-bookings?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: MuaSlot[] = await res.json();
      setSlots(data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat jadwal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMuaSlots(view, cursor);
  }, [view, cursor, fetchMuaSlots]);

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

  // Group slots by date for week/month views
  const groupedByDate = view !== "day"
    ? slots.reduce<Record<string, MuaSlot[]>>((acc, s) => {
        if (!acc[s.booking_date]) acc[s.booking_date] = [];
        acc[s.booking_date].push(s);
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
            <p className="text-xs text-gray-500">Jadwal MUA — slot terbooking</p>
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
          slots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Tidak ada slot MUA terbooking</p>
              <p className="text-gray-300 text-xs mt-1">{formatDate(toDateStr(cursor))}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(s => <SlotCard key={s.id} slot={s} />)}
            </div>
          )
        ) : (
          /* Week / Month view */
          sortedDates.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                Tidak ada slot MUA {view === "week" ? "minggu" : "bulan"} ini
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedDates.map(dateStr => {
                const daySlots = groupedByDate[dateStr];
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
                      {daySlots.map(s => <SlotCard key={s.id} slot={s} />)}
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

function SlotCard({ slot: s }: { slot: MuaSlot }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1.5 w-full bg-pink-200" />
      <div className="p-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>{formatTime(s.start_time)} — {formatTime(s.end_time)}</span>
          </div>
          {s.mua_service && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{s.mua_service}</p>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 flex-shrink-0">
          Booked
        </span>
      </div>
    </div>
  );
}
