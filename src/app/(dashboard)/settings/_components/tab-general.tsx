"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Plus, CalendarDays } from "lucide-react";
import type { CurrentUser, StudioHoliday } from "@/lib/types/database";
import { invalidateSettingsGeneral, invalidateHolidays } from "@/lib/cache-invalidation";

interface TabGeneralProps {
  currentUser: CurrentUser;
}

export function TabGeneral({ currentUser }: TabGeneralProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General form
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [interval, setInterval] = useState("60");
  const [defaultStatus, setDefaultStatus] = useState<"paid" | "unpaid">("paid");
  const [cutoffDay, setCutoffDay] = useState("26");

  // Holidays
  const [holidays, setHolidays] = useState<StudioHoliday[]>([]);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [holidayLabel, setHolidayLabel] = useState("");
  const [holidayStart, setHolidayStart] = useState("");
  const [holidayEnd, setHolidayEnd] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [generalRes, holidaysRes] = await Promise.all([
      supabase.from("settings_general").select("open_time, close_time, time_slot_interval, default_payment_status, commission_cutoff_day").eq("lock", true).maybeSingle(),
      supabase.from("studio_holidays").select("id, start_date, end_date, label, created_at").order("start_date"),
    ]);

    if (generalRes.data) {
      setOpenTime(generalRes.data.open_time);
      setCloseTime(generalRes.data.close_time);
      setInterval(String(generalRes.data.time_slot_interval));
      setDefaultStatus(generalRes.data.default_payment_status as "paid" | "unpaid");
      if (generalRes.data.commission_cutoff_day) setCutoffDay(String(generalRes.data.commission_cutoff_day));
    }
    if (holidaysRes.data) setHolidays(holidaysRes.data);
    setLoading(false);
  }

  async function handleSaveGeneral() {
    setSaving(true);
    try {
      const payload = {
        lock: true,
        open_time: openTime,
        close_time: closeTime,
        time_slot_interval: Number(interval) || 60,
        default_payment_status: defaultStatus,
        commission_cutoff_day: Math.min(28, Math.max(1, Number(cutoffDay) || 26)),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("settings_general").upsert(payload, { onConflict: "lock" });
      if (error) throw error;

      await invalidateSettingsGeneral();
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "update_settings_general",
        entity: "settings_general",
        entity_id: null,
        description: "Updated general settings",
      });

      toast({ title: "Berhasil", description: "Pengaturan umum disimpan." });
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddHoliday() {
    if (!holidayLabel || !holidayStart) return;
    const end = holidayEnd || holidayStart;

    const newHoliday = {
      start_date: holidayStart,
      end_date: end,
      label: holidayLabel,
    };

    const { data, error } = await supabase.from("studio_holidays").insert(newHoliday).select().single();
    if (error) {
      toast({ title: "Gagal", description: "Tidak bisa menambah libur.", variant: "destructive" });
      return;
    }

    setHolidays((prev) => [...prev, data].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    setHolidayLabel("");
    setHolidayStart("");
    setHolidayEnd("");
    setAddingHoliday(false);

    await invalidateHolidays();
    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "create_holiday",
      entity: "studio_holidays",
      entity_id: data.id,
      description: `Added holiday: ${holidayLabel}`,
    });

    toast({ title: "Berhasil", description: `Libur "${holidayLabel}" ditambahkan.` });
  }

  async function handleDeleteHoliday(id: string, label: string) {
    setDeletingId(id);
    // Optimistic
    setHolidays((prev) => prev.filter((h) => h.id !== id));

    const { error } = await supabase.from("studio_holidays").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal", description: "Tidak bisa menghapus.", variant: "destructive" });
      fetchData();
    } else {
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "delete_holiday",
        entity: "studio_holidays",
        entity_id: id,
        description: `Deleted holiday: ${label}`,
      });
      await invalidateHolidays();
      toast({ title: "Berhasil", description: `Libur "${label}" dihapus.` });
    }
    setDeletingId(null);
  }

  function formatDateRange(start: string, end: string) {
    const s = new Date(start).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    if (start === end) return s;
    const e = new Date(end).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return `${s} — ${e}`;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jam Operasional & Pengaturan Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jam Buka</Label>
              <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Jam Tutup</Label>
              <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interval Time Slot (menit)</Label>
            <Input
              type="number"
              min={15}
              max={240}
              step={15}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="max-w-[160px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Tanggal Cutoff Komisi</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={cutoffDay}
                onChange={(e) => setCutoffDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="26"
                className="max-w-[100px]"
              />
              <span className="text-sm text-muted-foreground">
                Periode: tgl {Number(cutoffDay) || "?"} bulan lalu – tgl {(Number(cutoffDay) - 1) || "?"} bulan ini
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status Pembayaran Default</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="defaultStatus"
                  value="paid"
                  checked={defaultStatus === "paid"}
                  onChange={() => setDefaultStatus("paid")}
                  className="accent-[#8B1A1A]"
                />
                <span className="text-sm">Paid — Booking langsung PAID</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="defaultStatus"
                  value="unpaid"
                  checked={defaultStatus === "unpaid"}
                  onChange={() => setDefaultStatus("unpaid")}
                  className="accent-[#8B1A1A]"
                />
                <span className="text-sm">Unpaid — Booking mulai BOOKED</span>
              </label>
            </div>
          </div>

          <Button onClick={handleSaveGeneral} disabled={saving} className="bg-maroon-700 hover:bg-maroon-600">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>

      {/* Studio Holidays */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Tanggal Libur Studio
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingHoliday(!addingHoliday)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Libur
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {addingHoliday && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="space-y-2">
                <Label>Keterangan / Label</Label>
                <Input
                  placeholder="contoh: Lebaran, Natal, dll."
                  value={holidayLabel}
                  onChange={(e) => setHolidayLabel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input type="date" value={holidayStart} onChange={(e) => setHolidayStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Input type="date" value={holidayEnd} min={holidayStart} onChange={(e) => setHolidayEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddHoliday} disabled={!holidayLabel || !holidayStart} className="bg-maroon-700 hover:bg-maroon-600">
                  Tambah
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingHoliday(false); setHolidayLabel(""); setHolidayStart(""); setHolidayEnd(""); }}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada tanggal libur terdaftar.</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDateRange(h.start_date, h.end_date)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteHoliday(h.id, h.label)}
                    disabled={deletingId === h.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
