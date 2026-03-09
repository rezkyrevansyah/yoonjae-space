"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronUp, CheckSquare, Square, Save,
  User, CalendarDays, ExternalLink
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
  commissionAmount: number; // per-booking commission in Rp
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
  isPaid: boolean;
  expanded: boolean;
  saving: boolean;
}

export interface InitialCommissionData {
  month: number;
  year: number;
  cutoffDay: number;
  bookings: {
    id: string; booking_number: string; booking_date: string; total: number; staff_id: string | null;
    commission_amount: number;
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

function getPeriodRange(month: number, year: number, cutoffDay: number): { start: string; end: string; label: string } {
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const endDay = cutoffDay - 1;
  const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(cutoffDay).padStart(2, "0")}`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  const label = `${cutoffDay} ${MONTHS[prevMonth]} ${prevYear} – ${endDay} ${MONTHS[month]} ${year}`;
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
    existing.push({
      id: b.id,
      booking_number: b.booking_number,
      booking_date: b.booking_date,
      total: b.total,
      commissionAmount: b.commission_amount ?? 0,
      customers: b.customers,
      packages: b.packages,
    });
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
  const [cutoffDay] = useState(initialData.cutoffDay);
  const [staffCards, setStaffCards] = useState<StaffCommission[]>(() =>
    buildStaffCards(staffUsers, initialData.bookings, initialData.existingCommissions)
  );
  const [loading, setLoading] = useState(false);

  const isInitialMount = useRef(true);

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const period = getPeriodRange(selectedMonth, selectedYear, cutoffDay);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const paidStatuses = ["PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"];
    const [{ data: bookings }, { data: existingCommissions }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_number, booking_date, total, staff_id, commission_amount, customers(name), packages(name)")
        .gte("booking_date", period.start)
        .lte("booking_date", period.end)
        .in("status", paidStatuses)
        .order("booking_date"),
      supabase
        .from("commissions")
        .select("id, staff_id, total_amount, status")
        .eq("period_start", period.start)
        .eq("period_end", period.end),
    ]);

    const commissionMap = new Map<string, { id: string; amount: number; status: "unpaid" | "paid" }>();
    for (const c of (existingCommissions ?? [])) {
      commissionMap.set(c.staff_id, { id: c.id, amount: c.total_amount, status: c.status });
    }

    const bookingsByStaff = new Map<string, BookingItem[]>();
    for (const b of (bookings ?? [])) {
      const raw = b as unknown as { id: string; booking_number: string; booking_date: string; total: number; staff_id: string | null; commission_amount: number; customers: { name: string } | null; packages: { name: string } | null };
      const staffId = raw.staff_id ?? "__unassigned__";
      const existing = bookingsByStaff.get(staffId) ?? [];
      existing.push({
        id: raw.id,
        booking_number: raw.booking_number,
        booking_date: raw.booking_date,
        total: raw.total,
        commissionAmount: raw.commission_amount ?? 0,
        customers: raw.customers,
        packages: raw.packages,
      });
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

  function updateBookingCommission(staffId: string, bookingId: string, rawValue: string) {
    const amount = Number(rawValue.replace(/\D/g, "")) || 0;
    setStaffCards(prev => prev.map(c => {
      if (c.staffId !== staffId) return c;
      const bookings = c.bookings.map(b =>
        b.id === bookingId ? { ...b, commissionAmount: amount } : b
      );
      return { ...c, bookings };
    }));
  }

  async function handleSave(card: StaffCommission) {
    const totalAmount = card.bookings.reduce((sum, b) => sum + b.commissionAmount, 0);
    updateCard(card.staffId, { saving: true });

    try {
      let commissionId = card.commissionId;

      if (commissionId) {
        await supabase
          .from("commissions")
          .update({
            total_amount: totalAmount,
            booking_count: card.bookings.length,
            status: card.isPaid ? "paid" : "unpaid",
            paid_at: card.isPaid ? new Date().toISOString() : null,
          })
          .eq("id", commissionId);
      } else {
        const { data: inserted } = await supabase
          .from("commissions")
          .insert({
            staff_id: card.staffId,
            period_start: period.start,
            period_end: period.end,
            booking_count: card.bookings.length,
            total_amount: totalAmount,
            status: card.isPaid ? "paid" : "unpaid",
            paid_at: card.isPaid ? new Date().toISOString() : null,
          })
          .select("id")
          .single();
        commissionId = inserted?.id ?? null;
      }

      // Save per-booking commission_amount
      await Promise.all(card.bookings.map(b =>
        supabase.from("bookings").update({ commission_amount: b.commissionAmount }).eq("id", b.id)
      ));

      // If marking as paid: auto-create expense
      if (card.isPaid && card.savedStatus !== "paid" && commissionId) {
        const { data: existingExpense } = await supabase
          .from("expenses")
          .select("id")
          .eq("source", "commission")
          .eq("source_id", commissionId)
          .maybeSingle();

        if (!existingExpense) {
          await supabase.from("expenses").insert({
            date: new Date().toISOString().split("T")[0],
            description: `Komisi ${card.staffName} - ${period.label}`,
            amount: totalAmount,
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
        description: `Simpan komisi ${card.staffName}: ${formatRupiah(totalAmount)} — ${card.isPaid ? "Sudah Dibayar" : "Belum Dibayar"}`,
      });

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
              onTogglePaid={() => updateCard(card.staffId, { isPaid: !card.isPaid })}
              onBookingCommissionChange={(bookingId, val) => updateBookingCommission(card.staffId, bookingId, val)}
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
  onTogglePaid: () => void;
  onBookingCommissionChange: (bookingId: string, val: string) => void;
  onSave: () => void;
}

function StaffCard({ card, onToggleExpand, onTogglePaid, onBookingCommissionChange, onSave }: StaffCardProps) {
  const isPaid = card.savedStatus === "paid";
  const totalCommission = card.bookings.reduce((sum, b) => sum + b.commissionAmount, 0);

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

        {/* Total komisi (auto-sum) + status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Total Komisi</p>
            <p className={`text-lg font-bold ${totalCommission > 0 ? "text-gray-900" : "text-gray-300"}`}>
              {totalCommission > 0 ? formatRupiah(totalCommission) : "Rp 0"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">dari {card.bookings.length} booking</p>
          </div>

          <div className="flex flex-col justify-between">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Status</p>
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
                Riwayat Booking & Input Komisi ({card.bookings.length})
              </span>
              {card.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {card.expanded && (
              <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400">
                      <th className="px-3 py-2 text-left font-medium">Booking</th>
                      <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Customer</th>
                      <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Tanggal</th>
                      <th className="px-3 py-2 text-right font-medium">Total Booking</th>
                      <th className="px-3 py-2 text-right font-medium">Komisi</th>
                      <th className="px-3 py-2 w-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {card.bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{b.booking_number}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium hidden sm:table-cell">{b.customers?.name ?? "-"}</td>
                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{formatDate(b.booking_date)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatRupiah(b.total)}</td>
                        <td className="px-3 py-2 text-right">
                          {isPaid ? (
                            <span className="font-semibold text-gray-700">{formatRupiah(b.commissionAmount)}</span>
                          ) : (
                            <div className="flex items-center justify-end">
                              <span className="text-gray-400 mr-1">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={b.commissionAmount > 0 ? String(b.commissionAmount) : ""}
                                onChange={e => onBookingCommissionChange(b.id, e.target.value)}
                                placeholder="0"
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
                              />
                            </div>
                          )}
                        </td>
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
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-600 hidden sm:table-cell">Total</td>
                      <td colSpan={1} className="px-3 py-2 font-semibold text-gray-600 sm:hidden">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">
                        {formatRupiah(card.bookings.reduce((s, b) => s + b.total, 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#8B1A1A]">
                        {formatRupiah(totalCommission)}
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
