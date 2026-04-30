# Drag & Drop Reorder Kategori — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual sort_order number input with drag & drop reorder in Settings Kategori tab.

**Architecture:** Single file change to `tab-categories.tsx` + install `@dnd-kit`. Split active (draggable) and inactive (collapsed section) categories. Floating save bar appears after reorder with Batal/Simpan Urutan buttons.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

---

### Task 1: Install @dnd-kit

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify install**

```bash
npm ls @dnd-kit/core
```

Expected: `@dnd-kit/core@x.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit for drag & drop reorder"
```

---

### Task 2: Refactor CategorySection with drag & drop

**Files:**
- Modify: `src/app/(dashboard)/settings/_components/tab-categories.tsx`

**Changes:**

- [ ] **Step 1: Add imports for @dnd-kit**

Add at top of file:
```typescript
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
```

- [ ] **Step 2: Create SortableCategoryItem component**

New component inside same file, renders a single draggable category row:
```typescript
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
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-white ${isDragging ? "shadow-lg opacity-80 z-10" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>
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
```

- [ ] **Step 3: Refactor CategorySection state**

Replace current items state with split active/inactive + reorder tracking:
```typescript
const [items, setItems] = useState<CategoryItem[]>([]);
const [originalOrder, setOriginalOrder] = useState<string[]>([]);
const [hasReordered, setHasReordered] = useState(false);
const [savingOrder, setSavingOrder] = useState(false);
const [inactiveExpanded, setInactiveExpanded] = useState(false);

const activeItems = items.filter((i) => i.is_active);
const inactiveItems = items.filter((i) => !i.is_active);
```

After fetchItems, store original order:
```typescript
if (data) {
  setItems(data);
  setOriginalOrder(data.filter((i: CategoryItem) => i.is_active).map((i: CategoryItem) => i.id));
}
```

- [ ] **Step 4: Add drag sensors and handlers**

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  setItems((prev) => {
    const activeList = prev.filter((i) => i.is_active);
    const inactiveList = prev.filter((i) => !i.is_active);
    const oldIndex = activeList.findIndex((i) => i.id === active.id);
    const newIndex = activeList.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(activeList, oldIndex, newIndex);
    return [...reordered, ...inactiveList];
  });
  setHasReordered(true);
}
```

- [ ] **Step 5: Add save/cancel order handlers**

```typescript
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
    const activeList = items.filter((i) => i.is_active);
    const updates = activeList.map((item, index) =>
      supabase.from(tableName).update({ sort_order: index + 1 }).eq("id", item.id)
    );
    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    if (hasError) throw new Error("Failed to save order");

    setOriginalOrder(activeList.map((i) => i.id));
    setHasReordered(false);
    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: `reorder_${activityPrefix}`,
      entity: tableName,
      entity_id: "",
      description: `Reordered ${activeList.length} categories`,
    });
    toast({ title: "Berhasil", description: "Urutan kategori disimpan." });
  } catch {
    toast({ title: "Gagal", description: "Gagal menyimpan urutan.", variant: "destructive" });
  } finally {
    setSavingOrder(false);
  }
}
```

- [ ] **Step 6: Update render — active list with DndContext**

Replace the current items.map rendering with:
```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={activeItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
    <div className="space-y-2">
      {activeItems.map((item) => (
        <SortableCategoryItem key={item.id} item={item} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

- [ ] **Step 7: Add floating save bar**

After the DndContext, render conditionally:
```tsx
{hasReordered && (
  <div className="flex items-center justify-end gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <span className="text-sm text-amber-800 mr-auto">Urutan berubah</span>
    <Button variant="outline" size="sm" onClick={handleCancelReorder} disabled={savingOrder}>Batal</Button>
    <Button size="sm" onClick={handleSaveOrder} disabled={savingOrder} className="bg-maroon-700 hover:bg-maroon-600">
      {savingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Simpan Urutan
    </Button>
  </div>
)}
```

- [ ] **Step 8: Add inactive collapsed section**

After the save bar:
```tsx
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
```

- [ ] **Step 9: Update modal — remove sort_order field**

Remove the sort_order input from the modal. Update emptyForm:
```typescript
const emptyForm = { name: "", is_active: true };
```

Update form type, openEdit, and handleSave to remove sort_order. On create, auto-assign sort_order as last position:
```typescript
// In handleSave, for new items:
const maxSort = items.filter((i) => i.is_active).length;
const payload = {
  name: form.name.trim(),
  sort_order: editingId ? undefined : maxSort + 1,
  is_active: form.is_active,
};
```

On edit, keep existing sort_order (don't change it). If toggled from inactive→active, assign last position. If toggled from active→inactive, no sort_order change needed.

- [ ] **Step 10: Handle active↔inactive toggle in handleSave**

When editing and is_active changes:
```typescript
const existingItem = items.find((i) => i.id === editingId);
const wasActive = existingItem?.is_active;
const nowActive = form.is_active;

let sortOrder: number | undefined;
if (!wasActive && nowActive) {
  // Reactivated — put at end of active list
  sortOrder = items.filter((i) => i.is_active).length + 1;
} else if (editingId) {
  sortOrder = existingItem?.sort_order;
} else {
  sortOrder = items.filter((i) => i.is_active).length + 1;
}

const payload = {
  name: form.name.trim(),
  sort_order: sortOrder,
  is_active: form.is_active,
};
```

- [ ] **Step 11: Verify build**

```bash
npm run build
```

Expected: No errors

- [ ] **Step 12: Commit**

```bash
git add src/app/\(dashboard\)/settings/_components/tab-categories.tsx
git commit -m "feat(settings): drag & drop reorder for category tabs"
```
