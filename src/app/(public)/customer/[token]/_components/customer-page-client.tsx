"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, PRINT_ORDER_STATUS_LABEL } from "@/lib/constants";
import type { BookingStatus, PrintOrderStatus } from "@/lib/types/database";
import {
  CalendarDays,
  Clock,
  Package,
  Images,
  FileText,
  MapPin,
  Phone,
  Instagram,
  MessageCircle,
  Map,
  CheckCircle2,
  Circle,
  XCircle,
  AlertCircle,
  Printer,
} from "lucide-react";

// ---- Types ----
interface BookingData {
  id: string;
  public_token: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  print_order_status: PrintOrderStatus | null;
  google_drive_link: string | null;
  person_count: number;
  behind_the_scenes: boolean;
  customers: { name: string; phone: string } | null;
  packages: { name: string; duration_minutes: number } | null;
  booking_addons: {
    addon_id: string;
    price: number;
    is_paid: boolean;
    is_extra: boolean;
    addons: { name: string } | null;
  }[];
  booking_backgrounds: { backgrounds: { name: string } | null }[];
  invoices: { invoice_number: string }[] | { invoice_number: string } | null;
}

interface StudioInfo {
  studio_name: string;
  logo_url: string | null;
  front_photo_url: string | null;
  address: string | null;
  whatsapp_number: string | null;
  instagram: string | null;
  google_maps_url: string | null;
  footer_text: string | null;
}

interface Props {
  booking: BookingData;
  studioInfo: StudioInfo | null;
  settings: { open_time: string; close_time: string } | null;
}

// Booking flow for stepper (same as booking detail — ADDON_UNPAID maps to PHOTOS_DELIVERED)
const BOOKING_FLOW: BookingStatus[] = [
  "BOOKED", "PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "CLOSED",
];

// Customer-facing print flow (excludes internal: VENDOR, RECEIVE)
const CUSTOMER_PRINT_FLOW: PrintOrderStatus[] = [
  "SELECTION", "PRINTING", "PACKING", "SHIPPED", "DONE",
];

// Map internal print status → customer-visible index
function getCustomerPrintIndex(status: PrintOrderStatus): number {
  const map: Record<PrintOrderStatus, number> = {
    SELECTION: 0,
    VENDOR: 0,    // internal → still at SELECTION
    PRINTING: 1,
    RECEIVE: 1,   // internal → still at PRINTING
    PACKING: 2,
    SHIPPED: 3,
    DONE: 4,
  };
  return map[status];
}

const canViewPhotos = (status: BookingStatus) =>
  ["PHOTOS_DELIVERED", "ADDON_UNPAID", "CLOSED"].includes(status);

/** Staggered fade-up using CSS animation (no framer-motion) */
function FadeUp({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`animate-fade-up${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${i * 0.08}s` }}
    >
      {children}
    </div>
  );
}

export function CustomerPageClient({ booking, studioInfo, settings }: Props) {
  const studio = studioInfo;
  const customerName = booking.customers?.name ?? "Customer";
  const invoiceNumber = Array.isArray(booking.invoices)
    ? booking.invoices[0]?.invoice_number
    : (booking.invoices as { invoice_number: string } | null)?.invoice_number;

  // Map ADDON_UNPAID to PHOTOS_DELIVERED for stepper position
  const effectiveStatus: BookingStatus =
    booking.status === "ADDON_UNPAID" ? "PHOTOS_DELIVERED" : booking.status;
  const currentStatusIdx = BOOKING_FLOW.indexOf(effectiveStatus);
  const isCanceled = booking.status === "CANCELED";

  // Print order
  const currentPrintIdx = booking.print_order_status
    ? getCustomerPrintIndex(booking.print_order_status)
    : -1;

  const waLink = studio?.whatsapp_number
    ? `https://wa.me/${studio.whatsapp_number.replace(/^0/, "62").replace(/\D/g, "")}`
    : null;
  const igLink = studio?.instagram
    ? `https://instagram.com/${studio.instagram.replace(/^@/, "")}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B1A1A] via-[#6b1414] to-[#3d0a0a]">
      {/* Header */}
      <header className="flex flex-col items-center pt-10 pb-6 px-6">
        {studio?.logo_url ? (
          <Image
            src={studio.logo_url}
            alt={studio?.studio_name ?? "Studio"}
            width={72}
            height={72}
            className="rounded-full border-2 border-white/30 mb-3 object-cover"
          />
        ) : (
          <div className="h-18 w-18 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-bold">
              {studio?.studio_name?.[0] ?? "Y"}
            </span>
          </div>
        )}
        <h1 className="text-white text-xl font-bold tracking-wide">
          {studio?.studio_name ?? "Studio"}
        </h1>
      </header>

      {/* Main card */}
      <main className="px-4 pb-16 max-w-md mx-auto space-y-4">

        {/* Greeting */}
        <FadeUp i={0} className="bg-white rounded-2xl p-5 text-center shadow-lg">
          <p className="text-gray-500 text-sm">Halo,</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">{customerName} 👋</h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">{booking.booking_number}</p>
        </FadeUp>

        {/* Status Booking — Horizontal Stepper */}
        <FadeUp i={1} className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="font-semibold text-gray-800">Status Booking</h3>

          <div className="relative">
            {/* Background line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
            {/* Progress line */}
            <div
              className="absolute top-4 left-4 h-0.5 bg-[#8B1A1A] transition-all"
              style={{
                width: isCanceled
                  ? "0%"
                  : `${(Math.max(0, currentStatusIdx) / (BOOKING_FLOW.length - 1)) * 100}%`,
              }}
            />
            <div className="relative flex justify-between">
              {BOOKING_FLOW.map((status, idx) => {
                const isPast = idx < currentStatusIdx && !isCanceled;
                const isCurrent = idx === currentStatusIdx && !isCanceled;
                return (
                  <div key={status} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white z-10 ${
                        isPast || isCurrent ? "border-[#8B1A1A]" : "border-gray-300"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-5 w-5 text-[#8B1A1A]" />
                      ) : isCurrent ? (
                        <Circle className="h-3 w-3 fill-[#8B1A1A] text-[#8B1A1A]" />
                      ) : (
                        <Circle className="h-3 w-3 text-gray-300" />
                      )}
                    </div>
                    <span className={`text-[10px] text-center leading-tight max-w-[56px] ${
                      isCurrent ? "text-[#8B1A1A] font-semibold" : isPast ? "text-[#8B1A1A]/70" : "text-gray-400"
                    }`}>
                      {BOOKING_STATUS_LABEL[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {isCanceled && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Booking ini telah dibatalkan</span>
            </div>
          )}

          {booking.status === "ADDON_UNPAID" && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3 text-orange-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Ada tambahan yang belum dibayar
            </div>
          )}
        </FadeUp>

        {/* Print Order — Horizontal Stepper (customer-facing, no VENDOR/RECEIVE) */}
        {booking.print_order_status && (
          <FadeUp i={2} className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Printer className="h-4 w-4 text-blue-600" />
              Print Order
            </h3>

            <div className="relative">
              {/* Background line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
              {/* Progress line */}
              <div
                className="absolute top-4 left-4 h-0.5 bg-blue-500 transition-all"
                style={{
                  width: `${(Math.max(0, currentPrintIdx) / (CUSTOMER_PRINT_FLOW.length - 1)) * 100}%`,
                }}
              />
              <div className="relative flex justify-between">
                {CUSTOMER_PRINT_FLOW.map((status, idx) => {
                  const isPast = idx < currentPrintIdx;
                  const isCurrent = idx === currentPrintIdx;
                  return (
                    <div key={status} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white z-10 ${
                          isPast || isCurrent ? "border-blue-500" : "border-gray-300"
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        ) : isCurrent ? (
                          <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                        ) : (
                          <Circle className="h-3 w-3 text-gray-300" />
                        )}
                      </div>
                      <span className={`text-[10px] text-center leading-tight max-w-[56px] ${
                        isCurrent ? "text-blue-700 font-semibold" : isPast ? "text-blue-400" : "text-gray-400"
                      }`}>
                        {PRINT_ORDER_STATUS_LABEL[status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeUp>
        )}

        {/* View Photos button */}
        {canViewPhotos(booking.status) && booking.google_drive_link && (
          <FadeUp i={3}>
            <a
              href={/^https?:\/\//i.test(booking.google_drive_link) ? booking.google_drive_link : `https://${booking.google_drive_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#8B1A1A] hover:bg-[#B22222] text-white rounded-2xl p-4 shadow-lg font-semibold transition-colors"
            >
              <Images className="h-5 w-5" />
              Lihat Foto Kamu
            </a>
          </FadeUp>
        )}

        {/* Booking Details */}
        <FadeUp i={4} className="bg-white rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="font-semibold text-gray-800 mb-1">Detail Booking</h3>

          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-[#8B1A1A] flex-shrink-0" />
            <span className="text-sm text-gray-700">{formatDate(booking.booking_date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-[#8B1A1A] flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {formatTime(booking.start_time)} — {formatTime(booking.end_time)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 text-[#8B1A1A] flex-shrink-0" />
            <span className="text-sm text-gray-700">{booking.packages?.name ?? "-"}</span>
          </div>

          {/* Backgrounds */}
          {booking.booking_backgrounds.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5">
              {booking.booking_backgrounds.map((b, i) => (
                <span
                  key={i}
                  className="text-xs bg-[#FEF2F2] text-[#8B1A1A] px-2 py-1 rounded-full border border-[#8B1A1A]/20"
                >
                  {b.backgrounds?.name}
                </span>
              ))}
            </div>
          )}
        </FadeUp>

        {/* Invoice section */}
        {invoiceNumber && (
          <FadeUp i={5} className="bg-white rounded-2xl p-5 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Invoice</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Nomor Invoice</p>
                <p className="font-mono font-medium text-gray-800">{invoiceNumber}</p>
              </div>
              <Link
                href={`/invoice/${booking.public_token}`}
                target="_blank"
                className="flex items-center gap-1.5 bg-[#8B1A1A] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#B22222] transition-colors"
              >
                <FileText className="h-4 w-4" />
                Lihat Invoice
              </Link>
            </div>
          </FadeUp>
        )}

        {/* Studio Info */}
        {studio && (
          <FadeUp i={6} className="rounded-2xl overflow-hidden shadow-lg">
            {/* Studio front photo */}
            {studio.front_photo_url && (
              <div className="relative h-40 w-full">
                <Image
                  src={studio.front_photo_url}
                  alt={studio.studio_name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="text-white font-bold text-lg">{studio.studio_name}</p>
                </div>
              </div>
            )}

            <div className="bg-white p-5 space-y-3">
              {!studio.front_photo_url && (
                <h3 className="font-semibold text-gray-800">{studio.studio_name}</h3>
              )}

              {studio.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[#8B1A1A] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{studio.address}</p>
                </div>
              )}

              {settings && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#8B1A1A] flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    {settings.open_time} — {settings.close_time}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white text-sm py-2.5 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {igLink && (
                  <a
                    href={igLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                )}
                {studio.google_maps_url && (
                  <a
                    href={studio.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white text-sm py-2.5 rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <Map className="h-4 w-4" />
                    Maps
                  </a>
                )}
              </div>
            </div>
          </FadeUp>
        )}

        {/* Thank you + Book Again */}
        <FadeUp i={7} className="text-center space-y-4 pt-2">
          <p className="text-white/80 text-sm">
            {studio?.footer_text ?? "Terima kasih telah mempercayakan momen spesialmu bersama kami 🤍"}
          </p>

          {waLink && (
            <a
              href={`${waLink}?text=Halo, saya ingin booking sesi foto baru!`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#8B1A1A] font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Book Again
            </a>
          )}
        </FadeUp>

      </main>
    </div>
  );
}
