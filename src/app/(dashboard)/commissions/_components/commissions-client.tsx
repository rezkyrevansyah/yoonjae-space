"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronUp, CheckSquare, Square, Save,
  User, CalendarDays, Banknote, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { CurrentUser } from "@/lib/types/database";

interface StaffUser {
  id: string;
  name: string;
  email: string;
}

interface BookingItem {
  id: string;
  booking_number: string;
  booking_date: string;
  total: number;
  customers: { name: string } | null;
  packages: { name: string } | null;
}

interface StaffCommission {
  staffId: string;
  staffName: string;
  staffEmail: string;
  bookings: BookingItem[];
  // current saved commission (if exists)
  commissionId: string | null;
  savedAmount: number;
  savedStatus: "unpaid" | "paid";
  // local editing state
  amount: string; // input string
  isPaid: boolean;
  expanded: boolean;
  saving: boolean;
}

export interface InitialCommissionData {
  month: number;
  year: number;
  bookings: {
    id: string; booking_number: string; booking_date: string; total: number; staff_id: string | null;
    customers: { name: string } | null; packages: { name: string } | null;
  }[];
  existingCommissions: { id: string; staff_id: string; total_amount: number; status: "unpaid" | "paid" }[];
}

interface Props {
  currentUser: CurrentUser;
  staffUsers: StaffUser[];
  initialData: InitialCommissionData;
}

const supabase = createClient();

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Commission period: 26th of prev month → 25th of current month
function getPeriodRange(month: number, year: number): { start: string; end: string; label: string } {
  // period_start = 26th of previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-26`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-25`;
  const label = `26 ${MONTHS[prevMonth]} ${prevYear} – 25 ${MONTHS[month]} ${year}`;
  return { start, end, label };
}

function buildStaffCards(
  staffUsers: StaffUser[],
  bookings: InitialCommissionData["bookings"],
  existingCommissions: InitialCommissionData["existingCommissions"]
): StaffCommission[] {
  const commissionMap = new Map<string, { id: string; amount: number; status: "unpaid" | "paid" }>();
  for (const c of existingCommissions) {
    commissionMap.set(c.staff_id, { id: c.id, amount: c.total_amount, status: c.status });
  }
  const bookingsByStaff = new Map<string, BookingItem[]>();
  for (const b of bookings) {
    const staffId = b.staff_id ?? "__unassigned__";
    const existing = bookingsByStaff.get(staffId) ?? [];
    existing.push(b as BookingItem);
    bookingsByStaff.set(staffId, existing);
  }
  return staffUsers.map(s => {
    const staffBookings = bookingsByStaff.get(s.id) ?? [];
    const existing = commissionMap.get(s.id);
    return {
      staffId: s.id, staffName: s.name, staffEmail: s.email,
      bookings: staffBookings,
      commissionId: existing?.id ?? null,
      savedAmount: existing?.amount ?? 0,
      savedStatus: existing?.status ?? "unpaid",
      amount: existing ? String(existing.amount) : "",
      isPaid: existing?.status === "paid",
      expanded: false,
      saving: false,
    };
  });
}

export function CommissionsClient({ currentUser, staffUsers, initialData }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(initialData.month);
  const [selectedYear, setSelectedYear] = useState(initialData.year);
  const [staffCards, setStaffCards] = useState<StaffCommission[]>(() =>
    buildStaffCards(staffUsers, initialData.bookings, initialData.existingCommissions)
  );
  const [loading, setLoading] = useState(false);

  const isInitialMount = useRef(true);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const period = getPeriodRange(selectedMonth, selectedYear);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch bookings in period (PAID+ statuses)
    const paidStatuses = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, booking_number, booking_date, total, staff_id, customers(name), packages(name)")
      .gte("booking_date", period.start)
      .lte("booking_date", period.end)
      .in("status", paidStatuses)
      .order("booking_date");

    // Fetch existing commissions for this period
    const { data: existingCommissions } = await supabase
      .from("commissions")
      .select("id, staff_id, total_amount, status")
      .eq("period_start", period.start)
      .eq("period_end", period.end);

    const commissionMap = new Map<string, { id: string; amount: number; status: "unpaid" | "paid" }>();
    for (const c of (existingCommissions ?? [])) {
      commissionMap.set(c.staff_id, { id: c.id, amount: c.total_amount, status: c.status });
    }

    // Group bookings by staff
    const bookingsByStaff = new Map<string, BookingItem[]>();
    for (const b of (bookings ?? [])) {
      const booking = b as unknown as BookingItem & { staff_id: string | null };
      const staffId = booking.staff_id ?? "__unassigned__";
      const existing = bookingsByStaff.get(staffId) ?? [];
      existing.push(booking);
      bookingsByStaff.set(staffId, existing);
    }

    const cards: StaffCommission[] = staffUsers.map(s => {
      const staffBookings = bookingsByStaff.get(s.id) ?? [];
      const existing = commissionMap.get(s.id);
      return {
        staffId: s.id,
        staffName: s.name,
        staffEmail: s.email,
        bookings: staffBookings,
        commissionId: existing?.id ?? null,
        savedAmount: existing?.amount ?? 0,
        savedStatus: existing?.status ?? "unpaid",
        amount: existing ? String(existing.amount) : "",
        isPaid: existing?.status === "paid",
        expanded: false,
        saving: false,
      };
    });

    setStaffCards(cards);
    setLoading(false);
  }, [selectedMonth, selectedYear, period.start, period.end, staffUsers]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  function updateCard(staffId: string, patch: Partial<StaffCommission>) {
    setStaffCards(prev => prev.map(c => c.staffId === staffId ? { ...c, ...patch } : c));
  }

  async function handleSave(card: StaffCommission) {
    const amount = Number(card.amount.replace(/\D/g, "")) || 0;
    updateCard(card.staffId, { saving: true });

    try {
      let commissionId = card.commissionId;

      if (commissionId) {
        // Update existing
        await supabase
          .from("commissions")
          .update({
            total_amount: amount,
            booking_count: card.bookings.length,
            status: card.isPaid ? "paid" : "unpaid",
            paid_at: card.isPaid ? new Date().toISOString() : null,
          })
          .eq("id", commissionId);
      } else {
        // Insert new
        const { data: inserted } = await supabase
          .from("commissions")
          .insert({
            staff_id: card.staffId,
            period_start: period.start,
            period_end: period.end,
            booking_count: card.bookings.length,
            total_amount: amount,
            status: card.isPaid ? "paid" : "unpaid",
            paid_at: card.isPaid ? new Date().toISOString() : null,
          })
          .select("id")
          .single();
        commissionId = inserted?.id ?? null;
      }

      // If marking as paid: auto-create expense
      if (card.isPaid && card.savedStatus !== "paid" && commissionId) {
        const periodLabel = period.label;
        // Check if expense already exists for this commission
        const { data: existingExpense } = await supabase
          .from("expenses")
          .select("id")
          .eq("source", "commission")
          .eq("source_id", commissionId)
          .maybeSingle();

        if (!existingExpense) {
          await supabase.from("expenses").insert({
            date: new Date().toISOString().split("T")[0],
            description: `Komisi ${card.staffName} - ${periodLabel}`,
            amount: amount,
            category: "Commission",
            source: "commission",
            source_id: commissionId,
          });
        }
      }

      // Activity log
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: card.commissionId ? "UPDATE" : "CREATE",
        entity: "commissions",
        entity_id: commissionId,
        description: `Simpan komisi ${card.staffName}: ${formatRupiah(amount)} — ${card.isPaid ? "Sudah Dibayar" : "Belum Dibayar"}`,
      });

      // Refresh data
      fetchData();
    } catch {
      updateCard(card.staffId, { saving: false });
    }
  }

  const totalPaid = staffCards
    .filter(c => c.savedStatus === "paid")
    .reduce((sum, c) => sum + c.savedAmount, 0);
  const totalUnpaid = staffCards
    .filter(c => c.savedStatus === "unpaid" && c.savedAmount > 0)
    .reduce((sum, c) => sum + c.savedAmount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commissions</h1>
          <p className="text-sm text-gray-500">Periode: {period.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] cursor-pointer"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Sudah Dibayar</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatRupiah(totalPaid)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Belum Dibayar</p>
          <p className="text-xl font-bold text-orange-700 mt-1">{formatRupiah(totalUnpaid)}</p>
        </div>
      </div>

      {/* Staff cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : staffCards.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          Belum ada staff aktif
        </div>
      ) : (
        <div className="space-y-4">
          {staffCards.map(card => (
            <StaffCard
              key={card.staffId}
              card={card}
              onToggleExpand={() => updateCard(card.staffId, { expanded: !card.expanded })}
              onAmountChange={val => updateCard(card.staffId, { amount: val.replace(/\D/g, "") })}
              onTogglePaid={() => updateCard(card.staffId, { isPaid: !card.isPaid })}
              onSave={() => handleSave(card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Staff Card ──────────────────────────────────────────────

interface StaffCardProps {
  card: StaffCommission;
  onToggleExpand: () => void;
  onAmountChange: (val: string) => void;
  onTogglePaid: () => void;
  onSave: () => void;
}

function StaffCard({ card, onToggleExpand, onAmountChange, onTogglePaid, onSave }: StaffCardProps) {
  const isPaid = card.savedStatus === "paid";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isPaid ? "border-green-100" : "border-gray-100"}`}>
      {/* Status bar */}
      <div className={`h-1 ${isPaid ? "bg-green-400" : "bg-orange-300"}`} />

      <div className="p-4 space-y-4">
        {/* Staff info row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#8B1A1A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{card.staffName}</p>
              <p className="text-xs text-gray-400">{card.staffEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPaid && (
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                Dibayar
              </span>
            )}
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {card.bookings.length} booking
            </span>
          </div>
        </div>

        {/* Amount input */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              <Banknote className="w-3.5 h-3.5 inline mr-1" />
              Nominal Komisi
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={card.amount}
                onChange={e => onAmountChange(e.target.value)}
                placeholder="0"
                disabled={isPaid}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            {Number(card.amount) > 0 && (
              <p className="text-xs text-gray-400 mt-1">{formatRupiah(Number(card.amount))}</p>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Status
            </label>
            <button
              onClick={onTogglePaid}
              disabled={isPaid}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-colors disabled:cursor-not-allowed ${
                card.isPaid
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {card.isPaid
                ? <CheckSquare className="w-4 h-4 flex-shrink-0" />
                : <Square className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{card.isPaid ? "Sudah Dibayar" : "Belum Dibayar"}</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        {!isPaid && (
          <button
            onClick={onSave}
            disabled={card.saving}
            className="w-full flex items-center justify-center gap-2 bg-[#8B1A1A] text-white text-sm font-medium rounded-xl py-2.5 hover:bg-[#B22222] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {card.saving ? "Menyimpan..." : "Simpan"}
          </button>
        )}

        {/* Booking history toggle */}
        {card.bookings.length > 0 && (
          <div>
            <button
              onClick={onToggleExpand}
              className="w-full flex items-center justify-between text-xs font-medium text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Lihat Riwayat Booking ({card.bookings.length})
              </span>
              {card.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {card.expanded && (
              <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400">
                      <th className="px-3 py-2 text-left font-medium">Booking</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Tanggal</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {card.bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{b.booking_number}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium">{b.customers?.name ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{formatDate(b.booking_date)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatRupiah(b.total)}</td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/bookings/${b.id}`}
                            target="_blank"
                            className="text-gray-300 hover:text-[#8B1A1A] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">
                        {formatRupiah(card.bookings.reduce((s, b) => s + b.total, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
