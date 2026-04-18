"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffFormData } from "../new-booking-client";
import type { CurrentUser } from "@/lib/types/database";

interface Props {
  staffData: StaffFormData;
  onChange: (data: StaffFormData) => void;
  users: { id: string; name: string }[];
  currentUser: CurrentUser;
}

export function StepStaff({ staffData, onChange, users, currentUser }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Staff in Charge</h2>
        <p className="text-sm text-gray-500">Pilih staff yang menangani booking ini</p>
      </div>

      <div>
        <Label>Staff</Label>
        <Select
          value={staffData.staff_id}
          onValueChange={(v) => onChange({ staff_id: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih staff" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}{u.id === currentUser.id ? " (Saya)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-gray-400">
        Default: akun Anda sendiri ({currentUser.name})
      </p>
    </div>
  );
}
