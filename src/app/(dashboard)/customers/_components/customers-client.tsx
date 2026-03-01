"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { CurrentUser } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  Plus,
  Download,
  Eye,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---- Types ----
export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  address: string | null;
  domicile: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
  total_bookings: number;
  total_spend: number;
  last_visit: string | null;
}

interface Props {
  currentUser: CurrentUser;
  leads: { id: string; name: string }[];
}

interface AddForm {
  name: string;
  phone: string;
  email: string;
  instagram: string;
  address: string;
  domicile: string;
  lead_id: string;
  notes: string;
}

const PAGE_SIZE = 25;
const supabase = createClient();

export function CustomersClient({ currentUser, leads }: Props) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const phoneCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<AddForm>({
    name: "", phone: "", email: "", instagram: "",
    address: "", domicile: "", lead_id: "", notes: "",
  });

  const fetchCustomers = useCallback(async (searchVal: string, pageVal: number) => {
    setLoading(true);
    const from = pageVal * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Fetch customers with aggregated booking data
    let query = supabase
      .from("customers")
      .select(`
        id, name, phone, email, instagram, address, domicile, lead_id, notes, created_at,
        bookings(total, booking_date)
      `, { count: "exact" })
      .order("name");

    if (searchVal.trim()) {
      query = query.or(`name.ilike.%${searchVal}%,phone.ilike.%${searchVal}%`);
    }

    query = query.range(from, to);
    const { data, count, error } = await query;

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Gagal memuat data customers", variant: "destructive" });
      return;
    }

    const rows: CustomerRow[] = (data ?? []).map((c: {
      id: string; name: string; phone: string; email: string | null;
      instagram: string | null; address: string | null; domicile: string | null;
      lead_id: string | null; notes: string | null; created_at: string;
      bookings: { total: number; booking_date: string }[];
    }) => {
      const bookings = c.bookings ?? [];
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        instagram: c.instagram,
        address: c.address,
        domicile: c.domicile,
        lead_id: c.lead_id,
        notes: c.notes,
        created_at: c.created_at,
        total_bookings: bookings.length,
        total_spend: bookings.reduce((sum: number, b: { total: number }) => sum + (b.total ?? 0), 0),
        last_visit: bookings.length > 0
          ? bookings.sort((a: { booking_date: string }, b: { booking_date: string }) => b.booking_date.localeCompare(a.booking_date))[0].booking_date
          : null,
      };
    });

    setCustomers(rows);
    setTotal(count ?? 0);
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search, page), 300);
    return () => clearTimeout(t);
  }, [search, page, fetchCustomers]);

  // Phone uniqueness check
  function handlePhoneChange(val: string) {
    setForm(f => ({ ...f, phone: val }));
    setPhoneError("");
    if (phoneCheckRef.current) clearTimeout(phoneCheckRef.current);
    if (val.trim().length < 5) return;
    phoneCheckRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", val.trim())
        .maybeSingle();
      if (data) setPhoneError("Nomor WhatsApp sudah terdaftar");
    }, 500);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Error", description: "Nama dan WhatsApp wajib diisi", variant: "destructive" });
      return;
    }
    if (phoneError) return;
    setSaving(true);
    const { data: inserted, error } = await supabase
      .from("customers")
      .insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || "",
        instagram: form.instagram.trim() || "",
        address: form.address.trim() || "",
        domicile: form.domicile.trim() || "",
        lead_id: form.lead_id || null,
        notes: form.notes.trim() || "",
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      toast({ title: "Error", description: error.message.includes("unique") ? "Nomor WA sudah terdaftar" : "Gagal menyimpan", variant: "destructive" });
      return;
    }

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "CREATE",
      entity: "customers",
      entity_id: inserted?.id ?? null,
      description: `Customer baru ditambahkan: ${form.name}`,
    });

    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", phone: "", email: "", instagram: "", address: "", domicile: "", lead_id: "", notes: "" });
    toast({ title: "Customer ditambahkan!" });
    fetchCustomers(search, page);
  }

  async function handleDelete(c: CustomerRow) {
    // Check active bookings
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", c.id)
      .not("status", "in", '("CLOSED","CANCELED")');

    if ((count ?? 0) > 0) {
      toast({ title: "Tidak dapat dihapus", description: "Customer masih memiliki booking aktif", variant: "destructive" });
      setDeleteTarget(null);
      return;
    }

    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
      setDeleteTarget(null);
      return;
    }

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "DELETE",
      entity: "customers",
      entity_id: c.id,
      description: `Customer dihapus: ${c.name}`,
    });

    toast({ title: "Customer dihapus" });
    setDeleteTarget(null);
    fetchCustomers(search, page);
  }

  const exportFilename = `customers-${new Date().toISOString().split("T")[0]}`;

  function exportCSV() {
    const header = ["Nama", "Phone", "Email", "Total Bookings", "Total Spend", "Last Visit"];
    const rows = customers.map(c => [
      c.name, c.phone, c.email ?? "",
      c.total_bookings, c.total_spend,
      c.last_visit ? formatDate(c.last_visit) : "-",
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    const { utils, writeFile } = await import("xlsx");
    const wsData = [
      ["Nama", "Phone", "Email", "Total Bookings", "Total Spend (Rp)", "Last Visit"],
      ...customers.map(c => [
        c.name,
        c.phone,
        c.email ?? "",
        c.total_bookings,
        c.total_spend,
        c.last_visit ? formatDate(c.last_visit) : "-",
      ]),
    ];
    const ws = utils.aoa_to_sheet(wsData);
    // Column widths
    ws["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 18 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Customers");
    writeFile(wb, `${exportFilename}.xlsx`);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} pelanggan terdaftar</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                Export
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}>Export Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-[#8B1A1A] hover:bg-[#B22222]" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari nama atau nomor WA..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Bookings</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total Spend</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Visit</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm animate-pulse">
                  Memuat...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Tidak ada customer</p>
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-[#8B1A1A]">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.email ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{c.total_bookings}</td>
                  <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">
                    {c.total_spend > 0 ? formatRupiah(c.total_spend) : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.last_visit ? formatDate(c.last_visit) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/customers/${c.id}`}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8 animate-pulse">Memuat...</p>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Tidak ada customer</p>
          </div>
        ) : (
          customers.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/customers/${c.id}`} className="font-semibold text-gray-900 hover:text-[#8B1A1A]">
                    {c.name}
                  </Link>
                  <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/customers/${c.id}`} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button onClick={() => setDeleteTarget(c)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{c.total_bookings} booking</span>
                <span>{c.total_spend > 0 ? formatRupiah(c.total_spend) : "-"}</span>
                <span>{c.last_visit ? formatDate(c.last_visit) : "Belum pernah"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Client modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nama <span className="text-red-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>WhatsApp <span className="text-red-500">*</span></Label>
                <Input
                  value={form.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@username"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Alamat</Label>
                <Input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Alamat lengkap"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Domisili</Label>
                <Input
                  value={form.domicile}
                  onChange={e => setForm(f => ({ ...f, domicile: e.target.value }))}
                  placeholder="Kota"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Leads</Label>
                <Select value={form.lead_id} onValueChange={v => setForm(f => ({ ...f, lead_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih leads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                Batal
              </Button>
              <Button
                className="flex-1 bg-[#8B1A1A] hover:bg-[#B22222]"
                disabled={saving || !!phoneError}
                onClick={handleAdd}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
