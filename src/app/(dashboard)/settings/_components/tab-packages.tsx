"use client";

import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Clock, Printer } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { CurrentUser, Package } from "@/lib/types/database";
import { invalidatePackages } from "@/lib/cache-invalidation";

interface TabPackagesProps {
  currentUser: CurrentUser;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "60",
  category: "",
  sort_order: "0",
  include_print: false,
  need_extra_time: false,
  extra_time_minutes: "30",
  extra_time_position: "after" as "before" | "after",
  commission_bonus: "0",
  is_active: true,
};

export function TabPackages({ currentUser }: TabPackagesProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgCategories, setPkgCategories] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchPackages(); fetchPkgCategories(); }, []);

  async function fetchPkgCategories() {
    const { data } = await supabase.from("package_categories").select("id, name").eq("is_active", true).order("sort_order").order("name");
    if (data) setPkgCategories(data);
  }

  async function fetchPackages() {
    setLoading(true);
    const { data } = await supabase
      .from("packages")
      .select("id, name, description, price, duration_minutes, category, sort_order, include_print, need_extra_time, extra_time_minutes, extra_time_position, commission_bonus, is_active, created_at, updated_at")
      .order("sort_order")
      .order("name");
    if (data) setPackages(data);
    setLoading(false);
  }

  // Group packages by category
  const grouped = useMemo(() => {
    const map = new Map<string, Package[]>();
    for (const pkg of packages) {
      const key = pkg.category || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pkg);
    }
    // Sort: named categories first (alphabetical), then "" last
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [packages]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(pkg: Package) {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description ?? "",
      price: String(pkg.price),
      duration_minutes: String(pkg.duration_minutes),
      category: pkg.category ?? "",
      sort_order: String(pkg.sort_order ?? 0),
      include_print: pkg.include_print,
      need_extra_time: pkg.need_extra_time,
      extra_time_minutes: String(pkg.extra_time_minutes),
      extra_time_position: pkg.extra_time_position ?? "after",
      commission_bonus: String(pkg.commission_bonus ?? 0),
      is_active: pkg.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.duration_minutes) return;
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || "",
      price: parseInt(form.price.replace(/\D/g, ""), 10),
      duration_minutes: parseInt(form.duration_minutes, 10),
      category: form.category.trim(),
      sort_order: parseInt(form.sort_order, 10) || 0,
      include_print: form.include_print,
      need_extra_time: form.need_extra_time,
      extra_time_minutes: form.need_extra_time ? parseInt(form.extra_time_minutes, 10) : 0,
      extra_time_position: form.need_extra_time ? form.extra_time_position : "after",
      commission_bonus: Math.max(0, parseInt(form.commission_bonus.replace(/\D/g, ""), 10) || 0),
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("packages").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
        setPackages((prev) => prev.map((p) => p.id === editingId ? { ...p, ...payload, updated_at: new Date().toISOString() } : p));
        await invalidatePackages();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_package", entity: "packages", entity_id: editingId, description: `Updated package: ${form.name}` });
        toast({ title: "Berhasil", description: `Paket "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("packages").insert(payload).select().single();
        if (error) throw error;
        setPackages((prev) => [...prev, data]);
        await invalidatePackages();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_package", entity: "packages", entity_id: data.id, description: `Created package: ${form.name}` });
        toast({ title: "Berhasil", description: `Paket "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const pkg = packages.find((p) => p.id === id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        toast({
          title: "Tidak bisa dihapus",
          description: "Paket ini masih digunakan di booking yang ada. Nonaktifkan paket jika tidak ingin ditampilkan.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Gagal hapus", variant: "destructive" });
      }
      fetchPackages();
    } else {
      await invalidatePackages();
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_package", entity: "packages", entity_id: id, description: `Deleted package: ${pkg?.name}` });
      toast({ title: "Berhasil", description: `Paket dihapus.` });
    }
    setDeleteId(null);
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600">
          <Plus className="mr-2 h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada paket. Klik &quot;Tambah Paket&quot; untuk mulai.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <div key={category || "__uncategorized"}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-600">{category || "Lainnya"}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((pkg) => (
                  <div key={pkg.id} className="border rounded-lg p-4 bg-white space-y-2 relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{pkg.name}</p>
                        {pkg.description && <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>}
                      </div>
                      <Badge variant={pkg.is_active ? "default" : "secondary"} className={pkg.is_active ? "bg-green-100 text-green-800 border-green-200 shrink-0" : "shrink-0"}>
                        {pkg.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <p className="text-maroon-700 font-bold">{formatRupiah(pkg.price)}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{pkg.duration_minutes} mnt</span>
                      {pkg.need_extra_time && (
                        <span className="flex items-center gap-1">
                          {pkg.extra_time_position === "before" ? "−" : "+"}{pkg.extra_time_minutes} mnt {pkg.extra_time_position === "before" ? "(sebelum sesi)" : "(setelah sesi)"}
                        </span>
                      )}
                      {pkg.include_print && <span className="flex items-center gap-1 text-blue-600"><Printer className="h-3 w-3" />Print</span>}
                      {pkg.commission_bonus > 0 && <span className="text-amber-600 font-medium">Bonus: {formatRupiah(pkg.commission_bonus)}</span>}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(pkg)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(pkg.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Paket" : "Tambah Paket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Paket <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Basic Package" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Deskripsi singkat..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v === "__none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Tanpa Kategori</SelectItem>
                    {pkgCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Harga (Rp) <span className="text-red-500">*</span></Label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label>Durasi (menit) <span className="text-red-500">*</span></Label>
                <Input type="number" min={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="incl-print" checked={form.include_print} onCheckedChange={(v) => setForm({ ...form, include_print: !!v })} />
              <Label htmlFor="incl-print" className="cursor-pointer flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" />Include Print</Label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="extra-time" checked={form.need_extra_time} onCheckedChange={(v) => setForm({ ...form, need_extra_time: !!v })} />
                <Label htmlFor="extra-time" className="cursor-pointer">Need Extra Time</Label>
              </div>
              {form.need_extra_time && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input type="number" min={15} value={form.extra_time_minutes} onChange={(e) => setForm({ ...form, extra_time_minutes: e.target.value })} placeholder="30" className="w-32" />
                    <p className="text-xs text-muted-foreground">menit tambahan</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pkg_extra_time_position"
                        value="before"
                        checked={form.extra_time_position === "before"}
                        onChange={() => setForm({ ...form, extra_time_position: "before" })}
                        className="accent-[#8B1A1A]"
                      />
                      Sebelum sesi
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="pkg_extra_time_position"
                        value="after"
                        checked={form.extra_time_position === "after"}
                        onChange={() => setForm({ ...form, extra_time_position: "after" })}
                        className="accent-[#8B1A1A]"
                      />
                      Setelah sesi
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Bonus Komisi (Rp)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.commission_bonus}
                onChange={(e) => setForm({ ...form, commission_bonus: e.target.value.replace(/\D/g, "") })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Kosongkan atau isi 0 untuk pakai bonus default dari Pengaturan Umum</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.price} className="bg-maroon-700 hover:bg-maroon-600">
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
            <AlertDialogTitle>Hapus Paket?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
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
