"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";

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
import type { ExistingBooking } from "./step-session";
import { StepCustomerType } from "./step-customer-type";
import { StepCustomerData } from "./step-customer-data";
import { StepPackagesAddons, type PackagesAddonsFormData } from "./step-packages-addons";
import { StepSession } from "./step-session";
import { StepDetail } from "./step-detail";
import { StepTimeEstimate } from "./step-time-estimate";
import { StepDiscount } from "./step-discount";
import { StepPayment, type PaymentFormData } from "./step-payment";
import { StepStaff } from "./step-staff";
import { StepSummary } from "./step-summary";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

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
  background_ids: string[];
  photo_for_id: string;
  notes: string;
  behind_the_scenes: boolean;
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
  { id: 3, label: "Paket & Add-on" },
  { id: 4, label: "Sesi & Waktu" },
  { id: 5, label: "Estimasi Waktu" },
  { id: 6, label: "Detail" },
  { id: 7, label: "Diskon" },
  { id: 8, label: "Pembayaran" },
  { id: 9, label: "Staff" },
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
  domicileOptions: string[];
  packageCategories: { id: string; name: string; sort_order: number }[];
}

function friendlyError(msg: string): string {
  if (msg.includes("customers_phone_key") || (msg.includes("unique constraint") && msg.includes("phone")))
    return "Nomor WhatsApp ini sudah terdaftar di sistem. Gunakan fitur 'Customer Lama' untuk memilih customer yang sudah ada.";
  if (msg.includes("not-null constraint") || msg.includes("null value in column"))
    return "Ada data yang wajib diisi tapi masih kosong. Periksa kembali formulir dan coba lagi.";
  if (msg.includes("foreign key constraint"))
    return "Data referensi tidak ditemukan. Pastikan paket, background, dan pilihan lainnya masih aktif.";
  if (msg.includes("generate_booking_number"))
    return "Gagal membuat nomor booking. Coba lagi dalam beberapa saat.";
  return msg;
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
  domicileOptions,
  packageCategories,
}: Props) {
  const router = useRouter();
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

  const [packagesAddonsData, setPackagesAddonsData] = useState<PackagesAddonsFormData>({
    packages: [],
    addons: [],
  });

  const [sessionData, setSessionData] = useState<SessionFormData>({
    booking_date: "",
    start_time: "",
  });

  const [detailData, setDetailData] = useState<DetailFormData>({
    person_count: 1,
    background_ids: [],
    photo_for_id: "",
    notes: "",
    behind_the_scenes: false,
  });

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

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    transaction_date: "",
    payment_method: "",
    payment_account_name: "",
  });

  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({});
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("new_booking_draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.step > 1 || draft.customerData?.name || draft.customerData?.phone) {
        setHasDraft(true);
      }
    } catch {
      localStorage.removeItem("new_booking_draft");
    }
  }, []);

  useEffect(() => {
    const hasProgress = step > 1 || !!customerData.name || !!customerData.phone;
    if (!hasProgress) return;
    const draft = {
      step,
      customerData,
      packagesAddonsData,
      sessionData,
      detailData,
      discountData,
      staffData,
      paymentData,
      customFieldValues,
      dpAmount,
    };
    localStorage.setItem("new_booking_draft", JSON.stringify(draft));
  }, [step, customerData, packagesAddonsData, sessionData, detailData, discountData, staffData, paymentData, customFieldValues, dpAmount]);

  function restoreDraft() {
    const saved = localStorage.getItem("new_booking_draft");
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.step)               setStep(d.step);
      if (d.customerData)       setCustomerData(d.customerData);
      if (d.packagesAddonsData) setPackagesAddonsData(d.packagesAddonsData);
      if (d.sessionData)        setSessionData(d.sessionData);
      if (d.detailData)         setDetailData(d.detailData);
      if (d.discountData)       setDiscountData(d.discountData);
      if (d.staffData)          setStaffData(d.staffData);
      if (d.paymentData)        setPaymentData(d.paymentData);
      if (d.customFieldValues)  setCustomFieldValues(d.customFieldValues);
      if (d.dpAmount !== undefined) setDpAmount(d.dpAmount);
    } catch {
      localStorage.removeItem("new_booking_draft");
    }
    setHasDraft(false);
  }

  function clearDraft() {
    localStorage.removeItem("new_booking_draft");
    setHasDraft(false);
  }

  // --- Computed values ---
  const selectedPackages = packagesAddonsData.packages
    .map((item) => ({
      package: packages.find((p) => p.id === item.package_id)!,
      quantity: item.quantity,
    }))
    .filter((item) => item.package != null);

  const selectedAddons = packagesAddonsData.addons
    .map((item) => ({
      addon: addons.find((a) => a.id === item.addon_id)!,
      quantity: item.quantity,
    }))
    .filter((item) => item.addon != null);

  function computeActualStartTime(): string {
    if (!sessionData.start_time) return "";
    const [h, m] = sessionData.start_time.split(":").map(Number);
    let startMinutes = h * 60 + m;
    selectedPackages.forEach(({ package: pkg, quantity }) => {
      if (pkg.need_extra_time && pkg.extra_time_position === "before")
        startMinutes -= pkg.extra_time_minutes * quantity;
    });
    selectedAddons.forEach(({ addon, quantity }) => {
      if (addon.need_extra_time && addon.extra_time_position === "before")
        startMinutes -= addon.extra_time_minutes * quantity;
    });
    const sh = Math.floor(startMinutes / 60);
    const sm = startMinutes % 60;
    return `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
  }

  function computeEndTime(): string {
    if (!sessionData.start_time || selectedPackages.length === 0) return "";
    const [h, m] = sessionData.start_time.split(":").map(Number);
    let endMinutes = h * 60 + m;
    selectedPackages.forEach(({ package: pkg, quantity }) => {
      endMinutes += pkg.duration_minutes * quantity;
      if (pkg.need_extra_time && pkg.extra_time_position === "after") endMinutes += pkg.extra_time_minutes * quantity;
    });
    selectedAddons.forEach(({ addon, quantity }) => {
      if (!addon.need_extra_time) return;
      if (addon.extra_time_position === "after") endMinutes += addon.extra_time_minutes * quantity;
    });
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  function computeTotalDuration(): number {
    let total = selectedPackages.reduce((sum, { package: pkg, quantity }) => {
      let d = pkg.duration_minutes * quantity;
      if (pkg.need_extra_time) d += pkg.extra_time_minutes * quantity; // count both before+after in total block
      return sum + d;
    }, 0);
    selectedAddons.forEach(({ addon, quantity }) => {
      if (addon.need_extra_time) total += addon.extra_time_minutes * quantity;
    });
    return total;
  }

  function computePricing() {
    const packagesTotal = selectedPackages.reduce(
      (sum, { package: pkg, quantity }) => sum + pkg.price * quantity,
      0
    );
    const addonsTotal = selectedAddons.reduce(
      (sum, { addon, quantity }) => sum + addon.price * quantity,
      0
    );
    const subtotal = packagesTotal + addonsTotal;
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
    return { packagesTotal, addonsTotal, subtotal, discount, total };
  }

  const pricing = computePricing();
  const actualStartTime = computeActualStartTime();
  const endTime = computeEndTime();
  const totalDuration = computeTotalDuration();

  function computeConflictingBookings() {
    if (!actualStartTime || !endTime || !existingBookings.length) return [];
    const [ah, am] = actualStartTime.split(":").map(Number);
    const newEffStart = ah * 60 + am;
    const [eh, em] = endTime.split(":").map(Number);
    const newEnd = eh * 60 + em;
    return existingBookings
      .filter((b) => {
        const [sh, sm] = b.start_time.split(":").map(Number);
        let bEffStart = sh * 60 + sm;
        b.booking_addons.forEach((ba) => {
          if (ba.addons?.need_extra_time && ba.addons.extra_time_position === "before")
            bEffStart -= ba.addons.extra_time_minutes;
        });
        const [exh, exm] = b.end_time.split(":").map(Number);
        const bEnd = exh * 60 + exm;
        return newEffStart < bEnd && newEnd > bEffStart;
      })
      .map((b) => ({
        customerName: b.customers?.name ?? "Customer lain",
        startTime: b.start_time,
        endTime: b.end_time,
      }));
  }

  const conflictingBookings = computeConflictingBookings();

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
            email: customerData.email || "",
            instagram: customerData.instagram || "",
            address: customerData.address || "",
            domicile: customerData.domicile || "",
            lead_id: customerData.lead_id || null,
          })
          .select("id")
          .single();
        if (custErr) throw new Error(custErr.message);
        customerId = newCustomer.id;
      }

      // 2. Generate booking number
      const { data: bookingNumberData, error: bnErr } = await supabase
        .rpc("generate_booking_number");
      if (bnErr) throw new Error("generate_booking_number: " + bnErr.message);
      const bookingNumber = bookingNumberData as string;

      // 3. Determine initial status
      let initialStatus: string;
      if (pricing.total === 0) {
        // Voucher 100% or full discount — automatically PAID
        initialStatus = "PAID";
      } else if (dpAmount > 0) {
        initialStatus = "DP_PAID";
      } else {
        initialStatus = settingsGeneral?.default_payment_status === "paid" ? "PAID" : "BOOKED";
      }

      // First selected package id for backward compat
      const firstPackageId = selectedPackages[0]?.package.id ?? null;
      const hasIncludePrint = selectedPackages.some(({ package: pkg }) => pkg.include_print);

      // 4. Insert booking
      const { data: booking, error: bookErr } = await supabase
        .from("bookings")
        .insert({
          booking_number: bookingNumber,
          customer_id: customerId,
          booking_date: sessionData.booking_date,
          start_time: actualStartTime || sessionData.start_time,
          end_time: endTime,
          package_id: firstPackageId,
          photo_for_id: detailData.photo_for_id || null,
          person_count: detailData.person_count,
          notes: detailData.notes || "",
          behind_the_scenes: detailData.behind_the_scenes,
          status: initialStatus,
          print_order_status: hasIncludePrint ? "SELECTION" : null,
          voucher_id: discountData.discount_type === "voucher" ? discountData.voucher_id : null,
          manual_discount: discountData.discount_type === "manual" ? discountData.manual_discount : 0,
          subtotal: pricing.subtotal,
          total: pricing.total,
          dp_amount: dpAmount > 0 ? dpAmount : null,
          dp_paid_at: dpAmount > 0 ? new Date().toISOString() : null,
          transaction_date: paymentData.transaction_date || null,
          payment_method: paymentData.payment_method || null,
          payment_account_name: paymentData.payment_account_name || null,
          staff_id: staffData.staff_id || null,
          created_by: currentUser.id,
        })
        .select("id")
        .single();
      if (bookErr) throw new Error(bookErr.message);
      const bookingId = booking.id;

      // 5. Insert booking_packages
      if (selectedPackages.length > 0) {
        const { error: pkgErr } = await supabase.from("booking_packages").insert(
          selectedPackages.map(({ package: pkg, quantity }) => ({
            booking_id: bookingId,
            package_id: pkg.id,
            quantity,
            price_snapshot: pkg.price,
          }))
        );
        if (pkgErr) throw new Error("Gagal insert booking_packages: " + pkgErr.message);
      }

      // 6. Insert booking_backgrounds
      if (detailData.background_ids.length > 0) {
        const { error: bgErr } = await supabase.from("booking_backgrounds").insert(
          detailData.background_ids.map((bgId) => ({
            booking_id: bookingId,
            background_id: bgId,
          }))
        );
        if (bgErr) throw new Error("Gagal insert backgrounds");
      }

      // 7. Insert booking_addons
      if (selectedAddons.length > 0) {
        const { error: addonErr } = await supabase.from("booking_addons").insert(
          selectedAddons.map(({ addon, quantity }) => ({
            booking_id: bookingId,
            addon_id: addon.id,
            price: addon.price,
            quantity,
            is_paid: true,
            is_extra: false,
          }))
        );
        if (addonErr) throw new Error("Gagal insert addons");
      }

      // 8. Insert booking_custom_fields
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

      // 9. Generate invoice
      const { data: invNumber, error: invNumErr } = await supabase.rpc("generate_invoice_number");
      if (invNumErr) throw new Error("Gagal generate invoice number");
      const { error: invErr } = await supabase.from("invoices").insert({
        invoice_number: invNumber as string,
        booking_id: bookingId,
        invoice_date: (() => {
          const n = new Date();
          return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
        })(),
      });
      if (invErr) throw new Error("Gagal insert invoice");

      // 10. Activity log
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
      localStorage.removeItem("new_booking_draft");
      router.push(`/bookings/${bookingId}`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast({ title: "Error", description: friendlyError(raw), variant: "destructive" });
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
        return packagesAddonsData.packages.length > 0;
      case 4:
        return !!(sessionData.booking_date && sessionData.start_time);
      case 5:
        return true; // Estimasi Waktu — informational
      case 6:
        return detailData.person_count > 0;
      case 7:
      case 8:
      case 9:
      case 10:
        return true;
      default:
        return false;
    }
  }

  const isLast = step === 10;

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

      {/* Draft restore banner */}
      {hasDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm">
          <span className="flex-1 text-amber-800 text-sm">
            📋 Ada draft booking yang belum selesai. Ingin dilanjutkan?
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={restoreDraft}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 h-8"
            >
              Lanjutkan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearDraft}
              className="text-amber-600 hover:bg-amber-100 h-8"
            >
              Mulai Baru
            </Button>
          </div>
        </div>
      )}

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
            domicileOptions={domicileOptions}
          />
        )}
        {step === 3 && (
          <StepPackagesAddons
            data={packagesAddonsData}
            onChange={setPackagesAddonsData}
            packages={packages}
            addons={addons}
            packageCategories={packageCategories}
          />
        )}
        {step === 4 && (
          <StepSession
            sessionData={sessionData}
            onChange={setSessionData}
            settingsGeneral={settingsGeneral}
            holidays={holidays}
            onExistingBookingsLoaded={setExistingBookings}
            allowPastDates={customerData.isExisting}
            selectedPackages={selectedPackages}
            selectedAddons={selectedAddons}
          />
        )}
        {step === 5 && (
          <StepTimeEstimate
            sessionData={sessionData}
            selectedPackages={selectedPackages}
            selectedAddons={selectedAddons}
            actualStartTime={actualStartTime}
            endTime={endTime}
            totalDuration={totalDuration}
            conflictingBookings={conflictingBookings}
          />
        )}
        {step === 6 && (
          <StepDetail
            detailData={detailData}
            onChange={setDetailData}
            backgrounds={backgrounds}
            photoFors={photoFors}
            customFields={customFields}
            customFieldValues={customFieldValues}
            onCustomFieldChange={setCustomFieldValues}
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
          <StepPayment
            data={paymentData}
            onChange={setPaymentData}
          />
        )}
        {step === 9 && (
          <StepStaff
            staffData={staffData}
            onChange={setStaffData}
            users={users}
            currentUser={currentUser}
          />
        )}
        {step === 10 && (
          <StepSummary
            customerData={customerData}
            sessionData={sessionData}
            detailData={detailData}
            discountData={discountData}
            staffData={staffData}
            selectedPackages={selectedPackages}
            selectedAddons={selectedAddons}
            backgrounds={backgrounds}
            photoFors={photoFors}
            users={users}
            pricing={pricing}
            actualStartTime={actualStartTime}
            endTime={endTime}
            totalDuration={totalDuration}
            customFields={customFields}
            customFieldValues={customFieldValues}
            dpAmount={dpAmount}
            onDpAmountChange={setDpAmount}
          />
        )}
      </div>

      {/* Sticky price bar — visible after packages are selected */}
      {pricing.subtotal > 0 && step < 10 && (
        <div className="sticky bottom-0 -mx-0 bg-white border-t border-maroon-100 rounded-b-xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">Estimasi total</span>
          <div className="text-right">
            {pricing.discount > 0 && (
              <p className="text-xs text-gray-400 line-through">{formatRupiah(pricing.subtotal)}</p>
            )}
            <p className="text-base font-bold text-maroon-900">{formatRupiah(pricing.total)}</p>
          </div>
        </div>
      )}

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
