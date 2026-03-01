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

interface SimpleItem {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface TabSimpleCrudProps {
  currentUser: CurrentUser;
  tableName: "leads" | "photo_for";
  entityLabel: string;
  addLabel: string;
}

export function TabSimpleCrud({ currentUser, tableName, entityLabel, addLabel }: TabSimpleCrudProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", is_active: true });

  useEffect(() => { fetchItems(); }, [tableName]);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from(tableName).select("id, name, is_active, created_at").order("name");
    if (data) setItems(data as SimpleItem[]);
    setLoading(false);
  }

  function openAdd() { setEditingId(null); setForm({ name: "", is_active: true }); setModalOpen(true); }
  function openEdit(item: SimpleItem) { setEditingId(item.id); setForm({ name: item.name, is_active: item.is_active }); setModalOpen(true); }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    const payload = { name: form.name, is_active: form.is_active };
    try {
      if (editingId) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `update_${tableName}`, entity: tableName, entity_id: editingId, description: `Updated ${entityLabel}: ${form.name}` });
        toast({ title: "Berhasil", description: `${entityLabel} "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from(tableName).insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data as SimpleItem].sort((a, b) => a.name.localeCompare(b.name)));
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `create_${tableName}`, entity: tableName, entity_id: data.id, description: `Created ${entityLabel}: ${form.name}` });
        toast({ title: "Berhasil", description: `${entityLabel} "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch { toast({ title: "Gagal", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) { toast({ title: "Gagal hapus", variant: "destructive" }); fetchItems(); }
    else {
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `delete_${tableName}`, entity: tableName, entity_id: id, description: `Deleted ${entityLabel}: ${item?.name}` });
      toast({ title: "Berhasil", description: `${entityLabel} dihapus.` });
    }
    setDeleteId(null);
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600"><Plus className="mr-2 h-4 w-4" />{addLabel}</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada data.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <p className="text-sm font-medium">{item.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                  {item.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{editingId ? `Edit ${entityLabel}` : addLabel}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`Nama ${entityLabel}...`} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name} className="bg-maroon-700 hover:bg-maroon-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus {entityLabel}?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
