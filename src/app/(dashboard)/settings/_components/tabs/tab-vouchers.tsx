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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { CurrentUser, Voucher } from "@/lib/types/database";

interface TabVouchersProps {
  currentUser: CurrentUser;
}

export function TabVouchers({ currentUser }: TabVouchersProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Voucher[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "", discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "", valid_from: "", valid_until: "",
    minimum_purchase: "", is_active: true,
  });

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from("vouchers").select("id, code, discount_type, discount_value, valid_from, valid_until, minimum_purchase, is_active, created_at").order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ code: "", discount_type: "percentage", discount_value: "", valid_from: "", valid_until: "", minimum_purchase: "", is_active: true });
    setModalOpen(true);
  }

  function openEdit(item: Voucher) {
    setEditingId(item.id);
    setForm({
      code: item.code, discount_type: item.discount_type,
      discount_value: String(item.discount_value),
      valid_from: item.valid_from ?? "", valid_until: item.valid_until ?? "",
      minimum_purchase: String(item.minimum_purchase),
      is_active: item.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code || !form.discount_value) return;
    if (form.valid_until && !form.valid_from) {
      toast({
        title: "Periksa tanggal",
        description: "Tanggal 'Berlaku Dari' harus diisi jika 'Berlaku Sampai' diisi.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseInt(form.discount_value.replace(/\D/g, ""), 10),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      minimum_purchase: form.minimum_purchase ? parseInt(form.minimum_purchase.replace(/\D/g, ""), 10) : 0,
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from("vouchers").update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "update_voucher", entity: "vouchers", entity_id: editingId, description: `Updated voucher: ${form.code}` });
        toast({ title: "Berhasil", description: `Voucher "${form.code}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from("vouchers").insert(payload).select().single();
        if (error) throw error;
        setItems((prev) => [data, ...prev]);
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "create_voucher", entity: "vouchers", entity_id: data.id, description: `Created voucher: ${form.code}` });
        toast({ title: "Berhasil", description: `Voucher "${form.code}" ditambahkan.` });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Terjadi kesalahan.";
      toast({ title: "Gagal", description: msg.includes("duplicate") ? "Kode voucher sudah ada." : msg, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) { toast({ title: "Gagal hapus", variant: "destructive" }); fetchItems(); }
    else {
      await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: "delete_voucher", entity: "vouchers", entity_id: id, description: `Deleted voucher: ${item?.code}` });
      toast({ title: "Berhasil", description: "Voucher dihapus." });
    }
    setDeleteId(null);
  }

  function formatDiscount(v: Voucher) {
    return v.discount_type === "percentage" ? `${v.discount_value}%` : formatRupiah(v.discount_value);
  }

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600"><Plus className="mr-2 h-4 w-4" />Tambah Voucher</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada voucher.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold">{item.code}</p>
                  <Badge variant={item.is_active ? "default" : "secondary"} className={item.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Diskon {formatDiscount(item)}
                  {item.minimum_purchase > 0 && ` · min. ${formatRupiah(item.minimum_purchase)}`}
                  {(item.valid_from || item.valid_until) && ` · ${item.valid_from ?? ""} s/d ${item.valid_until ?? ""}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Voucher" : "Tambah Voucher"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kode Voucher <span className="text-red-500">*</span></Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LEBARAN2025" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipe Diskon</Label>
                <Select value={form.discount_type} onValueChange={(v: "percentage" | "fixed") => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nilai <span className="text-red-500">*</span></Label>
                <Input value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value.replace(/\D/g, "") })} placeholder={form.discount_type === "percentage" ? "10" : "50000"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimum Pembelian (Rp)</Label>
              <Input value={form.minimum_purchase} onChange={(e) => setForm({ ...form, minimum_purchase: e.target.value.replace(/\D/g, "") })} placeholder="0" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Berlaku Dari</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Berlaku Sampai</Label>
                <Input type="date" value={form.valid_until} min={form.valid_from} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.discount_value} className="bg-maroon-700 hover:bg-maroon-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Voucher?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
