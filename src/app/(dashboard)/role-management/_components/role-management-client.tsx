"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Loader2, Shield, ShieldCheck } from "lucide-react";
import { MENU_ITEMS } from "@/lib/constants";
import type { CurrentUser, Role } from "@/lib/types/database";
import { invalidateRoles } from "@/lib/cache-invalidation";

interface RoleManagementClientProps {
  currentUser: CurrentUser;
  initialRoles: Role[];
}

export function RoleManagementClient({ currentUser, initialRoles }: RoleManagementClientProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", menu_access: [] as string[] });

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", description: "", menu_access: [] });
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description ?? "",
      menu_access: [...role.menu_access],
    });
    setModalOpen(true);
  }

  function toggleMenu(slug: string) {
    setForm((prev) => ({
      ...prev,
      menu_access: prev.menu_access.includes(slug)
        ? prev.menu_access.filter((s) => s !== slug)
        : [...prev.menu_access, slug],
    }));
  }

  function selectAll() {
    setForm((prev) => ({ ...prev, menu_access: MENU_ITEMS.map((m) => m.slug) }));
  }

  function clearAll() {
    setForm((prev) => ({ ...prev, menu_access: [] }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (!currentUser.is_primary) {
      toast({ title: "Tidak diizinkan", description: "Hanya primary user yang dapat mengelola role.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        menu_access: form.menu_access,
      };

      if (editingId) {
        // Edit existing role
        const { error } = await supabase.from("roles").update(payload).eq("id", editingId);
        if (error) throw error;

        setRoles((prev) =>
          prev.map((r) => r.id === editingId ? { ...r, ...payload } : r)
        );
        await invalidateRoles();
        await supabase.from("activity_log").insert({
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: currentUser.role_name,
          action: "update_role",
          entity: "roles",
          entity_id: editingId,
          description: `Updated role: ${form.name}`,
        });
        toast({ title: "Berhasil", description: `Role "${form.name}" diperbarui.` });
      } else {
        // Create new role
        const { data, error } = await supabase
          .from("roles")
          .insert({ ...payload, is_system: false })
          .select()
          .single();
        if (error) throw error;

        setRoles((prev) => [...prev, data as Role]);
        await invalidateRoles();
        await supabase.from("activity_log").insert({
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: currentUser.role_name,
          action: "create_role",
          entity: "roles",
          entity_id: data.id,
          description: `Created role: ${form.name}`,
        });
        toast({ title: "Berhasil", description: `Role "${form.name}" dibuat.` });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Terjadi kesalahan.";
      toast({
        title: "Gagal",
        description: msg.toLowerCase().includes("duplicate") ? "Nama role sudah digunakan." : msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!currentUser.is_primary) {
      toast({ title: "Tidak diizinkan", description: "Hanya primary user yang dapat menghapus role.", variant: "destructive" });
      setDeleteId(null);
      return;
    }
    setDeleting(true);
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id);

    if (count && count > 0) {
      toast({
        title: "Tidak bisa dihapus",
        description: "Role ini masih digunakan oleh user.",
        variant: "destructive",
      });
      setDeleting(false);
      setDeleteId(null);
      return;
    }

    const role = roles.find((r) => r.id === id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal hapus", variant: "destructive" });
      setRoles(initialRoles);
    } else {
      await invalidateRoles();
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "delete_role",
        entity: "roles",
        entity_id: id,
        description: `Deleted role: ${role?.name}`,
      });
      toast({ title: "Berhasil", description: `Role "${role?.name}" dihapus.` });
    }
    setDeleting(false);
    setDeleteId(null);
  }

  const deleteRole = roles.find((r) => r.id === deleteId);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola role dan hak akses menu</p>
        </div>
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Role
        </Button>
      </div>

      {/* Role Cards */}
      {roles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada role.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {role.is_system ? (
                      <ShieldCheck className="h-5 w-5 text-maroon-700 shrink-0" />
                    ) : (
                      <Shield className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">{role.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs bg-maroon-50 text-maroon-700 border-maroon-200">
                        System
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray-500 hover:text-gray-700"
                      onClick={() => openEdit(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!role.is_system && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(role.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Akses Menu ({role.menu_access.length}/{MENU_ITEMS.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.menu_access.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Tidak ada akses menu</span>
                  ) : (
                    role.menu_access.map((slug) => {
                      const item = MENU_ITEMS.find((m) => m.slug === slug);
                      return (
                        <Badge key={slug} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                          {item?.label ?? slug}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Role Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Role" : "Tambah Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Role <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="contoh: Fotografer, Admin, Operator"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat tentang role ini..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hak Akses Menu</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs text-maroon-700 hover:underline">
                    Pilih Semua
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:underline">
                    Hapus Semua
                  </button>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {MENU_ITEMS.map((item) => (
                  <label
                    key={item.slug}
                    className="flex items-center gap-3 cursor-pointer py-1 hover:bg-gray-50 rounded px-1"
                  >
                    <Checkbox
                      checked={form.menu_access.includes(item.slug)}
                      onCheckedChange={() => toggleMenu(item.slug)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.menu_access.filter((s) => MENU_ITEMS.some((m) => m.slug === s)).length} dari {MENU_ITEMS.length} menu dipilih
              </p>
            </div>

            {/* Feature Permissions */}
            <div className="space-y-2">
              <Label>Hak Akses Fitur</Label>
              <div className="border rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer py-1 hover:bg-gray-50 rounded px-1">
                  <Checkbox
                    checked={form.menu_access.includes("booking_full_access")}
                    onCheckedChange={() => toggleMenu("booking_full_access")}
                  />
                  <div>
                    <span className="text-sm font-medium">Full Access Booking</span>
                    <p className="text-xs text-gray-500">Edit detail, reschedule, hapus booking, tab Pricing, dan semua perubahan status</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Status Change Permissions */}
            <div className="space-y-2">
              <div>
                <Label>Izin Perubahan Status Booking</Label>
                <p className="text-xs text-gray-400 mt-0.5">Diabaikan jika role memiliki Full Access Booking</p>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-xs font-medium text-gray-500 col-span-2 mb-1">Transisi Maju (Next)</p>
                  {([
                    ["sc:BOOKED:PAID", "Booked → Paid"],
                    ["sc:PAID:SHOOT_DONE", "Paid → Shoot Done"],
                    ["sc:SHOOT_DONE:PHOTOS_DELIVERED", "Shoot Done → Photos Delivered"],
                    ["sc:PHOTOS_DELIVERED:CLOSED", "Photos Delivered → Closed"],
                  ] as [string, string][]).map(([perm, label]) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1">
                      <Checkbox
                        checked={form.menu_access.includes(perm)}
                        onCheckedChange={() => toggleMenu(perm)}
                      />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-xs font-medium text-gray-500 col-span-2 mb-1">Transisi Mundur (Back)</p>
                  {([
                    ["sc:PAID:BOOKED", "Paid → Booked"],
                    ["sc:SHOOT_DONE:PAID", "Shoot Done → Paid"],
                    ["sc:PHOTOS_DELIVERED:SHOOT_DONE", "Photos Delivered → Shoot Done"],
                    ["sc:CLOSED:PHOTOS_DELIVERED", "Closed → Photos Delivered"],
                  ] as [string, string][]).map(([perm, label]) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1">
                      <Checkbox
                        checked={form.menu_access.includes(perm)}
                        onCheckedChange={() => toggleMenu(perm)}
                      />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 rounded px-1 border-t pt-2">
                  <Checkbox
                    checked={form.menu_access.includes("sc:cancel")}
                    onCheckedChange={() => toggleMenu("sc:cancel")}
                  />
                  <span className="text-xs font-medium text-red-600">Batalkan Booking (Cancel)</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-maroon-700 hover:bg-maroon-600"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Simpan" : "Buat Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role &quot;{deleteRole?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Role ini akan dihapus permanen. Pastikan tidak ada user yang menggunakan role ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
