"use client";

import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Clock } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { CurrentUser, Addon } from "@/lib/types/database";
import { invalidateAddons } from "@/lib/cache-invalidation";

interface TabAddonsProps {
  currentUser: CurrentUser;
}

const emptyForm = {
  name: "",
  price: "",
  category: "",
  sort_order: "0",
  need_extra_time: false,
  extra_time_minutes: "30",
  extra_time_position: "after" as "before" | "after",
  is_active: true,
};

export function TabAddons({ currentUser }: TabAddonsProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Addon[]>([]);
  const [addonCategories, setAddonCategories] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchItems(); fetchAddonCategories(); }, []);

  async function fetchAddonCategories() {
    const { data } = await supabase.from("addon_categories").select("id, name").eq("is_active", true).order("sort_order").order("name");
    if (data) setAddonCategories(data);
  }

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from("addons")
      .select("id, name, price, category, sort_order, need_extra_time, extra_time_minutes, extra_time_position, is_active, created_at, updated_at")
      .order("sort_order")
      .order("name");
    if (data) setItems(data);
    setLoading(false);
  }

  // Group addons by category
  const grouped = useMemo(() => {
    const map = new Map<string, Addon[]>();
    for (const item of items) {
      const key = item.category || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [items]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: Addon) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category ?? "",
      sort_order: String(item.sort_order ?? 0),
      need_extra_time: item.need_extra_time,
      extra_time_minutes: String(item.extra_time_minutes),
      extra_time_position: item.extra_time_position ?? "after",
      is_active: item.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = {
      name: form.name,
      price: parseInt(form.price.replace(/\D/g, ""), 10),
      category: form.category.trim(),
      sort_order: parseInt(form.sort_order, 10) || 0,
      need_extra_time: form.need_extra_time,
      extra_time_minutes: form.need_extra_time ? parseInt(form.extra_time_minutes, 10) : 0,
      extra_time_position: form.need_extra_time ? form.extra_time_position : "after",
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from("addons").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await invalidateAddons();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_addon", entity: "addons", entity_id: editingId, description: `Updated addon: ${form.name}` });
        toast({ title: "Berhasil", description: `Add-on "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("addons").insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data]);
        await invalidateAddons();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_addon", entity: "addons", entity_id: data.id, description: `Created addon: ${form.name}` });
        toast({ title: "Berhasil", description: `Add-on "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch { toast({ title: "Gagal", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("addons").delete().eq("id", id);
    if (error) { toast({ title: "Gagal hapus", variant: "destructive" }); fetchItems(); }
    else {
      await invalidateAddons();
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_addon", entity: "addons", entity_id: id, description: `Deleted addon: ${item?.name}` });
      toast({ title: "Berhasil", description: "Add-on dihapus." });
    }
    setDeleteId(null);
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600"><Plus className="mr-2 h-4 w-4" />Tambah Add-on</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada add-on.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, groupItems]) => (
            <div key={category || "__uncategorized"}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-600">{category || "Lainnya"}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-maroon-700">{formatRupiah(item.price)}</span>
                        {item.need_extra_time && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.extra_time_position === "before" ? "−" : "+"}{item.extra_time_minutes} mnt {item.extra_time_position === "before" ? "(sebelum sesi)" : "(setelah sesi)"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit Add-on" : "Tambah Add-on"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MUA, Dekorasi, dll." />
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
                    {addonCategories.map((cat) => (
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
            <div className="space-y-2">
              <Label>Harga (Rp) <span className="text-red-500">*</span></Label>
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} placeholder="150000" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="addon-extra" checked={form.need_extra_time} onCheckedChange={(v) => setForm({ ...form, need_extra_time: !!v })} />
                <Label htmlFor="addon-extra" className="cursor-pointer">Need Extra Time</Label>
              </div>
              {form.need_extra_time && (
                <div className="pl-6 space-y-3">
                  <div>
                    <Input type="number" min={15} value={form.extra_time_minutes} onChange={(e) => setForm({ ...form, extra_time_minutes: e.target.value })} className="w-32" />
                    <p className="text-xs text-muted-foreground mt-1">menit tambahan</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-700">Posisi waktu tambahan</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="extra_time_position"
                          value="before"
                          checked={form.extra_time_position === "before"}
                          onChange={() => setForm({ ...form, extra_time_position: "before" })}
                          className="accent-[#8B1A1A]"
                        />
                        <span className="text-xs text-gray-700">Sebelum sesi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="extra_time_position"
                          value="after"
                          checked={form.extra_time_position === "after"}
                          onChange={() => setForm({ ...form, extra_time_position: "after" })}
                          className="accent-[#8B1A1A]"
                        />
                        <span className="text-xs text-gray-700">Setelah sesi</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.price} className="bg-maroon-700 hover:bg-maroon-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Add-on?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
