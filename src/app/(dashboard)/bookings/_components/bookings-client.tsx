"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

// Module-level singleton — stable across renders, no dependency churn
const supabase = createClient();
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
} from "@/lib/constants";
import { formatRupiah, formatDate, formatTime } from "@/lib/utils";
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

interface BookingRow {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  packages: { name: string } | null;
  staff: { name: string } | null;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const ALL_STATUSES = "ALL";

export function BookingsClient({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter();
  const { toast } = useToast();
  // Stable ref for currentUser to avoid adding it to useCallback deps
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortAsc, setSortAsc] = useState(true);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteNumber, setDeleteNumber] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select(
          `id, booking_number, booking_date, start_time, end_time, status, total, created_at,
           customers(name),
           packages(name),
           staff:users!bookings_staff_id_fkey(name)`,
          { count: "exact" }
        )
        .order("booking_date", { ascending: sortAsc })
        .order("start_time", { ascending: sortAsc });

      if (statusFilter !== ALL_STATUSES) {
        query = query.eq("status", statusFilter);
      }
      if (dateFrom) query = query.gte("booking_date", dateFrom);
      if (dateTo) query = query.lte("booking_date", dateTo);
      if (search.trim()) {
        query = query.or(
          `booking_number.ilike.%${search.trim()}%,customers.name.ilike.%${search.trim()}%`
        );
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
  }, [statusFilter, dateFrom, dateTo, search, page, pageSize, sortAsc, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset page when filters or sort change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, dateFrom, dateTo, pageSize, sortAsc]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", deleteId);
      if (error) throw error;

      const u = currentUserRef.current;
      await supabase.from("activity_log").insert({
        user_id: u.id,
        user_name: u.name,
        user_role: u.role_name,
        action: "DELETE",
        entity: "bookings",
        entity_id: deleteId,
        description: `Menghapus booking ${deleteNumber}`,
      });

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
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari nama customer / booking ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Semua Status</SelectItem>
            {Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Date range — side by side on mobile, individual on desktop */}
        <div className="flex gap-2 sm:contents">
          <div className="flex-1 sm:flex-none flex flex-col gap-0.5">
            <label className="text-xs text-gray-500 sm:hidden px-0.5">Dari</label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 sm:flex-none flex flex-col gap-0.5">
            <label className="text-xs text-gray-500 sm:hidden px-0.5">Sampai</label>
            <Input
              type="date"
              className="w-full sm:w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Booking ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>
                <button
                  onClick={() => setSortAsc((v) => !v)}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                >
                  Tanggal
                  {sortAsc ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handled By</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center">
                  <CalendarCheck className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500">Belum ada booking</p>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-xs font-medium">{b.booking_number}</TableCell>
                  <TableCell className="font-medium">{b.customers?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{formatDate(b.booking_date)}</TableCell>
                  <TableCell className="text-sm">{formatTime(b.start_time)}</TableCell>
                  <TableCell className="text-sm">{b.packages?.name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                      {BOOKING_STATUS_LABEL[b.status]}
                    </Badge>
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
                <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                  {BOOKING_STATUS_LABEL[b.status]}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{formatDate(b.booking_date)} · {formatTime(b.start_time)}</p>
                <p>{b.packages?.name ?? "-"}</p>
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
