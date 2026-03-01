"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldValues } from "./new-booking-client";
import type { CustomField } from "@/lib/types/database";

interface Props {
  customFields: CustomField[];
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
}

export function StepCustomFields({ customFields, values, onChange }: Props) {
  function set(id: string, value: string) {
    onChange({ ...values, [id]: value });
  }

  if (customFields.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Informasi Tambahan</h2>
        <p className="text-sm text-gray-500 py-4 text-center">
          Tidak ada custom fields aktif
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Informasi Tambahan</h2>
        <p className="text-sm text-gray-500">Isi informasi opsional di bawah ini</p>
      </div>

      <div className="space-y-4">
        {customFields.map((cf) => (
          <div key={cf.id}>
            <Label className="mb-1 block">{cf.label}</Label>
            {cf.field_type === "text" && (
              <Input
                value={values[cf.id] ?? ""}
                onChange={(e) => set(cf.id, e.target.value)}
              />
            )}
            {cf.field_type === "number" && (
              <Input
                type="number"
                value={values[cf.id] ?? ""}
                onChange={(e) => set(cf.id, e.target.value)}
              />
            )}
            {cf.field_type === "url" && (
              <Input
                type="url"
                value={values[cf.id] ?? ""}
                onChange={(e) => set(cf.id, e.target.value)}
                placeholder="https://"
              />
            )}
            {cf.field_type === "checkbox" && (
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  checked={values[cf.id] === "true"}
                  onCheckedChange={(checked) => set(cf.id, checked ? "true" : "false")}
                />
                <span className="text-sm text-gray-700">{cf.label}</span>
              </div>
            )}
            {cf.field_type === "select" && cf.options && (
              <Select value={values[cf.id] ?? ""} onValueChange={(v) => set(cf.id, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih opsi..." />
                </SelectTrigger>
                <SelectContent>
                  {cf.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
