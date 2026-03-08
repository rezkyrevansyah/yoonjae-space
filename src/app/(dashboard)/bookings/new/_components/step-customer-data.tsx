"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerFormData } from "./new-booking-client";
import type { Lead } from "@/lib/types/database";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Props {
  customerData: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  leads: Lead[];
}

type PhoneStatus = "idle" | "checking" | "available" | "taken";

export function StepCustomerData({ customerData, onChange, leads }: Props) {
  const supabase = createClient();
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle");

  // If existing customer selected, show read-only info
  if (customerData.isExisting) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Customer</h2>
          <p className="text-sm text-gray-500">Customer yang dipilih</p>
        </div>
        <div className="rounded-lg bg-maroon-50 border border-maroon-100 p-4 space-y-1">
          <p className="font-semibold text-maroon-900">{customerData.existingCustomerName}</p>
          <p className="text-sm text-maroon-700">{customerData.existingCustomerPhone}</p>
          <p className="text-xs text-maroon-500">Data customer lama — tidak perlu diisi ulang</p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!customerData.phone || customerData.phone.length < 8) {
      setPhoneStatus("idle");
      return;
    }
    setPhoneStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", customerData.phone)
        .maybeSingle();
      setPhoneStatus(data ? "taken" : "available");
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerData.phone]);

  function set(key: keyof CustomerFormData, value: string) {
    onChange({ ...customerData, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Customer Baru</h2>
        <p className="text-sm text-gray-500">Isi informasi customer</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Nama <span className="text-red-500">*</span></Label>
          <Input
            value={customerData.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nama lengkap customer"
          />
        </div>

        <div>
          <Label>WhatsApp <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              value={customerData.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="08xxx"
              className={
                phoneStatus === "taken"
                  ? "border-red-400 pr-9"
                  : phoneStatus === "available"
                  ? "border-green-400 pr-9"
                  : "pr-9"
              }
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {phoneStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              {phoneStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {phoneStatus === "taken" && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {phoneStatus === "taken" && (
            <p className="text-xs text-red-500 mt-1">Nomor WhatsApp sudah terdaftar</p>
          )}
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={customerData.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="email@contoh.com"
          />
        </div>

        <div>
          <Label>Instagram</Label>
          <Input
            value={customerData.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="@username"
          />
        </div>

        <div>
          <Label>Alamat</Label>
          <Textarea
            value={customerData.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Alamat lengkap"
            rows={2}
          />
        </div>

        <div>
          <Label>Domisili</Label>
          <Input
            value={customerData.domicile}
            onChange={(e) => set("domicile", e.target.value)}
            placeholder="Kota domisili"
          />
        </div>

        <div>
          <Label>Leads / Referral</Label>
          <Select value={customerData.lead_id || "__none__"} onValueChange={(v) => set("lead_id", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih sumber leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
