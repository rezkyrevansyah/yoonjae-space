"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { CurrentUser } from "@/lib/types/database";
import { invalidateReminderTemplates } from "@/lib/cache-invalidation";

interface TabRemindersProps {
  currentUser: CurrentUser;
}

const VARIABLES = [
  "{customer_name}",
  "{booking_date}",
  "{booking_time}",
  "{package_name}",
  "{studio_name}",
  "{customer_page}",
  "{notes}",
];

export function TabReminders({ currentUser }: TabRemindersProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reminderMsg, setReminderMsg] = useState("");
  const [thankYouMsg, setThankYouMsg] = useState("");
  const [thankYouPaymentMsg, setThankYouPaymentMsg] = useState("");
  const [customMsg, setCustomMsg] = useState("");

  const reminderRef = useRef<HTMLTextAreaElement>(null);
  const thankYouRef = useRef<HTMLTextAreaElement>(null);
  const thankYouPaymentRef = useRef<HTMLTextAreaElement>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);

  const [activeField, setActiveField] = useState<"reminder" | "thank_you" | "thank_you_payment" | "custom">("reminder");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from("settings_reminder_templates")
      .select("reminder_message, thank_you_message, thank_you_payment_message")
      .eq("lock", true)
      .maybeSingle();

    if (data) {
      setReminderMsg(data.reminder_message ?? "");
      setThankYouMsg(data.thank_you_message ?? "");
      setThankYouPaymentMsg(data.thank_you_payment_message ?? "");
      setCustomMsg((data as Record<string, string | null>).custom_message ?? "");
    }
    setLoading(false);
  }

  function insertVariable(variable: string) {
    const refMap = {
      reminder: { ref: reminderRef, setter: setReminderMsg, value: reminderMsg },
      thank_you: { ref: thankYouRef, setter: setThankYouMsg, value: thankYouMsg },
      thank_you_payment: { ref: thankYouPaymentRef, setter: setThankYouPaymentMsg, value: thankYouPaymentMsg },
      custom: { ref: customRef, setter: setCustomMsg, value: customMsg },
    };

    const { ref, setter, value } = refMap[activeField];
    const el = ref.current;
    if (!el) {
      setter(value + variable);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + variable + value.slice(end);
    setter(newVal);

    setTimeout(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("settings_reminder_templates").upsert(
        {
          lock: true,
          reminder_message: reminderMsg,
          thank_you_message: thankYouMsg,
          thank_you_payment_message: thankYouPaymentMsg,
          custom_message: customMsg,
        },
        { onConflict: "lock" }
      );
      if (error) throw error;

      await invalidateReminderTemplates();
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "update_reminder_templates",
        entity: "settings_reminder_templates",
        entity_id: null,
        description: "Updated reminder message templates",
      });

      toast({ title: "Berhasil", description: "Template pesan disimpan." });
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Variable chips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variabel yang Tersedia</CardTitle>
          <p className="text-sm text-muted-foreground">Klik variabel untuk menyisipkan ke field yang sedang aktif (ditandai border biru)</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map((v) => (
              <button
                key={v}
                onClick={() => insertVariable(v)}
                className="px-3 py-1 text-xs font-mono bg-maroon-50 text-maroon-700 border border-maroon-200 rounded-full hover:bg-maroon-100 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesan Pengingat</CardTitle>
          <p className="text-sm text-muted-foreground">Dikirim sebelum hari sesi foto</p>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={reminderRef}
            value={reminderMsg}
            onChange={(e) => setReminderMsg(e.target.value)}
            onFocus={() => setActiveField("reminder")}
            rows={6}
            placeholder="Halo {customer_name}, kami mengingatkan sesi foto Anda..."
            className={activeField === "reminder" ? "ring-2 ring-blue-400" : ""}
          />
        </CardContent>
      </Card>

      {/* Thank You Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesan Terima Kasih</CardTitle>
          <p className="text-sm text-muted-foreground">Dikirim setelah sesi foto selesai</p>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={thankYouRef}
            value={thankYouMsg}
            onChange={(e) => setThankYouMsg(e.target.value)}
            onFocus={() => setActiveField("thank_you")}
            rows={6}
            placeholder="Terima kasih {customer_name} sudah memilih {studio_name}..."
            className={activeField === "thank_you" ? "ring-2 ring-blue-400" : ""}
          />
        </CardContent>
      </Card>

      {/* Thank You Payment Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesan Terima Kasih (Pembayaran)</CardTitle>
          <p className="text-sm text-muted-foreground">Dikirim setelah konfirmasi pembayaran</p>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={thankYouPaymentRef}
            value={thankYouPaymentMsg}
            onChange={(e) => setThankYouPaymentMsg(e.target.value)}
            onFocus={() => setActiveField("thank_you_payment")}
            rows={6}
            placeholder="Terima kasih atas pembayaran Anda, {customer_name}..."
            className={activeField === "thank_you_payment" ? "ring-2 ring-blue-400" : ""}
          />
        </CardContent>
      </Card>

      {/* Custom Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesan Kustom</CardTitle>
          <p className="text-sm text-muted-foreground">Pesan bebas untuk keperluan lainnya</p>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={customRef}
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            onFocus={() => setActiveField("custom")}
            rows={6}
            placeholder="Pesan kustom untuk {customer_name}..."
            className={activeField === "custom" ? "ring-2 ring-blue-400" : ""}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-maroon-700 hover:bg-maroon-600">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Simpan Template
      </Button>
    </div>
  );
}
