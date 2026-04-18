"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import type { CurrentUser, CustomField, FieldType } from "@/lib/types/database";
import { invalidateCustomFields } from "@/lib/cache-invalidation";

interface TabCustomFieldsProps {
  currentUser: CurrentUser;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  select: "Select (Pilihan)",
  checkbox: "Checkbox",
  number: "Number",
  url: "URL",
};

export function TabCustomFields({ currentUser }: TabCustomFieldsProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CustomField[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", field_type: "text" as FieldType, is_active: true });
  const [optionInput, setOptionInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from("custom_fields").select("id, label, field_type, options, is_active, created_at").order("created_at");
    if (data) setItems(data);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ label: "", field_type: "text", is_active: true });
    setOptions([]);
    setOptionInput("");
    setModalOpen(true);
  }

  function openEdit(item: CustomField) {
    setEditingId(item.id);
    setForm({ label: item.label, field_type: item.field_type, is_active: item.is_active });
    setOptions(item.options ?? []);
    setOptionInput("");
    setModalOpen(true);
  }

  function addOption() {
    const trimmed = optionInput.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions((prev) => [...prev, trimmed]);
    }
    setOptionInput("");
  }

  function removeOption(opt: string) {
    setOptions((prev) => prev.filter((o) => o !== opt));
  }

  async function handleSave() {
    if (!form.label) return;
    setSaving(true);
    const payload = {
      label: form.label,
      field_type: form.field_type,
      options: form.field_type === "select" ? options : [],
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from("custom_fields").update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await invalidateCustomFields();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_custom_field", entity: "custom_fields", entity_id: editingId, description: `Updated custom field: ${form.label}` });
        toast({ title: "Berhasil", description: `Custom field "${form.label}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("custom_fields").insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [...prev, data]);
        await invalidateCustomFields();
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_custom_field", entity: "custom_fields", entity_id: data.id, description: `Created custom field: ${form.label}` });
        toast({ title: "Berhasil", description: `Custom field "${form.label}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch { toast({ title: "Gagal", variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("custom_fields").delete().eq("id", id);
    if (error) { toast({ title: "Gagal hapus", variant: "destructive" }); fetchItems(); }
    else {
      await invalidateCustomFields();
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_custom_field", entity: "custom_fields", entity_id: id, description: `Deleted custom field: ${item?.label}` });
      toast({ title: "Berhasil", description: "Custom field dihapus." });
    }
    setDeleteId(null);
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">Field aktif akan muncul di form Create Booking. Nilainya tampil di Booking Detail, <strong>tidak</strong> di invoice.</p>
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600 shrink-0"><Plus className="mr-2 h-4 w-4" />Tambah Field</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada custom field.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">{FIELD_TYPE_LABELS[item.field_type]}</Badge>
                  {item.field_type === "select" && item.options && (
                    <span className="text-xs text-muted-foreground">{item.options.length} opsi</span>
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
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "Edit Custom Field" : "Tambah Custom Field"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Label <span className="text-red-500">*</span></Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Instagram, Domisili, dll." />
            </div>
            <div className="space-y-2">
              <Label>Tipe Field</Label>
              <Select value={form.field_type} onValueChange={(v: FieldType) => setForm({ ...form, field_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.field_type === "select" && (
              <div className="space-y-2">
                <Label>Opsi</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    placeholder="Ketik opsi, Enter untuk tambah"
                  />
                  <Button type="button" variant="outline" onClick={addOption} size="sm">Tambah</Button>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {options.map((opt) => (
                      <span key={opt} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {opt}
                        <button onClick={() => removeOption(opt)} className="text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.label} className="bg-maroon-700 hover:bg-maroon-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Custom Field?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
