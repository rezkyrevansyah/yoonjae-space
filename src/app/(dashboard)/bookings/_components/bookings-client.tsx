"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
  PRINT_ORDER_STATUS_LABEL,
} from "@/lib/constants";
import { formatRupiah, formatDate, formatTime, toDateStr } from "@/lib/utils";
import type { CurrentUser, BookingStatus } from "@/lib/types/database";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CalendarCheck,
} from "lucide-react";

const supabase = createClient();

interface BookingRow {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  print_order_status: string | null;
  is_rescheduled: boolean;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  packages: { name: string } | null;
  staff: { name: string } | null;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ALL_STATUSES = "ALL";
const RESCHEDULED_FILTER = "RESCHEDULED";

interface Props {
  currentUser: CurrentUser;
  initialPrint: string;
  initialData: { bookings: BookingRow[]; total: number };
}

export function BookingsClient({ currentUser, initialPrint, initialData }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  // Stable ref for currentUser to avoid adding it to useCallback deps
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [bookings, setBookings] = useState<BookingRow[]>(initialData.bookings);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(initialData.total);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [printFilter, setPrintFilter] = useState<string>(initialPrint);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortAsc, setSortAsc] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNumber, setDeleteNumber] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const todayStr = toDateStr(new Date());

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter(ALL_STATUSES);
    setPrintFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  const hasActiveFilters = !!(searchInput || statusFilter !== ALL_STATUSES || printFilter || dateFrom || dateTo);
  const isTodayFilter = dateFrom === todayStr && dateTo === todayStr;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select(
          `id, booking_number, booking_date, start_time, end_time, status, print_order_status, is_rescheduled, total, created_at,
           customers(name),
           packages(name),
           staff:users!bookings_staff_id_fkey(name)`,
          { count: "exact" }
        )
        .order("booking_date", { ascending: sortAsc })
        .order("start_time", { ascending: sortAsc });

      if (statusFilter === RESCHEDULED_FILTER) {
        query = query.eq("is_rescheduled", true);
      } else if (statusFilter !== ALL_STATUSES) {
        query = query.eq("status", statusFilter);
      }
      if (printFilter) {
        query = query.eq("print_order_status", printFilter);
      }
      if (dateFrom) query = query.gte("booking_date", dateFrom);
      if (dateTo) query = query.lte("booking_date", dateTo);
      if (search.trim()) {
        const [{ data: matchingCustomers }, { data: matchingPackages }] = await Promise.all([
          supabase.from("customers").select("id").ilike("name", `%${search.trim()}%`),
          supabase.from("packages").select("id").ilike("name", `%${search.trim()}%`),
        ]);
        const customerIds = matchingCustomers?.map((c) => c.id) ?? [];
        const packageIds = matchingPackages?.map((p) => p.id) ?? [];
        const conditions = [`booking_number.ilike.%${search.trim()}%`];
        if (customerIds.length > 0) {
          conditions.push(`customer_id.in.(${customerIds.join(",")})`);
        }
        if (packageIds.length > 0) {
          conditions.push(`package_id.in.(${packageIds.join(",")})`);
        }
        query = query.or(conditions.join(","));
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setBookings((data as unknown as BookingRow[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data booking", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, printFilter, dateFrom, dateTo, search, page, pageSize, sortAsc, toast]);

  // Track whether we've moved past the initial default state
  // Initial data is already server-filtered (server reads ?print= param), so always skip first fetch
  const isInitialMount = useRef(true);

  // Debounce search input — 300ms delay before committing to query
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    // Skip the very first fetch only when we have server-provided initial data (no print filter)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBookings();
  }, [fetchBookings]);

  // Reset page when filters or sort change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, printFilter, dateFrom, dateTo, pageSize, sortAsc]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", deleteId);
      if (error) throw error;

      const u = currentUserRef.current;
      try {
        await supabase.from("activity_log").insert({
          user_id: u.id,
          user_name: u.name,
          user_role: u.role_name,
          action: "DELETE",
          entity: "bookings",
          entity_id: deleteId,
          description: `Menghapus booking ${deleteNumber}`,
        });
      } catch {
        console.error("Failed to log delete activity for booking", deleteId);
      }

      toast({ title: "Berhasil", description: `Booking ${deleteNumber} berhasil dihapus` });
      fetchBookings();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus booking", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{total} total booking</p>
        </div>
        <Link href="/bookings/new">
          <Button className="bg-maroon-700 hover:bg-maroon-600 text-white gap-2">
            <Plus className="h-4 w-4" />
            Buat Booking
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari customer, booking ID, atau nama paket..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Semua Status</SelectItem>
            <SelectItem value={RESCHEDULED_FILTER}>Rescheduled</SelectItem>
            {Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={printFilter || ALL_STATUSES} onValueChange={(v) => setPrintFilter(v === ALL_STATUSES ? "" : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Print Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Semua Print</SelectItem>
            {Object.entries(PRINT_ORDER_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Date range — side by side on mobile, individual on desktop */}
        <div className="flex gap-2 sm:contents min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 sm:flex-none flex flex-col gap-0.5">
            <label className="text-xs text-gray-500 sm:hidden px-0.5">Dari</label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-0 sm:flex-none flex flex-col gap-0.5">
            <label className="text-xs text-gray-500 sm:hidden px-0.5">Sampai</label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setDateFrom(todayStr); setDateTo(todayStr); setPage(0); }}
          className={`shrink-0 ${isTodayFilter ? "bg-maroon-50 border-maroon-300 text-maroon-700" : ""}`}
        >
          Hari Ini
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="shrink-0 text-gray-500">
            Reset Filter
          </Button>
        )}
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Booking / Paket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>
                <button
                  onClick={() => setSortAsc((v) => !v)}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Tanggal & Waktu
                  {sortAsc ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Print Status</TableHead>
              <TableHead>Handled By</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <CalendarCheck className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500">Belum ada booking</p>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id} className="hover:bg-gray-50">
                  <TableCell>
                    <p className="font-mono text-xs text-gray-500">{b.booking_number}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{b.packages?.name ?? "-"}</p>
                  </TableCell>
                  <TableCell className="font-medium">{b.customers?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    <p>{formatDate(b.booking_date)}</p>
                    <p className="text-gray-500">{formatTime(b.start_time)}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                        {BOOKING_STATUS_LABEL[b.status]}
                      </Badge>
                      {b.is_rescheduled && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          Rescheduled
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.print_order_status ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {PRINT_ORDER_STATUS_LABEL[b.print_order_status as keyof typeof PRINT_ORDER_STATUS_LABEL] ?? b.print_order_status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{b.staff?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatRupiah(b.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/bookings/${b.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setDeleteId(b.id); setDeleteNumber(b.booking_number); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <CalendarCheck className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500">Belum ada booking</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-gray-500">{b.booking_number}</p>
                  <p className="font-semibold text-gray-900">{b.customers?.name ?? "-"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </Badge>
                  {b.is_rescheduled && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      Rescheduled
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{formatDate(b.booking_date)} · {formatTime(b.start_time)}</p>
                <p>{b.packages?.name ?? "-"}</p>
                {b.print_order_status && (
                  <p className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Print:</span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {PRINT_ORDER_STATUS_LABEL[b.print_order_status as keyof typeof PRINT_ORDER_STATUS_LABEL] ?? b.print_order_status}
                    </span>
                  </p>
                )}
                <p className="font-semibold text-gray-900">{formatRupiah(b.total)}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/bookings/${b.id}`)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Detail
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => { setDeleteId(b.id); setDeleteNumber(b.booking_number); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tampilkan</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">per halaman</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} dari {total}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <span className="font-mono font-medium">{deleteNumber}</span> akan dihapus
              beserta semua data terkait (invoice, addon, background, custom fields). Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
