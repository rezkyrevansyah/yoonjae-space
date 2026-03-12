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
} from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import type { CurrentUser, BookingStatus, PrintOrderStatus } from "@/lib/types/database";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Camera,
  Link as LinkIcon,
  Printer,
} from "lucide-react";
import type { PhotoDeliveryRow } from "../page";

const supabase = createClient();
const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface Props {
  currentUser: CurrentUser;
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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

      if (search.trim()) {
        const { data: matchingCustomers } = await supabase
          .from("customers")
          .select("id")
          .ilike("name", `%${search.trim()}%`);
        const customerIds = matchingCustomers?.map((c) => c.id) ?? [];
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
  }, [statusFilter, search, page, pageSize, toast]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, pageSize]);

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

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
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
