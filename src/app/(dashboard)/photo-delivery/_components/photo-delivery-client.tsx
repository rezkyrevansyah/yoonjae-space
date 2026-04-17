"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
  PRINT_ORDER_STATUS_LABEL,
  PAGE_SIZE_OPTIONS,
} from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import type { BookingStatus, PrintOrderStatus } from "@/lib/types/database";
import { toDateStr } from "@/lib/utils";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Camera,
  Link as LinkIcon,
  Printer,
  CalendarCheck,
} from "lucide-react";
import type { PhotoDeliveryRow } from "../page";

const supabase = createClient();
// UUID v4 validation — guards against injection if the ID source type ever changes
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Props {
  initialData: { rows: PhotoDeliveryRow[]; total: number };
}

export function PhotoDeliveryClient({ initialData }: Props) {
  const { toast } = useToast();

  const [rows, setRows] = useState<PhotoDeliveryRow[]>(initialData.rows);
  const [total, setTotal] = useState(initialData.total);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const todayStr = toDateStr(new Date());
  const isTodayFilter = dateFilter === todayStr;

  const isInitialMount = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select(
          `id, booking_number, booking_date, start_time, end_time, status,
           print_order_status, google_drive_link, created_at,
           customers(name, phone),
           packages(name)`,
          { count: "exact" }
        )
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (statusFilter === "SHOOT_DONE" || statusFilter === "PHOTOS_DELIVERED") {
        query = query.eq("status", statusFilter as BookingStatus);
      } else {
        query = query.in("status", ["SHOOT_DONE", "PHOTOS_DELIVERED"]);
      }

      if (dateFilter) {
        query = query.eq("booking_date", dateFilter);
      }

      if (search.trim()) {
        const { data: matchingCustomers } = await supabase
          .from("customers")
          .select("id")
          .ilike("name", `%${search.trim()}%`);
        // Validate UUID format to prevent injection if the ID source type ever changes
        const customerIds = (matchingCustomers?.map((c) => c.id) ?? [])
          .filter((id) => UUID_RE.test(id));
        const conditions = [`booking_number.ilike.%${search.trim()}%`];
        if (customerIds.length > 0) {
          conditions.push(`customer_id.in.(${customerIds.join(",")})`);
        }
        query = query.or(conditions.join(","));
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setRows((data as unknown as PhotoDeliveryRow[]) ?? []);
      setTotal(count ?? 0);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, search, page, pageSize, toast]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, dateFilter, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera className="h-6 w-6 text-maroon-700" />
            Photo Delivery
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola pengiriman foto dan print order</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari nama customer / nomor booking..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="SHOOT_DONE">Shoot Done</SelectItem>
            <SelectItem value="PHOTOS_DELIVERED">Photos Delivered</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDateFilter(isTodayFilter ? "" : todayStr)}
          className={isTodayFilter ? "bg-maroon-50 border-maroon-300 text-maroon-700" : ""}
        >
          Hari Ini
        </Button>
        {dateFilter && !isTodayFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="text-gray-500">
            Reset Tanggal
          </Button>
        )}
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)}>{s} / hal</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table — desktop only */}
      <div className="hidden md:block rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Booking</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tanggal & Jam</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Drive Link</TableHead>
              <TableHead>Print Order</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Camera className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Belum ada booking yang perlu di-deliver</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50">
                  <TableCell>
                    <p className="font-mono text-xs text-gray-500">{row.booking_number}</p>
                    <p className="text-sm font-medium text-gray-800">{row.packages?.name ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{row.customers?.name ?? "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(row.booking_date)}</p>
                    <p className="text-xs text-gray-500">{formatTime(row.start_time)} — {formatTime(row.end_time)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={BOOKING_STATUS_COLOR[row.status as BookingStatus]}>
                      {BOOKING_STATUS_LABEL[row.status as BookingStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.google_drive_link ? (
                      <a
                        href={/^https?:\/\//i.test(row.google_drive_link) ? row.google_drive_link : `https://${row.google_drive_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Lihat Link
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.print_order_status ? (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Printer className="h-3 w-3" />
                        {PRINT_ORDER_STATUS_LABEL[row.print_order_status as PrintOrderStatus]}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/photo-delivery/${row.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Lihat
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Memuat data...</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 py-12">
            <Camera className="h-10 w-10 opacity-30" />
            <p className="text-sm">Belum ada booking yang perlu di-deliver</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-gray-400">{row.booking_number}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{row.customers?.name ?? "—"}</p>
                  <p className="text-xs text-gray-500">{row.packages?.name ?? "—"}</p>
                </div>
                <Badge className={BOOKING_STATUS_COLOR[row.status as BookingStatus]}>
                  {BOOKING_STATUS_LABEL[row.status as BookingStatus]}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                <span>{formatDate(row.booking_date)}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="text-xs">{formatTime(row.start_time)} — {formatTime(row.end_time)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs">
                  {row.google_drive_link ? (
                    <a
                      href={/^https?:\/\//i.test(row.google_drive_link) ? row.google_drive_link : `https://${row.google_drive_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      Drive
                    </a>
                  ) : (
                    <span className="text-gray-400">Belum ada link</span>
                  )}
                  {row.print_order_status && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Printer className="h-3 w-3" />
                      {PRINT_ORDER_STATUS_LABEL[row.print_order_status as PrintOrderStatus]}
                    </span>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1.5 flex-shrink-0">
                  <Link href={`/photo-delivery/${row.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    Lihat
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} booking ditemukan</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Hal {page + 1} / {Math.max(1, totalPages)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1 || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
