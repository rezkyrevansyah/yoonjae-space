"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { CurrentUser, Background } from "@/lib/types/database";
import { invalidateBackgrounds } from "@/lib/cache-invalidation";

interface TabBackgroundsProps {
  currentUser: CurrentUser;
}

export function TabBackgrounds({ currentUser }: TabBackgroundsProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Background[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_available: true });

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from("backgrounds").select("id, name, description, is_available, created_at").order("name");
    if (data) setItems(data);
    setLoading(false);
  }

  function openAdd() { setEditingId(null); setForm({ name: "", description: "", is_available: true }); setModalOpen(true); }
  function openEdit(item: Background) { setEditingId(item.id); setForm({ name: item.name, description: item.description ?? "", is_available: item.is_available }); setModalOpen(true); }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, is_available: form.is_available };
    try {
      if (editingId) {
        const { error } = await supabase.from("backgrounds").update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await invalidateBackgrounds();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_background", entity: "backgrounds", entity_id: editingId, description: `Updated background: ${form.name}` });
        toast({ title: "Berhasil", description: `Background "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("backgrounds").insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        await invalidateBackgrounds();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_background", entity: "backgrounds", entity_id: data.id, description: `Created background: ${form.name}` });
        toast({ title: "Berhasil", description: `Background "${form.name}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch { toast({ title: "Gagal", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("backgrounds").delete().eq("id", id);
    if (error) { toast({ title: "Gagal hapus", variant: "destructive" }); fetch(); }
    else {
      await invalidateBackgrounds();
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_background", entity: "backgrounds", entity_id: id, description: `Deleted background: ${item?.name}` });
      toast({ title: "Berhasil", description: "Background dihapus." });
    }
    setDeleteId(null);
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600"><Plus className="mr-2 h-4 w-4" />Tambah Background</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada background.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={item.is_available ? "default" : "secondary"} className={item.is_available ? "bg-green-100 text-green-800 border-green-200" : ""}>
                  {item.is_available ? "Tersedia" : "Tidak Tersedia"}
                </Badge>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit Background" : "Tambah Background"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Abu-abu Gelap" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
              <Label>Tersedia untuk Digunakan</Label>
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
          <AlertDialogHeader><AlertDialogTitle>Hapus Background?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
