"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { CurrentUser, BookingStatus, PrintOrderStatus } from "@/lib/types/database";
import { ArrowLeft, User, FileText, MessageCircle, Trash2, CalendarClock, Pencil } from "lucide-react";
import { TabOverview } from "./tab-overview";
import { TabProgress } from "./tab-progress";
import { TabPricing } from "./tab-pricing";
import { RescheduleModal } from "./reschedule-modal";
import { EditDetailModal } from "./edit-detail-modal";
import type { PackageOption, BackgroundOption, PhotoForOption, UserOption, CustomFieldOption } from "./edit-detail-modal";

export interface BookingAddonRow {
  addon_id: string;
  price: number;
  quantity: number;
  is_paid: boolean;
  is_extra: boolean;
  addons: { id: string; name: string; need_extra_time: boolean; extra_time_minutes: number } | null;
}

export interface BookingPackageRow {
  id: string;
  package_id: string;
  quantity: number;
  price_snapshot: number;
  packages: { id: string; name: string; price: number; duration_minutes: number; need_extra_time: boolean; extra_time_minutes: number } | null;
}

export interface BookingDetail {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  print_order_status: PrintOrderStatus | null;
  is_rescheduled: boolean;
  google_drive_link: string | null;
  person_count: number;
  notes: string | null;
  behind_the_scenes: boolean;
  subtotal: number;
  total: number;
  dp_amount: number | null;
  dp_paid_at: string | null;
  voucher_id: string | null;
  manual_discount: number;
  staff_id: string | null;
  created_by: string | null;
  created_at: string;
  customers: { id: string; name: string; phone: string; email: string | null; instagram: string | null; address: string | null; domicile: string | null } | null;
  packages: { id: string; name: string; price: number; duration_minutes: number } | null;
  photo_for: { id: string; name: string } | null;
  vouchers: { id: string; code: string; discount_type: string; discount_value: number } | null;
  staff: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
  booking_backgrounds: { background_id: string; backgrounds: { id: string; name: string } | null }[];
  booking_addons: BookingAddonRow[];
  booking_custom_fields: { custom_field_id: string; value: string | null; custom_fields: { id: string; label: string; field_type: string; options: string[] | null } | null }[];
  booking_packages: BookingPackageRow[];
}

export interface AvailableAddon {
  id: string;
  name: string;
  price: number;
  category: string | null;
  need_extra_time: boolean;
  extra_time_minutes: number;
  is_active: boolean;
}

interface Props {
  currentUser: CurrentUser;
  booking: BookingDetail;
  availableAddons: AvailableAddon[];
  packages: PackageOption[];
  backgrounds: BackgroundOption[];
  photoFors: PhotoForOption[];
  users: UserOption[];
  customFields: CustomFieldOption[];
}

export function BookingDetailClient({ currentUser, booking: initialBooking, availableAddons, packages, backgrounds, photoFors, users, customFields }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const hasFullAccess = currentUser.is_primary || currentUser.menu_access.includes("booking_full_access");

  const [booking, setBooking] = useState<BookingDetail>(initialBooking);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showEditDetail, setShowEditDetail] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "DELETE",
        entity: "bookings",
        entity_id: booking.id,
        description: `Menghapus booking ${booking.booking_number}`,
      });

      toast({ title: "Booking dihapus", description: booking.booking_number });
      router.push("/bookings");
    } catch {
      toast({ title: "Error", description: "Gagal menghapus booking", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  const waLink = booking.customers?.phone
    ? `https://wa.me/${booking.customers.phone.replace(/^0/, "62").replace(/\D/g, "")}`
    : null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/bookings")} className="flex-shrink-0 mt-0.5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="font-mono text-sm text-gray-500">{booking.booking_number}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {booking.customers?.name ?? "Customer"}
              </h1>
              <Badge className={BOOKING_STATUS_COLOR[booking.status]}>
                {BOOKING_STATUS_LABEL[booking.status]}
              </Badge>
              {booking.is_rescheduled && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  Rescheduled
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WA
              </Button>
            </a>
          )}
          <Link href={`/customer/${booking.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Customer Page</span>
            </Button>
          </Link>
          <Link href={`/invoice/${booking.id}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoice</span>
            </Button>
          </Link>
          {hasFullAccess && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setShowEditDetail(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Detail</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => setShowReschedule(true)}
              >
                <CalendarClock className="h-4 w-4" />
                <span className="hidden sm:inline">Reschedule</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
          {hasFullAccess && (
            <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <TabOverview booking={booking} />
        </TabsContent>

        <TabsContent value="progress">
          <TabProgress
            booking={booking}
            currentUser={currentUser}
            onUpdate={(updated) => setBooking((prev) => ({ ...prev, ...updated }))}
          />
        </TabsContent>

        {hasFullAccess && (
          <TabsContent value="pricing">
            <TabPricing
              booking={booking}
              currentUser={currentUser}
              availableAddons={availableAddons}
              onUpdate={(updated) => setBooking((prev) => ({ ...prev, ...updated }))}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Detail Modal */}
      <EditDetailModal
        open={showEditDetail}
        onClose={() => setShowEditDetail(false)}
        booking={booking}
        currentUser={currentUser}
        onUpdated={(updated) => setBooking((prev) => ({ ...prev, ...updated }))}
        packages={packages}
        backgrounds={backgrounds}
        photoFors={photoFors}
        users={users}
        customFields={customFields}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
        booking={booking}
        currentUser={currentUser}
        onRescheduled={(newDate, newStart, newEnd) =>
          setBooking((prev) => ({
            ...prev,
            booking_date: newDate,
            start_time: newStart,
            end_time: newEnd,
            is_rescheduled: true,
          }))
        }
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <span className="font-mono font-medium">{booking.booking_number}</span> akan
              dihapus beserta semua data terkait. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
