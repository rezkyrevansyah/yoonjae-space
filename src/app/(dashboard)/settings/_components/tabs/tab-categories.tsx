"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { CurrentUser } from "@/lib/types/database";

interface TabCategoriesProps {
  currentUser: CurrentUser;
}

interface CategoryItem {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { name: "", sort_order: "0", is_active: true };

function CategorySection({
  title,
  tableName,
  activityPrefix,
  currentUser,
}: {
  title: string;
  tableName: "package_categories" | "addon_categories";
  activityPrefix: string;
  currentUser: CurrentUser;
}) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from(tableName)
      .select("id, name, sort_order, is_active, created_at")
      .order("sort_order")
      .order("name");
    if (data) setItems(data);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: CategoryItem) {
    setEditingId(item.id);
    setForm({ name: item.name, sort_order: String(item.sort_order ?? 0), is_active: item.is_active });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sort_order: parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `update_${activityPrefix}`, entity: tableName, entity_id: editingId, description: `Updated category: ${form.name}` });
        toast({ title: "Berhasil", description: `Kategori "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from(tableName).insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data]);
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `create_${activityPrefix}`, entity: tableName, entity_id: data.id, description: `Created category: ${form.name}` });
        toast({ title: "Berhasil", description: `Kategori "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal hapus", variant: "destructive" });
      fetchItems();
    } else {
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `delete_${activityPrefix}`, entity: tableName, entity_id: id, description: `Deleted category: ${item?.name}` });
      toast({ title: "Berhasil", description: "Kategori dihapus." });
    }
    setDeleteId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <Button size="sm" onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600">
          <Plus className="mr-1.5 h-3.5 w-3.5" />Tambah
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          Belum ada kategori.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{item.sort_order}</span>
                <p className="text-sm font-medium truncate">{item.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paket Utama" />
            </div>
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
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
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>Paket/add-on yang menggunakan kategori ini tidak akan ikut terhapus, namun kategorinya menjadi kosong.</AlertDialogDescription>
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

export function TabCategories({ currentUser }: TabCategoriesProps) {
  return (
    <div className="space-y-8">
      <CategorySection
        title="Kategori Paket"
        tableName="package_categories"
        activityPrefix="package_category"
        currentUser={currentUser}
      />

      <div className="border-t" />

      <CategorySection
        title="Kategori Add-on"
        tableName="addon_categories"
        activityPrefix="addon_category"
        currentUser={currentUser}
      />
    </div>
  );
}
