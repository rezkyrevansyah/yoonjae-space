"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { invalidateDomiciles } from "@/lib/cache-invalidation";
import type { CurrentUser } from "@/lib/types/database";

interface TabDomicilesProps {
  currentUser: CurrentUser;
}

interface DomicileItem {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TabDomiciles({ currentUser }: TabDomicilesProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DomicileItem[]>([]);
  const [total, setTotal] = useState(0);

  // Search & pagination
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal / delete state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", is_active: true });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page on search/pageSize change
  useEffect(() => { setPage(0); }, [search, pageSize]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("domiciles")
      .select("id, name, is_active, created_at", { count: "exact" })
      .order("name");

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count } = await query;
    if (data) setItems(data as DomicileItem[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const totalPages = Math.ceil(total / pageSize);

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", is_active: true });
    setModalOpen(true);
  }

  function openEdit(item: DomicileItem) {
    setEditingId(item.id);
    setForm({ name: item.name, is_active: item.is_active });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name.trim(), is_active: form.is_active };
    try {
      if (editingId) {
        const { error } = await supabase.from("domiciles").update(payload).eq("id", editingId);
        if (error) throw error;
        await invalidateDomiciles();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_domicile", entity: "domiciles", entity_id: editingId, description: `Updated domisili: ${form.name}` });
        toast({ title: "Berhasil", description: `Domisili "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("domiciles").insert(payload).select().single();
        if (error) throw error;
        await invalidateDomiciles();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_domicile", entity: "domiciles", entity_id: data.id, description: `Created domisili: ${form.name}` });
        toast({ title: "Berhasil", description: `Domisili "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
      fetchItems();
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    const { error } = await supabase.from("domiciles").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal hapus", variant: "destructive" });
    } else {
      await invalidateDomiciles();
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_domicile", entity: "domiciles", entity_id: id, description: `Deleted domisili: ${item?.name}` });
      toast({ title: "Berhasil", description: "Domisili dihapus." });
      fetchItems();
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari kota atau kabupaten..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600 shrink-0">
          <Plus className="mr-2 h-4 w-4" />Tambah Kota
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          {search ? `Tidak ada hasil untuk "${search}".` : "Belum ada data."}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <p className="text-sm font-medium">{item.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                  {item.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tampilkan</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Domisili" : "Tambah Kota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama kota atau kabupaten" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-maroon-700 hover:bg-maroon-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Domisili?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan. Customer yang menggunakan domisili ini tidak akan ikut terhapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
