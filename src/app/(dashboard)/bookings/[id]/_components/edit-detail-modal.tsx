"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn, formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Loader2 } from "lucide-react";
import type { BookingDetail } from "./booking-detail-client";
import type { CurrentUser } from "@/lib/types/database";

const supabase = createClient();

interface FormState {
  package_id: string;
  person_count: number;
  background_ids: string[];
  photo_for_id: string;
  behind_the_scenes: boolean;
  notes: string;
  staff_id: string;
  customFieldValues: Record<string, string>;
}

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface BackgroundOption {
  id: string;
  name: string;
}

export interface PhotoForOption {
  id: string;
  name: string;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface CustomFieldOption {
  id: string;
  label: string;
  field_type: string;
  options: string[] | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  booking: BookingDetail;
  currentUser: CurrentUser;
  onUpdated: (updated: Partial<BookingDetail>) => void;
  packages: PackageOption[];
  backgrounds: BackgroundOption[];
  photoFors: PhotoForOption[];
  users: UserOption[];
  customFields: CustomFieldOption[];
}

export function EditDetailModal({ open, onClose, booking, currentUser, onUpdated, packages, backgrounds, photoFors, users, customFields }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [personCountInput, setPersonCountInput] = useState("1");

  const [form, setForm] = useState<FormState>({
    package_id: "",
    person_count: 1,
    background_ids: [],
    photo_for_id: "",
    behind_the_scenes: false,
    notes: "",
    staff_id: "",
    customFieldValues: {},
  });

  // Pre-fill form when modal opens
  useEffect(() => {
    if (!open) return;
    const pc = booking.person_count;
    setPersonCountInput(String(pc));
    setForm({
      package_id: booking.packages?.id ?? "",
      person_count: pc,
      background_ids: booking.booking_backgrounds.map((b) => b.background_id),
      photo_for_id: booking.photo_for?.id ?? "",
      behind_the_scenes: booking.behind_the_scenes,
      notes: booking.notes ?? "",
      staff_id: booking.staff?.id ?? "",
      customFieldValues: Object.fromEntries(
        booking.booking_custom_fields.map((cf) => [cf.custom_field_id, cf.value ?? ""])
      ),
    });
  }, [open, booking]);

  function toggleBackground(id: string) {
    setForm((f) => ({
      ...f,
      background_ids: f.background_ids.includes(id)
        ? f.background_ids.filter((b) => b !== id)
        : [...f.background_ids, id],
    }));
  }

  function setCustomField(id: string, value: string) {
    setForm((f) => ({ ...f, customFieldValues: { ...f.customFieldValues, [id]: value } }));
  }

  const selectedPackage = packages.find((p) => p.id === form.package_id);

  async function handleSubmit() {
    if (!form.package_id) {
      toast({ title: "Error", description: "Paket harus dipilih", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Calculate new subtotal/total
      const packagePrice = selectedPackage?.price ?? booking.packages?.price ?? 0;
      const addonsTotal = booking.booking_addons
        .filter((a) => !a.is_extra)
        .reduce((sum, a) => sum + a.price, 0);
      const newSubtotal = packagePrice + addonsTotal;

      // Re-apply existing discount
      let discount = booking.manual_discount ?? 0;
      if (booking.vouchers) {
        const v = booking.vouchers;
        if (v.discount_type === "percentage") {
          discount = Math.round(newSubtotal * v.discount_value / 100);
        } else {
          discount = v.discount_value;
        }
      }
      const newTotal = Math.max(0, newSubtotal - discount);

      // 1. Update bookings row
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          package_id: form.package_id,
          person_count: form.person_count,
          photo_for_id: form.photo_for_id || null,
          behind_the_scenes: form.behind_the_scenes,
          notes: form.notes || "",
          staff_id: form.staff_id || null,
          subtotal: newSubtotal,
          total: newTotal,
        })
        .eq("id", booking.id);
      if (bookingError) throw bookingError;

      // 2. Update booking_backgrounds: delete + reinsert
      const { error: bgDeleteError } = await supabase
        .from("booking_backgrounds")
        .delete()
        .eq("booking_id", booking.id);
      if (bgDeleteError) throw bgDeleteError;

      if (form.background_ids.length > 0) {
        const { error: bgInsertError } = await supabase
          .from("booking_backgrounds")
          .insert(form.background_ids.map((bg_id) => ({ booking_id: booking.id, background_id: bg_id })));
        if (bgInsertError) throw bgInsertError;
      }

      // 3. Update custom fields: delete all then reinsert non-empty values
      await supabase.from("booking_custom_fields").delete().eq("booking_id", booking.id);
      const cfRows = customFields
        .filter((cf) => (form.customFieldValues[cf.id] ?? "") !== "")
        .map((cf) => ({ booking_id: booking.id, custom_field_id: cf.id, value: form.customFieldValues[cf.id] }));
      if (cfRows.length > 0) {
        const { error: cfError } = await supabase.from("booking_custom_fields").insert(cfRows);
        if (cfError) throw cfError;
      }

      // 4. Log activity
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "UPDATE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Mengedit detail booking ${booking.booking_number}`,
      });

      // 5. Notify parent to refresh
      const newPackage = selectedPackage
        ? { id: selectedPackage.id, name: selectedPackage.name, price: selectedPackage.price, duration_minutes: selectedPackage.duration_minutes }
        : booking.packages;
      const newPhotoFor = photoFors.find((p) => p.id === form.photo_for_id) ?? null;
      const newStaff = users.find((u) => u.id === form.staff_id) ?? null;
      const newBgRows = form.background_ids.map((bg_id) => {
        const bg = backgrounds.find((b) => b.id === bg_id);
        return { background_id: bg_id, backgrounds: bg ? { id: bg_id, name: bg.name } : null };
      });
      const newCustomFieldRows = customFields
        .filter((cf) => (form.customFieldValues[cf.id] ?? "") !== "")
        .map((cf) => ({
          custom_field_id: cf.id,
          value: form.customFieldValues[cf.id],
          custom_fields: { id: cf.id, label: cf.label, field_type: cf.field_type, options: cf.options },
        }));

      onUpdated({
        packages: newPackage,
        person_count: form.person_count,
        photo_for: newPhotoFor ? { id: newPhotoFor.id, name: newPhotoFor.name } : null,
        behind_the_scenes: form.behind_the_scenes,
        notes: form.notes || null,
        staff: newStaff ? { id: newStaff.id, name: newStaff.name } : null,
        subtotal: newSubtotal,
        total: newTotal,
        booking_backgrounds: newBgRows,
        booking_custom_fields: newCustomFieldRows,
      });

      toast({ title: "Berhasil", description: "Detail booking berhasil diperbarui" });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Unknown error";
      console.error("EditDetailModal error:", err);
      toast({ title: "Error", description: msg || "Gagal menyimpan perubahan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#8B1A1A]" />
            Edit Detail Booking
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            Booking <span className="font-mono font-medium">{booking.booking_number}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
            {/* Package */}
            <div>
              <Label className="mb-1.5 block">
                Paket <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.package_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, package_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>— Pilih paket —</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatRupiah(p.price)} ({p.duration_minutes} mnt)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Person Count */}
            <div>
              <Label className="mb-1.5 block">
                Jumlah Orang <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={personCountInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setPersonCountInput(e.target.value);
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setForm((f) => ({ ...f, person_count: v }));
                }}
              />
            </div>

            {/* Backgrounds */}
            {backgrounds.length > 0 && (
              <div>
                <Label className="mb-1.5 block">Background</Label>
                <div className="grid grid-cols-2 gap-2">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => toggleBackground(bg.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                        form.background_ids.includes(bg.id)
                          ? "bg-maroon-50 border-maroon-400 text-maroon-700 font-medium"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      )}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo For */}
            <div>
              <Label className="mb-1.5 block">Photo For</Label>
              <Select
                value={form.photo_for_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, photo_for_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tujuan foto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {photoFors.map((pf) => (
                    <SelectItem key={pf.id} value={pf.id}>{pf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BTS */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id="edit-bts"
                checked={form.behind_the_scenes}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, behind_the_scenes: !!checked }))}
              />
              <div>
                <label htmlFor="edit-bts" className="text-sm font-medium cursor-pointer">
                  Behind the Scenes (BTS)
                </label>
                <p className="text-xs text-gray-500">Video dokumentasi proses foto</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan untuk sesi ini..."
                rows={3}
              />
            </div>

            {/* Staff */}
            <div>
              <Label className="mb-1.5 block">Staff</Label>
              <Select
                value={form.staff_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, staff_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Informasi Tambahan</p>
                {customFields.map((cf) => (
                  <div key={cf.id}>
                    <Label className="mb-1.5 block">{cf.label}</Label>
                    {cf.field_type === "text" && (
                      <Input
                        value={form.customFieldValues[cf.id] ?? ""}
                        onChange={(e) => setCustomField(cf.id, e.target.value)}
                      />
                    )}
                    {cf.field_type === "number" && (
                      <Input
                        type="number"
                        value={form.customFieldValues[cf.id] ?? ""}
                        onChange={(e) => setCustomField(cf.id, e.target.value)}
                      />
                    )}
                    {cf.field_type === "url" && (
                      <Input
                        type="url"
                        value={form.customFieldValues[cf.id] ?? ""}
                        onChange={(e) => setCustomField(cf.id, e.target.value)}
                        placeholder="https://"
                      />
                    )}
                    {cf.field_type === "checkbox" && (
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox
                          checked={form.customFieldValues[cf.id] === "true"}
                          onCheckedChange={(checked) => setCustomField(cf.id, checked ? "true" : "false")}
                        />
                        <span className="text-sm text-gray-700">{cf.label}</span>
                      </div>
                    )}
                    {cf.field_type === "select" && cf.options && (
                      <Select
                        value={form.customFieldValues[cf.id] || "__none__"}
                        onValueChange={(v) => setCustomField(cf.id, v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih opsi..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {cf.options.filter(Boolean).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.package_id}
                className="bg-[#8B1A1A] hover:bg-[#B22222] gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
