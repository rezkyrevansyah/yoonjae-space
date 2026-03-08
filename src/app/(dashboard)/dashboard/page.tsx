import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarPlus, CalendarCheck, Calendar, Bell,
  TrendingUp, Users, AlertCircle,
  Clock, Package, Printer, Truck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getCachedStudioInfo } from "@/lib/cached-queries";
import { formatRupiah, formatTime } from "@/lib/utils";
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";

export const metadata = { title: "Dashboard — Yoonjaespace" };

// ── Helpers ────────────────────────────────────────────────

function getGreeting(wibNow: Date): string {
  const hour = wibNow.getUTCHours(); // getUTCHours because date is already offset to WIB
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  return "Selamat sore";
}

function toLocalDateStr(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Page ───────────────────────────────────────────────────

export default async function DashboardPage() {
  const [currentUser, supabase] = await Promise.all([
    getCurrentUser(),
    createClient(),
  ]);

  if (!currentUser) redirect("/login");

  // WIB = UTC+7 — server runs in UTC, offset manually for correct date/time in Indonesia
  const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const today = toLocalDateStr(now);
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const monthEnd = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const PAID_STATUSES = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];

  // Parallel fetch — 7 independent queries at once
  const [
    { count: totalBookings },
    { data: revenueRows },
    { count: belumLunas },
    { data: todayBookings },
    { count: countSelection },
    { count: countVendor },
    { count: countPacking },
    { count: countShipped },
    studioInfo,
  ] = await Promise.all([
    // 1. Total bookings this month (count only)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd),

    // 2. Revenue: fetch all totals then sum in JS (more reliable than aggregate syntax)
    supabase
      .from("bookings")
      .select("total")
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .in("status", PAID_STATUSES),

    // 3. Belum lunas count (BOOKED status)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("booking_date", monthStart)
      .lte("booking_date", monthEnd)
      .eq("status", "BOOKED"),

    // 4. Today's schedule
    supabase
      .from("bookings")
      .select("id, booking_number, start_time, end_time, status, customers(name), packages(name)")
      .eq("booking_date", today)
      .not("status", "in", '("CANCELED")')
      .order("start_time"),

    // 5-8. Print order counts — each is a separate count query (DB does the counting)
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("print_order_status", "SELECTION"),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("print_order_status", "VENDOR"),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("print_order_status", "PACKING"),

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("print_order_status", "SHIPPED"),

    // 9. Studio name for greeting — cached (TTL 1hr)
    getCachedStudioInfo(),
  ]);

  const estimasiRevenue = (revenueRows ?? []).reduce((sum, r) => sum + ((r as { total: number }).total ?? 0), 0);

  const printCounts = {
    SELECTION: countSelection ?? 0,
    VENDOR: countVendor ?? 0,
    PACKING: countPacking ?? 0,
    SHIPPED: countShipped ?? 0,
  };

  const greeting = getGreeting(now);
  const studioName = studioInfo?.studio_name ?? "Studio";
  const todayLabel = new Date(today + "T00:00:00Z").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Greeting */}
      <div>
        <p className="text-sm text-gray-400">{studioName}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">
          {greeting}, {currentUser.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{todayLabel}</p>
      </div>

      {/* Quick Menu */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Menu Cepat</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickMenuCard href="/bookings/new"  icon={<CalendarPlus className="w-5 h-5" />}  label="Buat Booking" color="bg-[#8B1A1A]" />
          <QuickMenuCard href="/bookings"      icon={<CalendarCheck className="w-5 h-5" />} label="Lihat Booking" color="bg-blue-600" />
          <QuickMenuCard href="/calendar"      icon={<Calendar className="w-5 h-5" />}      label="Kalender"      color="bg-indigo-600" />
          <QuickMenuCard href="/reminders"     icon={<Bell className="w-5 h-5" />}          label="Reminder"      color="bg-orange-500" />
        </div>
      </div>

      {/* Stats this month */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Statistik Bulan Ini</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Total Booking"
            value={String(totalBookings ?? 0)}
            sub="bulan ini"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            iconBg="bg-green-50"
            label="Estimasi Revenue"
            value={formatRupiah(estimasiRevenue)}
            valueColor="text-green-700"
            sub="dari booking terbayar"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
            iconBg="bg-orange-50"
            label="Belum Lunas"
            value={String(belumLunas ?? 0)}
            valueColor={(belumLunas ?? 0) > 0 ? "text-orange-600" : "text-gray-900"}
            sub="booking status BOOKED"
          />
        </div>
      </div>

      {/* Action Items (print orders) */}
      {(printCounts.SELECTION + printCounts.VENDOR + printCounts.PACKING + printCounts.SHIPPED) > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Print Order — Perlu Tindakan</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {printCounts.SELECTION > 0 && (
              <ActionCard
                href="/bookings?print=SELECTION"
                icon={<Clock className="w-4 h-4 text-yellow-600" />}
                iconBg="bg-yellow-50"
                label="Waiting Selection"
                count={printCounts.SELECTION}
                countColor="text-yellow-700"
              />
            )}
            {printCounts.VENDOR > 0 && (
              <ActionCard
                href="/bookings?print=VENDOR"
                icon={<Package className="w-4 h-4 text-blue-600" />}
                iconBg="bg-blue-50"
                label="At Vendor"
                count={printCounts.VENDOR}
                countColor="text-blue-700"
              />
            )}
            {printCounts.PACKING > 0 && (
              <ActionCard
                href="/bookings?print=PACKING"
                icon={<Printer className="w-4 h-4 text-purple-600" />}
                iconBg="bg-purple-50"
                label="Need Packaging"
                count={printCounts.PACKING}
                countColor="text-purple-700"
              />
            )}
            {printCounts.SHIPPED > 0 && (
              <ActionCard
                href="/bookings?print=SHIPPED"
                icon={<Truck className="w-4 h-4 text-green-600" />}
                iconBg="bg-green-50"
                label="Need Shipping"
                count={printCounts.SHIPPED}
                countColor="text-green-700"
              />
            )}
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Jadwal Hari Ini</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!todayBookings || todayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Calendar className="w-8 h-8 text-gray-200" />
              <p className="text-sm text-gray-400">Tidak ada sesi foto hari ini</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(todayBookings as unknown as TodayBooking[]).map(b => (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  {/* Time */}
                  <div className="flex-shrink-0 text-center min-w-[48px]">
                    <p className="text-sm font-bold text-[#8B1A1A]">{formatTime(b.start_time)}</p>
                    <p className="text-xs text-gray-400">{formatTime(b.end_time)}</p>
                  </div>

                  {/* Divider dot */}
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#8B1A1A]" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {b.customers?.name ?? "-"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{b.packages?.name ?? "-"}</p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus] ?? ""}`}>
                      {BOOKING_STATUS_LABEL[b.status as BookingStatus] ?? b.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

interface TodayBooking {
  id: string;
  booking_number: string;
  start_time: string;
  end_time: string;
  status: string;
  customers: { name: string } | null;
  packages: { name: string } | null;
}

function QuickMenuCard({ href, icon, label, color }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</p>
    </Link>
  );
}

function StatCard({ icon, iconBg, label, value, sub, valueColor = "text-gray-900" }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
        <p className={`text-xl font-bold truncate ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, icon, iconBg, label, count, countColor }: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  count: number;
  countColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate leading-tight">{label}</p>
        <p className={`text-lg font-bold ${countColor}`}>{count}</p>
      </div>
    </Link>
  );
}
