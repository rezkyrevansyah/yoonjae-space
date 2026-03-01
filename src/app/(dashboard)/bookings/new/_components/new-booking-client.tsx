"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
// formatRupiah used in child components

import type {
  CurrentUser,
  Package,
  Background,
  Addon,
  Lead,
  PhotoFor,
  CustomField,
  SettingsGeneral,
  StudioHoliday,
} from "@/lib/types/database";
import { StepCustomerType } from "./step-customer-type";
import { StepCustomerData } from "./step-customer-data";
import { StepSession } from "./step-session";
import { StepDetail } from "./step-detail";
import { StepTimeEstimate } from "./step-time-estimate";
import { StepAddons } from "./step-addons";
import { StepDiscount } from "./step-discount";
import { StepStaff } from "./step-staff";
import { StepSummary } from "./step-summary";
import { StepCustomFields } from "./step-custom-fields";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerFormData {
  isExisting: boolean;
  existingCustomerId?: string;
  existingCustomerName?: string;
  existingCustomerPhone?: string;
  name: string;
  phone: string;
  email: string;
  instagram: string;
  address: string;
  domicile: string;
  lead_id: string;
}

export interface SessionFormData {
  booking_date: string;
  start_time: string;
}

export interface DetailFormData {
  person_count: number;
  package_id: string;
  background_ids: string[];
  photo_for_id: string;
  notes: string;
  behind_the_scenes: boolean;
}

export interface AddonFormData {
  addon_ids: string[];
}

export interface DiscountFormData {
  discount_type: "none" | "voucher" | "manual";
  voucher_code: string;
  voucher_id: string;
  voucher_discount_type: "percentage" | "fixed";
  voucher_discount_value: number;
  manual_discount: number;
}

export interface StaffFormData {
  staff_id: string;
}

export interface CustomFieldValues {
  [custom_field_id: string]: string;
}

const STEPS = [
  { id: 1, label: "Tipe Booking" },
  { id: 2, label: "Data Customer" },
  { id: 3, label: "Sesi" },
  { id: 4, label: "Detail" },
  { id: 5, label: "Estimasi Waktu" },
  { id: 6, label: "Add-ons" },
  { id: 7, label: "Diskon" },
  { id: 8, label: "Staff" },
  { id: 9, label: "Info Tambahan" },
  { id: 10, label: "Ringkasan" },
];

interface Props {
  currentUser: CurrentUser;
  packages: Package[];
  backgrounds: Background[];
  addons: Addon[];
  leads: Lead[];
  photoFors: PhotoFor[];
  customFields: CustomField[];
  settingsGeneral: SettingsGeneral | null;
  holidays: StudioHoliday[];
  users: { id: string; name: string }[];
}

export function NewBookingClient({
  currentUser,
  packages,
  backgrounds,
  addons,
  leads,
  photoFors,
  customFields,
  settingsGeneral,
  holidays,
  users,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [customerData, setCustomerData] = useState<CustomerFormData>({
    isExisting: false,
    name: "",
    phone: "",
    email: "",
    instagram: "",
    address: "",
    domicile: "",
    lead_id: "",
  });

  const [sessionData, setSessionData] = useState<SessionFormData>({
    booking_date: "",
    start_time: "",
  });

  const [detailData, setDetailData] = useState<DetailFormData>({
    person_count: 1,
    package_id: "",
    background_ids: [],
    photo_for_id: "",
    notes: "",
    behind_the_scenes: false,
  });

  const [addonData, setAddonData] = useState<AddonFormData>({ addon_ids: [] });

  const [discountData, setDiscountData] = useState<DiscountFormData>({
    discount_type: "none",
    voucher_code: "",
    voucher_id: "",
    voucher_discount_type: "fixed",
    voucher_discount_value: 0,
    manual_discount: 0,
  });

  const [staffData, setStaffData] = useState<StaffFormData>({
    staff_id: currentUser.id,
  });

  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({});

  // --- Computed values ---
  const selectedPackage = packages.find((p) => p.id === detailData.package_id);
  const selectedAddons = addons.filter((a) => addonData.addon_ids.includes(a.id));

  function computeEndTime(): string {
    if (!sessionData.start_time || !selectedPackage) return "";
    const [h, m] = sessionData.start_time.split(":").map(Number);
    let totalMinutes = h * 60 + m + selectedPackage.duration_minutes;
    if (selectedPackage.need_extra_time) totalMinutes += selectedPackage.extra_time_minutes;
    selectedAddons.forEach((a) => {
      if (a.need_extra_time) totalMinutes += a.extra_time_minutes;
    });
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  function computeTotalDuration(): number {
    if (!selectedPackage) return 0;
    let total = selectedPackage.duration_minutes;
    if (selectedPackage.need_extra_time) total += selectedPackage.extra_time_minutes;
    selectedAddons.forEach((a) => { if (a.need_extra_time) total += a.extra_time_minutes; });
    return total;
  }

  function computePricing() {
    const packagePrice = selectedPackage?.price ?? 0;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const subtotal = packagePrice + addonsTotal;
    let discount = 0;
    if (discountData.discount_type === "voucher") {
      if (discountData.voucher_discount_type === "percentage") {
        discount = Math.floor((subtotal * discountData.voucher_discount_value) / 100);
      } else {
        discount = discountData.voucher_discount_value;
      }
    } else if (discountData.discount_type === "manual") {
      discount = discountData.manual_discount;
    }
    const total = Math.max(0, subtotal - discount);
    return { packagePrice, addonsTotal, subtotal, discount, total };
  }

  const pricing = computePricing();
  const endTime = computeEndTime();
  const totalDuration = computeTotalDuration();

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // 1. Insert customer if new
      let customerId = customerData.existingCustomerId ?? "";
      if (!customerData.isExisting) {
        const { data: newCustomer, error: custErr } = await supabase
          .from("customers")
          .insert({
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email || null,
            instagram: customerData.instagram || null,
            address: customerData.address || null,
            domicile: customerData.domicile || null,
            lead_id: customerData.lead_id || null,
          })
          .select("id")
          .single();
        if (custErr) throw new Error("Gagal insert customer: " + custErr.message);
        customerId = newCustomer.id;
      }

      // 2. Generate booking number
      const { data: bookingNumberData, error: bnErr } = await supabase
        .rpc("generate_booking_number");
      if (bnErr) throw new Error("Gagal generate booking number: " + bnErr.message);
      const bookingNumber = bookingNumberData as string;

      // 3. Determine initial status
      const initialStatus = settingsGeneral?.default_payment_status === "paid" ? "PAID" : "BOOKED";

      // 4. Insert booking
      const { data: booking, error: bookErr } = await supabase
        .from("bookings")
        .insert({
          booking_number: bookingNumber,
          customer_id: customerId,
          booking_date: sessionData.booking_date,
          start_time: sessionData.start_time,
          end_time: endTime,
          package_id: detailData.package_id,
          photo_for_id: detailData.photo_for_id || null,
          person_count: detailData.person_count,
          notes: detailData.notes || "",
          behind_the_scenes: detailData.behind_the_scenes,
          status: initialStatus,
          voucher_id: discountData.discount_type === "voucher" ? discountData.voucher_id : null,
          manual_discount: discountData.discount_type === "manual" ? discountData.manual_discount : 0,
          subtotal: pricing.subtotal,
          total: pricing.total,
          staff_id: staffData.staff_id || null,
          created_by: currentUser.id,
        })
        .select("id")
        .single();
      if (bookErr) throw new Error("Gagal insert booking: " + bookErr.message);
      const bookingId = booking.id;

      // 5. Insert booking_backgrounds
      if (detailData.background_ids.length > 0) {
        const { error: bgErr } = await supabase.from("booking_backgrounds").insert(
          detailData.background_ids.map((bgId) => ({
            booking_id: bookingId,
            background_id: bgId,
          }))
        );
        if (bgErr) throw new Error("Gagal insert backgrounds");
      }

      // 6. Insert booking_addons
      if (addonData.addon_ids.length > 0) {
        const addonRows = addonData.addon_ids.map((aid) => {
          const addon = addons.find((a) => a.id === aid)!;
          return {
            booking_id: bookingId,
            addon_id: aid,
            price: addon.price,
            is_paid: true,
            is_extra: false,
          };
        });
        const { error: addonErr } = await supabase.from("booking_addons").insert(addonRows);
        if (addonErr) throw new Error("Gagal insert addons");
      }

      // 7. Insert booking_custom_fields
      const cfEntries = Object.entries(customFieldValues).filter(([, v]) => v !== "");
      if (cfEntries.length > 0) {
        const { error: cfErr } = await supabase.from("booking_custom_fields").insert(
          cfEntries.map(([cfId, val]) => ({
            booking_id: bookingId,
            custom_field_id: cfId,
            value: val,
          }))
        );
        if (cfErr) throw new Error("Gagal insert custom fields");
      }

      // 8. Generate invoice
      const { data: invNumber, error: invNumErr } = await supabase.rpc("generate_invoice_number");
      if (invNumErr) throw new Error("Gagal generate invoice number");
      const { error: invErr } = await supabase.from("invoices").insert({
        invoice_number: invNumber as string,
        booking_id: bookingId,
        invoice_date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })(),
      });
      if (invErr) throw new Error("Gagal insert invoice");

      // 9. Activity log
      const displayName = customerData.isExisting
        ? customerData.existingCustomerName
        : customerData.name;
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "CREATE",
        entity: "bookings",
        entity_id: bookingId,
        description: `Membuat booking ${bookingNumber} untuk ${displayName}`,
      });

      toast({ title: "Booking berhasil dibuat!", description: bookingNumber });
      router.push(`/bookings/${bookingId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return true;
      case 2:
        if (customerData.isExisting) return !!customerData.existingCustomerId;
        return !!(customerData.name && customerData.phone);
      case 3:
        return !!(sessionData.booking_date && sessionData.start_time);
      case 4:
        return !!(detailData.package_id && detailData.person_count > 0);
      case 5:
        return true;
      case 6:
        return true;
      case 7:
        return true;
      case 8:
        return true;
      case 9:
        return true;
      case 10:
        return true;
      default:
        return false;
    }
  }

  const isLast = step === STEPS.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/bookings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Buat Booking Baru</h1>
          <p className="text-sm text-gray-500">Langkah {step} dari {STEPS.length}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => step > s.id && setStep(s.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              s.id === step
                ? "bg-maroon-700 text-white"
                : s.id < step
                ? "bg-maroon-50 text-maroon-700 cursor-pointer hover:bg-maroon-100"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {s.id < step ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <span className="h-3 w-3 flex items-center justify-center rounded-full border text-[10px]">
                {s.id}
              </span>
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {step === 1 && (
          <StepCustomerType customerData={customerData} onChange={setCustomerData} />
        )}
        {step === 2 && (
          <StepCustomerData
            customerData={customerData}
            onChange={setCustomerData}
            leads={leads}
          />
        )}
        {step === 3 && (
          <StepSession
            sessionData={sessionData}
            onChange={setSessionData}
            settingsGeneral={settingsGeneral}
            holidays={holidays}
          />
        )}
        {step === 4 && (
          <StepDetail
            detailData={detailData}
            onChange={setDetailData}
            packages={packages}
            backgrounds={backgrounds}
            photoFors={photoFors}
          />
        )}
        {step === 5 && (
          <StepTimeEstimate
            sessionData={sessionData}
            selectedPackage={selectedPackage}
            selectedAddons={selectedAddons}
            endTime={endTime}
            totalDuration={totalDuration}
          />
        )}
        {step === 6 && (
          <StepAddons
            addonData={addonData}
            onChange={setAddonData}
            addons={addons}
          />
        )}
        {step === 7 && (
          <StepDiscount
            discountData={discountData}
            onChange={setDiscountData}
            subtotal={pricing.subtotal}
          />
        )}
        {step === 8 && (
          <StepStaff
            staffData={staffData}
            onChange={setStaffData}
            users={users}
            currentUser={currentUser}
          />
        )}
        {step === 9 && (
          <StepCustomFields
            customFields={customFields}
            values={customFieldValues}
            onChange={setCustomFieldValues}
          />
        )}
        {step === 10 && (
          <StepSummary
            customerData={customerData}
            sessionData={sessionData}
            detailData={detailData}
            addonData={addonData}
            discountData={discountData}
            staffData={staffData}
            selectedPackage={selectedPackage}
            selectedAddons={selectedAddons}
            backgrounds={backgrounds}
            photoFors={photoFors}
            users={users}
            pricing={pricing}
            endTime={endTime}
            totalDuration={totalDuration}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sebelumnya
          </Button>
        )}
        {!isLast ? (
          <Button
            className="flex-1 bg-maroon-700 hover:bg-maroon-600 text-white"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Selanjutnya
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            className="flex-1 bg-maroon-700 hover:bg-maroon-600 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Membuat Booking...</>
            ) : (
              <>Buat Booking<CheckCircle2 className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
