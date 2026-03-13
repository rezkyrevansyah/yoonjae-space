"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, toDateStr } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus, CurrentUser } from "@/lib/types/database";
import { Bell, MessageCircle, Heart, CheckCircle, Clock, X } from "lucide-react";

// ---- Types ----
export interface ReminderBooking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  customers: { name: string; phone: string } | null;
  packages: { name: string } | null;
  booking_reminders: { type: string; sent_at: string }[];
}

interface Templates {
  reminder_message: string | null;
  thank_you_message: string | null;
  thank_you_payment_message: string | null;
}

interface Props {
  currentUser: CurrentUser;
  templates: Templates;
  studioName: string;
  initialBookings: ReminderBooking[];
}

type TabType = "today" | "week" | "month";

const supabase = createClient();

function getDateRange(tab: TabType): { from: string; to: string } {
  const today = new Date();
  const from = toDateStr(today);
  if (tab === "today") return { from, to: from };
  const to = new Date(today);
  to.setDate(today.getDate() + (tab === "week" ? 6 : 29));
  return { from, to: toDateStr(to) };
}

function hoursLeft(bookingDate: string, startTime: string): string {
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const target = new Date(bookingDate);
  target.setHours(h, m, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return "Sudah lewat";
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffD >= 1) return `${diffD} hari lagi`;
  if (diffH >= 1) return `${diffH} jam lagi`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  return `${diffMin} menit lagi`;
}

function replaceVars(
  template: string,
  vars: { customer_name: string; booking_date: string; booking_time: string; package_name: string; studio_name: string; customer_page: string; notes: string }
): string {
  return template
    .replace(/\{customer_name\}/g, vars.customer_name)
    .replace(/\{booking_date\}/g, vars.booking_date)
    .replace(/\{booking_time\}/g, vars.booking_time)
    .replace(/\{package_name\}/g, vars.package_name)
    .replace(/\{studio_name\}/g, vars.studio_name)
    .replace(/\{customer_page\}/g, vars.customer_page)
    .replace(/\{notes\}/g, vars.notes);
}

function waLink(phone: string, message: string): string {
  const normalized = phone.replace(/^0/, "62").replace(/\D/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function RemindersClient({ currentUser, templates, studioName, initialBookings }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabType>("today");
  const [bookings, setBookings] = useState<ReminderBooking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  // Track which bookings have been marked reminded this session (optimistic)
  const [markedIds, setMarkedIds] = useState<Record<string, string[]>>({});

  const isInitialMount = useRef(true);

  const fetchBookings = useCallback(async (t: TabType) => {
    setLoading(true);
    const { from, to } = getDateRange(t);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_number, booking_date, start_time, end_time, status, notes,
        customers(name, phone),
        packages(name),
        booking_reminders(type, sent_at)
      `)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .not("status", "in", '("CLOSED","CANCELED")')
      .order("booking_date")
      .order("start_time");

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
      return;
    }
    setBookings((data ?? []) as unknown as ReminderBooking[]);
  }, [toast]);

  useEffect(() => {
    // Skip initial mount — data already provided for "today" tab
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBookings(tab);
  }, [tab, fetchBookings]);

  // O(1) Map lookup: bookingId → Set of sent types (from DB)
  const dbMarkedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const b of bookings) {
      if (b.booking_reminders.length > 0) {
        map.set(b.id, new Set(b.booking_reminders.map(r => r.type)));
      }
    }
    return map;
  }, [bookings]);

  async function markReminded(booking: ReminderBooking, type: "reminder" | "thank_you" | "thank_you_payment") {
    // Optimistic update immediately (before await)
    setMarkedIds(prev => ({
      ...prev,
      [booking.id]: [...(prev[booking.id] ?? []), type],
    }));

    // Fire both writes in parallel
    const [{ error }] = await Promise.all([
      supabase.from("booking_reminders").insert({
        booking_id: booking.id,
        type,
        sent_by: currentUser.id,
      }),
      supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "booking_reminders",
        entity_id: booking.id,
        description: `Reminder (${type}) ditandai untuk booking ${booking.booking_number}`,
      }),
    ]);

    if (error) {
      // Rollback optimistic update
      setMarkedIds(prev => ({
        ...prev,
        [booking.id]: (prev[booking.id] ?? []).filter(t => t !== type),
      }));
      toast({ title: "Error", description: "Gagal menandai reminder", variant: "destructive" });
      return;
    }

    toast({ title: "Ditandai sudah di-remind ✓" });
  }

  async function unmarkReminded(booking: ReminderBooking, type: "reminder" | "thank_you" | "thank_you_payment") {
    // Optimistic update
    setMarkedIds(prev => ({
      ...prev,
      [booking.id]: (prev[booking.id] ?? []).filter(t => t !== type),
    }));
    setBookings(prev =>
      prev.map(b =>
        b.id === booking.id
          ? { ...b, booking_reminders: b.booking_reminders.filter(r => r.type !== type) }
          : b
      )
    );

    const { error } = await supabase
      .from("booking_reminders")
      .delete()
      .eq("booking_id", booking.id)
      .eq("type", type);

    if (error) {
      // Rollback
      setMarkedIds(prev => ({
        ...prev,
        [booking.id]: [...(prev[booking.id] ?? []), type],
      }));
      setBookings(prev =>
        prev.map(b =>
          b.id === booking.id
            ? { ...b, booking_reminders: [...b.booking_reminders, { type, sent_at: "" }] }
            : b
        )
      );
      toast({ title: "Gagal membatalkan tandai", variant: "destructive" });
      return;
    }

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "DELETE",
      entity: "booking_reminders",
      entity_id: booking.id,
      description: `Reminder (${type}) dibatalkan untuk booking ${booking.booking_number}`,
    });

    toast({ title: "Tandai dibatalkan" });
  }

  function isMarked(bookingId: string, type: string): boolean {
    // O(1) Map + Set lookup instead of O(n) .find()
    const dbMarked = dbMarkedMap.get(bookingId)?.has(type) ?? false;
    const sessionMarked = markedIds[bookingId]?.includes(type) ?? false;
    return dbMarked || sessionMarked;
  }

  function buildWaLink(booking: ReminderBooking, templateText: string | null): string | null {
    if (!templateText || !booking.customers?.phone) return null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const vars = {
      customer_name: booking.customers.name,
      booking_date: formatDate(booking.booking_date),
      booking_time: formatTime(booking.start_time),
      package_name: booking.packages?.name ?? "",
      studio_name: studioName,
      customer_page: `${appUrl}/customer/${booking.id}`,
      notes: booking.notes ?? "",
    };
    return waLink(booking.customers.phone, replaceVars(templateText, vars));
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "7 Hari" },
    { key: "month", label: "30 Hari" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kirim pengingat WhatsApp ke customer</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* No template warning */}
      {(!templates.reminder_message && !templates.thank_you_message && !templates.thank_you_payment_message) && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <Bell className="h-4 w-4 flex-shrink-0" />
          <span>Template pesan belum diatur. Silakan atur di <strong>Settings → Reminder Templates</strong>.</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm animate-pulse">Memuat...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Tidak ada booking</p>
          <p className="text-gray-300 text-sm mt-1">
            {tab === "today" ? "Tidak ada booking aktif hari ini" :
             tab === "week" ? "Tidak ada booking dalam 7 hari ke depan" :
             "Tidak ada booking dalam 30 hari ke depan"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Tanggal & Jam</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Paket</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Waktu</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Sudah Di-remind</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(b => {
                  const reminderLink = buildWaLink(b, templates.reminder_message);
                  const tyPayLink = buildWaLink(b, templates.thank_you_payment_message);
                  const tyLink = buildWaLink(b, templates.thank_you_message);

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{b.customers?.name ?? "-"}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{b.customers?.phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-gray-700 text-xs">{formatDate(b.booking_date)}</p>
                        <p className="text-gray-500 text-xs">{formatTime(b.start_time)} — {formatTime(b.end_time)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 text-xs">{b.packages?.name ?? "-"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>
                          {BOOKING_STATUS_LABEL[b.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{hoursLeft(b.booking_date, b.start_time)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <RemindedBadge active={isMarked(b.id, "reminder")} label="Reminder" onCancel={() => unmarkReminded(b, "reminder")} />
                          <RemindedBadge active={isMarked(b.id, "thank_you_payment")} label="TY Payment" onCancel={() => unmarkReminded(b, "thank_you_payment")} />
                          <RemindedBadge active={isMarked(b.id, "thank_you")} label="Thank You" onCancel={() => unmarkReminded(b, "thank_you")} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          <ActionButton
                            href={reminderLink}
                            icon={<Bell className="h-3.5 w-3.5" />}
                            label="Reminder"
                            color="bg-blue-500 hover:bg-blue-600"
                            marked={isMarked(b.id, "reminder")}
                            onMark={() => markReminded(b, "reminder")}
                          />
                          <ActionButton
                            href={tyPayLink}
                            icon={<MessageCircle className="h-3.5 w-3.5" />}
                            label="TY Payment"
                            color="bg-green-500 hover:bg-green-600"
                            marked={isMarked(b.id, "thank_you_payment")}
                            onMark={() => markReminded(b, "thank_you_payment")}
                          />
                          <ActionButton
                            href={tyLink}
                            icon={<Heart className="h-3.5 w-3.5" />}
                            label="Thank You"
                            color="bg-pink-500 hover:bg-pink-600"
                            marked={isMarked(b.id, "thank_you")}
                            onMark={() => markReminded(b, "thank_you")}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {bookings.map(b => {
              const reminderLink = buildWaLink(b, templates.reminder_message);
              const tyPayLink = buildWaLink(b, templates.thank_you_payment_message);
              const tyLink = buildWaLink(b, templates.thank_you_message);

              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                  {/* Customer + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{b.customers?.name ?? "-"}</p>
                      <p className="text-xs text-gray-400 font-mono">{b.customers?.phone}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${BOOKING_STATUS_COLOR[b.status]}`}>
                      {BOOKING_STATUS_LABEL[b.status]}
                    </span>
                  </div>

                  {/* Booking info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <p className="text-gray-400 mb-0.5">Tanggal & Jam</p>
                      <p>{formatDate(b.booking_date)}</p>
                      <p>{formatTime(b.start_time)} — {formatTime(b.end_time)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Paket</p>
                      <p>{b.packages?.name ?? "-"}</p>
                      <div className="flex items-center gap-1 mt-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{hoursLeft(b.booking_date, b.start_time)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reminded badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <RemindedBadge active={isMarked(b.id, "reminder")} label="Reminder" onCancel={() => unmarkReminded(b, "reminder")} />
                    <RemindedBadge active={isMarked(b.id, "thank_you_payment")} label="TY Payment" onCancel={() => unmarkReminded(b, "thank_you_payment")} />
                    <RemindedBadge active={isMarked(b.id, "thank_you")} label="Thank You" onCancel={() => unmarkReminded(b, "thank_you")} />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-50">
                    <MobileActionButton
                      href={reminderLink}
                      icon={<Bell className="h-3.5 w-3.5" />}
                      label="Reminder"
                      color="text-blue-600 bg-blue-50 hover:bg-blue-100"
                      marked={isMarked(b.id, "reminder")}
                      onMark={() => markReminded(b, "reminder")}
                    />
                    <MobileActionButton
                      href={tyPayLink}
                      icon={<MessageCircle className="h-3.5 w-3.5" />}
                      label="TY Payment"
                      color="text-green-600 bg-green-50 hover:bg-green-100"
                      marked={isMarked(b.id, "thank_you_payment")}
                      onMark={() => markReminded(b, "thank_you_payment")}
                    />
                    <MobileActionButton
                      href={tyLink}
                      icon={<Heart className="h-3.5 w-3.5" />}
                      label="Thank You"
                      color="text-pink-600 bg-pink-50 hover:bg-pink-100"
                      marked={isMarked(b.id, "thank_you")}
                      onMark={() => markReminded(b, "thank_you")}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <p className="text-xs text-gray-400 text-center">
            {bookings.length} booking ditemukan
          </p>
        </>
      )}
    </div>
  );
}

// ---- Helper components ----

function RemindedBadge({ active, label, onCancel }: { active: boolean; label: string; onCancel?: () => void }) {
  if (!active) return null;
  return (
    <button
      onClick={onCancel}
      title="Batalkan tandai"
      className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors group"
    >
      <CheckCircle className="h-3 w-3 group-hover:hidden" />
      <X className="h-3 w-3 hidden group-hover:inline" />
      {label}
    </button>
  );
}

function ActionButton({
  href,
  icon,
  label,
  color,
  marked,
  onMark,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  color: string;
  marked: boolean;
  onMark: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-lg ${color} transition-colors`}
        >
          {icon}
          {label}
        </a>
      ) : (
        <span className={`inline-flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-lg bg-gray-300 cursor-not-allowed opacity-60`}>
          {icon}
          {label}
        </span>
      )}
      <button
        onClick={onMark}
        disabled={marked}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${
          marked
            ? "text-green-600 cursor-default"
            : "text-gray-400 hover:text-green-600"
        }`}
      >
        {marked ? "✓ Sent" : "Tandai"}
      </button>
    </div>
  );
}

function MobileActionButton({
  href,
  icon,
  label,
  color,
  marked,
  onMark,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  color: string;
  marked: boolean;
  onMark: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-1 text-xs py-2 rounded-xl ${color} transition-colors`}
        >
          {icon}
          <span>{label}</span>
        </a>
      ) : (
        <span className="w-full flex items-center justify-center gap-1 text-xs py-2 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed">
          {icon}
          <span>{label}</span>
        </span>
      )}
      <button
        onClick={onMark}
        disabled={marked}
        className={`text-xs ${marked ? "text-green-600" : "text-gray-400 hover:text-green-600"} transition-colors`}
      >
        {marked ? "✓ Sent" : "Tandai"}
      </button>
    </div>
  );
}
