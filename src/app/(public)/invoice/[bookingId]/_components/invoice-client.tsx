"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate, formatRupiah, formatTime } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types/database";
import {
  ArrowLeft,
  Copy,
  Share2,
  Printer,
  Check,
} from "lucide-react";

// ---- Types ----
interface BookingData {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  subtotal: number;
  total: number;
  manual_discount: number | null;
  customers: { name: string; phone: string; email: string | null } | null;
  packages: { name: string; price: number } | null;
  vouchers: {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  } | null;
  booking_addons: {
    addon_id: string;
    price: number;
    is_paid: boolean;
    is_extra: boolean;
    addons: { name: string } | null;
  }[];
  invoices: { invoice_number: string; invoice_date: string } | { invoice_number: string; invoice_date: string }[] | null;
}

interface StudioInfo {
  studio_name: string;
  logo_url: string | null;
  address: string | null;
  whatsapp_number: string | null;
  footer_text: string | null;
}

interface CurrentUser {
  id: string;
  name: string;
}

interface Props {
  booking: BookingData;
  studioInfo: StudioInfo | null;
  currentUser: CurrentUser | null;
}

const INVOICE_WIDTH = 600;

export function InvoiceClient({ booking, studioInfo, currentUser }: Props) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    function updateScale() {
      const vw = window.innerWidth;
      setScale(vw < INVOICE_WIDTH ? vw / INVOICE_WIDTH : 1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    if (mounted && printRef.current) setPaperHeight(printRef.current.offsetHeight);
  }, [scale, mounted]);

  // Resolve invoice
  const invoice = Array.isArray(booking.invoices)
    ? booking.invoices[0]
    : (booking.invoices as { invoice_number: string; invoice_date: string } | null);

  const invoiceDate = invoice?.invoice_date
    ? formatDate(invoice.invoice_date)
    : formatDate(new Date().toISOString());

  // Discount calculation
  let discountLabel = "";
  let discountAmount = 0;
  if (booking.vouchers) {
    const v = booking.vouchers;
    if (v.discount_type === "percentage") {
      discountAmount = Math.round((booking.subtotal * v.discount_value) / 100);
      discountLabel = `Voucher ${v.code} (${v.discount_value}%)`;
    } else {
      discountAmount = v.discount_value;
      discountLabel = `Voucher ${v.code}`;
    }
  } else if (booking.manual_discount && booking.manual_discount > 0) {
    discountAmount = booking.manual_discount;
    discountLabel = "Diskon Manual";
  }

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${booking.booking_number}`, url: window.location.href });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print-hidden action bar */}
      <div className="print:hidden bg-gray-100 border-b border-gray-200 px-4 py-3">
        {/* Row 1: Back + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <Link
              href={`/bookings/${booking.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mr-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <><Check className="h-4 w-4 text-green-500" /><span>Tersalin</span></>
            ) : (
              <><Copy className="h-4 w-4" /><span>Copy Link</span></>
            )}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-green-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span>Bagikan</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#8B1A1A] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#B22222] transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Download</span>
          </button>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="bg-gray-50 min-h-screen py-8 print:bg-white print:p-0 print:m-0 print:min-h-0 overflow-x-hidden">
        {/* Scale wrapper — shrinks invoice on mobile after mount, normal on desktop/SSR */}
        <div
          style={{
            width: mounted && scale < 1 ? `${Math.round(INVOICE_WIDTH * scale)}px` : "100%",
            maxWidth: !mounted || scale >= 1 ? "672px" : undefined,
            height: mounted && paperHeight && scale < 1 ? `${Math.round(paperHeight * scale)}px` : undefined,
            margin: "0 auto",
          }}
        >
        <div
          ref={printRef}
          className="invoice-paper bg-white shadow-md print:shadow-none print:max-w-none"
          style={{
            width: INVOICE_WIDTH,
            transformOrigin: "top left",
            transform: mounted && scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          {/* ---- Header ---- */}
          <div className="border-b-2 border-[#8B1A1A] p-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              {/* Studio identity */}
              <div className="flex items-center gap-3">
                {studioInfo?.logo_url ? (
                  <Image
                    src={studioInfo.logo_url}
                    alt={studioInfo.studio_name}
                    width={56}
                    height={56}
                    className="rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-[#8B1A1A] flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {studioInfo?.studio_name?.[0] ?? "Y"}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {studioInfo?.studio_name ?? "Studio"}
                  </h1>
                  {studioInfo?.address && (
                    <p className="text-xs text-gray-500 mt-0.5 max-w-[240px]">
                      {studioInfo.address}
                    </p>
                  )}
                  {studioInfo?.whatsapp_number && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {studioInfo.whatsapp_number}
                    </p>
                  )}
                </div>
              </div>

              {/* INVOICE title */}
              <div className="text-right">
                <p className="text-3xl font-black text-[#8B1A1A] tracking-wider">
                  INVOICE
                </p>
                {invoice?.invoice_number && (
                  <p className="text-sm font-mono text-gray-600 mt-1">
                    {invoice.invoice_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ---- Invoice meta + Bill To ---- */}
          <div className="p-8 pb-0 grid grid-cols-2 gap-8">
            {/* Invoice info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Info Invoice
              </h3>
              <table className="text-sm w-full">
                <tbody className="space-y-1">
                  <InfoRow label="Tanggal Invoice" value={invoiceDate} />
                  <InfoRow label="Tanggal Sesi" value={formatDate(booking.booking_date)} />
                  <InfoRow
                    label="Waktu Sesi"
                    value={`${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`}
                  />
                  <InfoRow label="Booking Ref" value={booking.booking_number} mono />
                  <tr>
                    <td className="py-0.5 text-gray-500 pr-4 align-top">Status</td>
                    <td className="py-0.5 align-top">
                      <span
                        className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[booking.status]}`}
                      >
                        {BOOKING_STATUS_LABEL[booking.status]}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bill To */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Tagihan Kepada
              </h3>
              <p className="text-sm font-semibold text-gray-900">
                {booking.customers?.name ?? "-"}
              </p>
              {booking.customers?.phone && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {booking.customers.phone}
                </p>
              )}
              {booking.customers?.email && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {booking.customers.email}
                </p>
              )}
            </div>
          </div>

          {/* ---- Items table ---- */}
          <div className="p-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Deskripsi</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Package */}
                {booking.packages && (
                  <tr>
                    <td className="py-3 text-gray-800">
                      Paket {booking.packages.name}
                    </td>
                    <td className="py-3 text-right text-gray-800 font-mono">
                      {formatRupiah(booking.packages.price)}
                    </td>
                  </tr>
                )}

                {/* Add-ons */}
                {booking.booking_addons.map((ba, i) => (
                  <tr key={i}>
                    <td className="py-3 text-gray-800">
                      <span>{ba.addons?.name ?? "Add-on"}</span>
                      {ba.is_extra && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          Extra
                        </span>
                      )}
                      {!ba.is_paid && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-800 font-mono">
                      {formatRupiah(ba.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-gray-200 mt-2 pt-4 space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatRupiah(booking.subtotal)}</span>
              </div>

              {/* Discount */}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>{discountLabel}</span>
                  <span className="font-mono">- {formatRupiah(discountAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-1">
                <span className="font-bold text-gray-900 text-base">Total</span>
                <span className="font-bold text-[#8B1A1A] text-base font-mono">
                  {formatRupiah(booking.total)}
                </span>
              </div>
            </div>
          </div>

          {/* ---- Footer ---- */}
          <div className="px-8 pb-8 mt-auto">
            <div className="border-t border-gray-100 pt-6 text-center">
              <p className="text-sm font-semibold text-gray-700">
                {studioInfo?.studio_name ?? "Yoonjaespace Studio"}
              </p>
              {studioInfo?.footer_text && (
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  {studioInfo.footer_text}
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ---- Print styles ---- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          body > * {
            min-height: 0 !important;
          }
          .invoice-paper {
            margin: 0 auto;
            width: 600px;
          }
        }
      `}</style>
    </>
  );
}

// Helper component
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <tr>
      <td className="py-0.5 text-gray-500 pr-4 align-top whitespace-nowrap">{label}</td>
      <td className={`py-0.5 text-gray-800 align-top ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </td>
    </tr>
  );
}
