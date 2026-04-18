"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerFormData } from "../new-booking-client";
import { UserPlus, UserCheck, Search, Loader2 } from "lucide-react";

interface CustomerResult {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Props {
  customerData: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
}

export function StepCustomerType({ customerData, onChange }: Props) {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .or(`name.ilike.%${searchQuery.trim()}%,phone.ilike.%${searchQuery.trim()}%`)
        .limit(10);
      setSearchResults(data ?? []);
    } finally {
      setSearching(false);
    }
  }

  function selectCustomer(c: CustomerResult) {
    onChange({
      ...customerData,
      isExisting: true,
      existingCustomerId: c.id,
      existingCustomerName: c.name,
      existingCustomerPhone: c.phone,
    });
    setSearchResults([]);
    setSearchQuery("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Tipe Booking</h2>
        <p className="text-sm text-gray-500">Pilih apakah ini customer baru atau lama</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onChange({ ...customerData, isExisting: false, existingCustomerId: undefined })}
          className={`rounded-lg border-2 p-4 text-left transition-colors ${
            !customerData.isExisting
              ? "border-maroon-700 bg-maroon-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <UserPlus className={`h-6 w-6 mb-2 ${!customerData.isExisting ? "text-maroon-700" : "text-gray-400"}`} />
          <p className={`font-medium ${!customerData.isExisting ? "text-maroon-700" : "text-gray-700"}`}>
            Booking Baru
          </p>
          <p className="text-xs text-gray-500 mt-1">Customer belum pernah booking</p>
        </button>

        <button
          onClick={() => onChange({ ...customerData, isExisting: true })}
          className={`rounded-lg border-2 p-4 text-left transition-colors ${
            customerData.isExisting
              ? "border-maroon-700 bg-maroon-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <UserCheck className={`h-6 w-6 mb-2 ${customerData.isExisting ? "text-maroon-700" : "text-gray-400"}`} />
          <p className={`font-medium ${customerData.isExisting ? "text-maroon-700" : "text-gray-700"}`}>
            Booking Lama
          </p>
          <p className="text-xs text-gray-500 mt-1">Customer sudah pernah booking</p>
        </button>
      </div>

      {customerData.isExisting && (
        <div className="space-y-3">
          <Label>Cari Customer</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nama atau nomor WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {customerData.existingCustomerId && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">{customerData.existingCustomerName}</p>
                <p className="text-sm text-green-600">{customerData.existingCustomerPhone}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-700"
                onClick={() => onChange({ ...customerData, existingCustomerId: undefined, existingCustomerName: undefined, existingCustomerPhone: undefined })}
              >
                Ganti
              </Button>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.phone} {c.email ? `· ${c.email}` : ""}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
