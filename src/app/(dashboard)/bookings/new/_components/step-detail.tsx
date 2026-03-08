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
import { cn, formatRupiah } from "@/lib/utils";
import type { DetailFormData } from "./new-booking-client";
import type { Package, Background, PhotoFor } from "@/lib/types/database";

interface Props {
  detailData: DetailFormData;
  onChange: (data: DetailFormData) => void;
  packages: Package[];
  backgrounds: Background[];
  photoFors: PhotoFor[];
}

export function StepDetail({ detailData, onChange, packages, backgrounds, photoFors }: Props) {
  function toggleBackground(id: string) {
    const current = detailData.background_ids;
    const next = current.includes(id)
      ? current.filter((b) => b !== id)
      : [...current, id];
    onChange({ ...detailData, background_ids: next });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Detail Booking</h2>
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
        <Label>Paket <span className="text-red-500">*</span></Label>
        <Select
          value={detailData.package_id || "__none__"}
          onValueChange={(v) => onChange({ ...detailData, package_id: v === "__none__" ? "" : v })}
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
    </div>
  );
}
