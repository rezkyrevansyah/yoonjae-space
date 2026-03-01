"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Crown } from "lucide-react";
import type { CurrentUser, Role } from "@/lib/types/database";

export interface UserRow {
  id: string;
  auth_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role_id: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  roles?: { id: string; name: string } | { id: string; name: string }[];
}

interface UserManagementClientProps {
  currentUser: CurrentUser;
  initialUsers: UserRow[];
  roles: Role[];
}

function getRoleName(user: UserRow): string {
  if (!user.roles) return "—";
  const r = Array.isArray(user.roles) ? user.roles[0] : user.roles;
  return r?.name ?? "—";
}

export function UserManagementClient({ currentUser, initialUsers, roles }: UserManagementClientProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    role_id: "",
    is_active: true,
  });

  function openAdd() {
    setAddForm({ name: "", email: "", phone: "", password: "", confirmPassword: "", role_id: roles[0]?.id ?? "", is_active: true });
    setModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditingId(user.id);
    const r = Array.isArray(user.roles) ? user.roles[0] : user.roles;
    setEditForm({
      name: user.name,
      phone: user.phone ?? "",
      role_id: r?.id ?? user.role_id,
      is_active: user.is_active,
    });
    setEditModalOpen(true);
  }

  async function handleCreate() {
    if (!addForm.name || !addForm.email || !addForm.password || !addForm.role_id) return;
    if (addForm.password !== addForm.confirmPassword) {
      toast({ title: "Password tidak cocok", variant: "destructive" });
      return;
    }
    if (addForm.password.length < 6) {
      toast({ title: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          phone: addForm.phone || null,
          password: addForm.password,
          role_id: addForm.role_id,
          is_active: addForm.is_active,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan.");

      const newUser = json.user as UserRow;
      // Attach role info for display
      const roleObj = roles.find((r) => r.id === addForm.role_id);
      if (roleObj) newUser.roles = { id: roleObj.id, name: roleObj.name };
      setUsers((prev) => [...prev, newUser]);

      toast({ title: "Berhasil", description: `User "${addForm.name}" dibuat.` });
      setModalOpen(false);
    } catch (err: unknown) {
      toast({ title: "Gagal", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editingId || !editForm.name || !editForm.role_id) return;
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        phone: editForm.phone || null,
        role_id: editForm.role_id,
        is_active: editForm.is_active,
      };
      const { error } = await supabase.from("users").update(payload).eq("id", editingId);
      if (error) throw error;

      const roleObj = roles.find((r) => r.id === editForm.role_id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? { ...u, ...payload, roles: roleObj ? { id: roleObj.id, name: roleObj.name } : u.roles }
            : u
        )
      );

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "update_user",
        entity: "users",
        entity_id: editingId,
        description: `Updated user: ${editForm.name}`,
      });

      toast({ title: "Berhasil", description: `User "${editForm.name}" diperbarui.` });
      setEditModalOpen(false);
    } catch (err: unknown) {
      toast({ title: "Gagal", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan.");

      const deleted = users.find((u) => u.id === id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "Berhasil", description: `User "${deleted?.name}" dihapus.` });
    } catch (err: unknown) {
      toast({ title: "Gagal", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const deleteUser = users.find((u) => u.id === deleteId);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola akun dan akses sistem</p>
        </div>
        <Button onClick={openAdd} className="bg-maroon-700 hover:bg-maroon-600">
          <Plus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dibuat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Belum ada user.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u.is_primary && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {getRoleName(u)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.is_active ? "default" : "secondary"}
                        className={u.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}
                      >
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!u.is_primary && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(u.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y">
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada user.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.is_primary && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!u.is_primary && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{getRoleName(u)}</Badge>
                  <Badge
                    variant={u.is_active ? "default" : "secondary"}
                    className={`text-xs ${u.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}`}
                  >
                    {u.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>No. HP</Label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="Min. 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi Password <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                value={addForm.confirmPassword}
                onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                placeholder="Ulangi password"
              />
            </div>
            <div className="space-y-2">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={addForm.role_id} onValueChange={(v) => setAddForm({ ...addForm, role_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={addForm.is_active}
                onCheckedChange={(v) => setAddForm({ ...addForm, is_active: v })}
              />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !addForm.name || !addForm.email || !addForm.password || !addForm.confirmPassword || !addForm.role_id}
              className="bg-maroon-700 hover:bg-maroon-600"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambah User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>No. HP</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={editForm.role_id} onValueChange={(v) => setEditForm({ ...editForm, role_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })}
              />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Batal</Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !editForm.name || !editForm.role_id}
              className="bg-maroon-700 hover:bg-maroon-600"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User &quot;{deleteUser?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun user ini akan dihapus permanen termasuk akses login. Tindakan ini tidak bisa dibatalkan.
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
