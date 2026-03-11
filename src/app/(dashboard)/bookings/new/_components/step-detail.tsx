"use client";

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
import { cn } from "@/lib/utils";
import type { DetailFormData, CustomFieldValues } from "./new-booking-client";
import type { Background, PhotoFor, CustomField } from "@/lib/types/database";

interface Props {
  detailData: DetailFormData;
  onChange: (data: DetailFormData) => void;
  backgrounds: Background[];
  photoFors: PhotoFor[];
  customFields: CustomField[];
  customFieldValues: CustomFieldValues;
  onCustomFieldChange: (values: CustomFieldValues) => void;
}

export function StepDetail({
  detailData,
  onChange,
  backgrounds,
  photoFors,
  customFields,
  customFieldValues,
  onCustomFieldChange,
}: Props) {
  function toggleBackground(id: string) {
    const current = detailData.background_ids;
    const next = current.includes(id)
      ? current.filter((b) => b !== id)
      : [...current, id];
    onChange({ ...detailData, background_ids: next });
  }

  function setCF(id: string, value: string) {
    onCustomFieldChange({ ...customFieldValues, [id]: value });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Detail & Info Tambahan</h2>
        <p className="text-sm text-gray-500">Isi detail sesi foto</p>
      </div>

      <div>
        <Label>Jumlah Orang <span className="text-red-500">*</span></Label>
        <Input
          type="number"
          min={1}
          value={detailData.person_count || ""}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onChange({ ...detailData, person_count: isNaN(v) ? 0 : v });
          }}
        />
      </div>

      <div>
        <Label className="mb-2 block">Background (pilih lebih dari satu)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => toggleBackground(bg.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                detailData.background_ids.includes(bg.id)
                  ? "bg-maroon-50 border-maroon-400 text-maroon-700 font-medium"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              )}
            >
              {bg.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Photo For</Label>
        <Select
          value={detailData.photo_for_id || "__none__"}
          onValueChange={(v) => onChange({ ...detailData, photo_for_id: v === "__none__" ? "" : v })}
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

      <div>
        <Label>Notes</Label>
        <Textarea
          value={detailData.notes}
          onChange={(e) => onChange({ ...detailData, notes: e.target.value })}
          placeholder="Catatan tambahan untuk sesi ini..."
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Checkbox
          id="bts"
          checked={detailData.behind_the_scenes}
          onCheckedChange={(checked) =>
            onChange({ ...detailData, behind_the_scenes: !!checked })
          }
        />
        <div>
          <label htmlFor="bts" className="text-sm font-medium cursor-pointer">
            Behind the Scenes (BTS)
          </label>
          <p className="text-xs text-gray-500">Video dokumentasi proses foto</p>
        </div>
      </div>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="space-y-4 pt-2 border-t">
          <p className="text-sm font-medium text-gray-700">Informasi Tambahan</p>
          {customFields.map((cf) => (
            <div key={cf.id}>
              <Label className="mb-1 block">{cf.label}</Label>
              {cf.field_type === "text" && (
                <Input
                  value={customFieldValues[cf.id] ?? ""}
                  onChange={(e) => setCF(cf.id, e.target.value)}
                />
              )}
              {cf.field_type === "number" && (
                <Input
                  type="number"
                  value={customFieldValues[cf.id] ?? ""}
                  onChange={(e) => setCF(cf.id, e.target.value)}
                />
              )}
              {cf.field_type === "url" && (
                <Input
                  type="url"
                  value={customFieldValues[cf.id] ?? ""}
                  onChange={(e) => setCF(cf.id, e.target.value)}
                  placeholder="https://"
                />
              )}
              {cf.field_type === "checkbox" && (
                <div className="flex items-center gap-2 mt-1">
                  <Checkbox
                    checked={customFieldValues[cf.id] === "true"}
                    onCheckedChange={(checked) => setCF(cf.id, checked ? "true" : "false")}
                  />
                  <span className="text-sm text-gray-700">{cf.label}</span>
                </div>
              )}
              {cf.field_type === "select" && cf.options && (
                <Select
                  value={customFieldValues[cf.id] || "__none__"}
                  onValueChange={(v) => setCF(cf.id, v === "__none__" ? "" : v)}
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
    </div>
  );
}
