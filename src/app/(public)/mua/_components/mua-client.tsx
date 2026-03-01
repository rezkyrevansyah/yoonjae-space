"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Package, User } from "lucide-react";

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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const supabase = createClient();

export function MuaClient({ studioInfo }: Props) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<MuaBooking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMuaBookings = useCallback(async (d: Date) => {
    setLoading(true);
    const dateStr = toDateStr(d);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status,
        customers(name),
        packages(name),
        booking_addons(addons(name))
      `)
      .eq("booking_date", dateStr)
      .neq("status", "CANCELED")
      .order("start_time");

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
      return;
    }

    // Filter: only bookings that have an addon with name containing "MUA"
    const muaBookings = ((data ?? []) as unknown as MuaBooking[]).filter(b =>
      b.booking_addons.some(ba =>
        ba.addons?.name?.toLowerCase().includes("mua")
      )
    );
    setBookings(muaBookings);
  }, [toast]);

  useEffect(() => {
    fetchMuaBookings(date);
  }, [date, fetchMuaBookings]);

  function navigate(dir: -1 | 1) {
    setDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });
  }

  const isToday = toDateStr(date) === toDateStr(new Date());

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
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>

          <div className="text-center">
            <p className="font-semibold text-gray-900">
              {date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            {isToday && (
              <span className="text-xs text-[#8B1A1A] font-medium">Hari Ini</span>
            )}
          </div>

          <button
            onClick={() => navigate(1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Today button */}
        {!isToday && (
          <div className="max-w-lg mx-auto mt-2 text-center">
            <button
              onClick={() => setDate(new Date())}
              className="text-xs text-[#8B1A1A] hover:underline"
            >
              Kembali ke Hari Ini
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm animate-pulse">
            Memuat jadwal...
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Tidak ada jadwal MUA hari ini</p>
            <p className="text-gray-300 text-xs mt-1">{formatDate(toDateStr(date))}</p>
          </div>
        ) : (
          bookings.map(b => {
            const muaAddons = b.booking_addons
              .filter(ba => ba.addons?.name?.toLowerCase().includes("mua"))
              .map(ba => ba.addons?.name)
              .join(", ");

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
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
          })
        )}
      </main>
    </div>
  );
}
