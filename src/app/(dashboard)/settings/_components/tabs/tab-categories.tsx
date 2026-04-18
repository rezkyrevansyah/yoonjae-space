"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Loader2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { invalidatePackages, invalidateAddons } from "@/lib/cache-invalidation";
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

const emptyForm = { name: "", is_active: true };

/* ── Sortable row for active categories ── */
function SortableCategoryItem({
  item,
  onEdit,
  onDelete,
}: {
  item: CategoryItem;
  onEdit: (item: CategoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-white ${isDragging ? "shadow-lg opacity-80 z-10 relative" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          Aktif
        </Badge>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ── Category section (Kategori Paket / Kategori Add-on) ── */
function CategorySection({
  title,
  tableName,
  activityPrefix,
  currentUser,
  invalidateCache,
}: {
  title: string;
  tableName: "package_categories" | "addon_categories";
  activityPrefix: string;
  currentUser: CurrentUser;
  invalidateCache: () => Promise<void>;
}) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const activeItems = useMemo(() => items.filter((i) => i.is_active), [items]);
  const inactiveItems = useMemo(() => items.filter((i) => !i.is_active), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from(tableName)
      .select("id, name, sort_order, is_active, created_at")
      .order("sort_order")
      .order("name");
    if (data) {
      setItems(data);
      setOriginalOrder(data.filter((i: CategoryItem) => i.is_active).map((i: CategoryItem) => i.id));
      setHasReordered(false);
    }
    setLoading(false);
  }

  /* ── Drag & Drop ── */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const activeList = prev.filter((i) => i.is_active);
      const inactiveList = prev.filter((i) => !i.is_active);
      const oldIndex = activeList.findIndex((i) => i.id === active.id);
      const newIndex = activeList.findIndex((i) => i.id === over.id);
      return [...arrayMove(activeList, oldIndex, newIndex), ...inactiveList];
    });
    setHasReordered(true);
  }

  function handleCancelReorder() {
    setItems((prev) => {
      const activeList = prev.filter((i) => i.is_active);
      const inactiveList = prev.filter((i) => !i.is_active);
      const sorted = [...activeList].sort(
        (a, b) => originalOrder.indexOf(a.id) - originalOrder.indexOf(b.id)
      );
      return [...sorted, ...inactiveList];
    });
    setHasReordered(false);
  }

  async function handleSaveOrder() {
    setSavingOrder(true);
    try {
      const updates = activeItems.map((item, index) =>
        supabase.from(tableName).update({ sort_order: index + 1 }).eq("id", item.id)
      );
      const results = await Promise.all(updates);
      if (results.some((r) => r.error)) throw new Error("Failed to save order");

      setOriginalOrder(activeItems.map((i) => i.id));
      setHasReordered(false);
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: `reorder_${activityPrefix}`,
        entity: tableName,
        entity_id: "",
        description: `Reordered ${activeItems.length} categories`,
      });
      await invalidateCache();
      toast({ title: "Berhasil", description: "Urutan kategori disimpan." });
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan urutan.", variant: "destructive" });
    } finally {
      setSavingOrder(false);
    }
  }

  /* ── CRUD ── */
  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: CategoryItem) {
    setEditingId(item.id);
    setForm({ name: item.name, is_active: item.is_active });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    const existingItem = editingId ? items.find((i) => i.id === editingId) : null;

    let sortOrder: number;
    if (editingId && existingItem) {
      // Reactivated → put at end of active list
      if (!existingItem.is_active && form.is_active) {
        sortOrder = activeItems.length + 1;
      } else {
        sortOrder = existingItem.sort_order;
      }
    } else {
      // New item → last position
      sortOrder = activeItems.length + 1;
    }

    const payload = {
      name: form.name.trim(),
      sort_order: sortOrder,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => i.id === editingId ? { ...i, ...payload } : i));
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `update_${activityPrefix}`, entity: tableName, entity_id: editingId, description: `Updated category: ${form.name}` });
        await invalidateCache();
        toast({ title: "Berhasil", description: `Kategori "${form.name}" diperbarui.` });
      } else {
        const { data, error } = await supabase.from(tableName).insert(payload).select().single();
        if (error) throw error;
        if (form.is_active) {
          setItems((prev) => {
            const actives = prev.filter((i) => i.is_active);
            const inactives = prev.filter((i) => !i.is_active);
            return [...actives, data, ...inactives];
          });
        } else {
          setItems((prev) => [...prev, data]);
        }
        await supabase.from("activity_log").insert({ user_id: currentUser.id, user_name: currentUser.name, user_role: currentUser.role_name, action: `create_${activityPrefix}`, entity: tableName, entity_id: data.id, description: `Created category: ${form.name}` });
        await invalidateCache();
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
      await invalidateCache();
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
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : activeItems.length === 0 && inactiveItems.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          Belum ada kategori.
        </div>
      ) : (
        <>
          {/* Active — draggable */}
          {activeItems.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <SortableCategoryItem key={item.id} item={item} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
              Tidak ada kategori aktif.
            </div>
          )}

          {/* Save bar */}
          {hasReordered && (
            <div className="flex items-center justify-end gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-amber-800 mr-auto">Urutan berubah</span>
              <Button variant="outline" size="sm" onClick={handleCancelReorder} disabled={savingOrder}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSaveOrder} disabled={savingOrder} className="bg-maroon-700 hover:bg-maroon-600">
                {savingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Urutan
              </Button>
            </div>
          )}

          {/* Inactive — collapsed */}
          {inactiveItems.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setInactiveExpanded(!inactiveExpanded)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {inactiveExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Non-aktif ({inactiveItems.length})
              </button>
              {inactiveExpanded && (
                <div className="space-y-2 mt-2">
                  {inactiveItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 opacity-60">
                      <div className="flex items-center gap-3 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">Nonaktif</Badge>
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
            </div>
          )}
        </>
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
        invalidateCache={invalidatePackages}
      />

      <div className="border-t" />

      <CategorySection
        title="Kategori Add-on"
        tableName="addon_categories"
        activityPrefix="addon_category"
        currentUser={currentUser}
        invalidateCache={invalidateAddons}
      />
    </div>
  );
}
