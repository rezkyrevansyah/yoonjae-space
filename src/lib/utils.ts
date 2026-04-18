import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Parse date string as local time (not UTC) to avoid timezone shift
// "2026-03-01" → new Date("2026-03-01") = UTC midnight = 28 Feb WIB
// Fix: append T00:00:00 so it's parsed as local midnight
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // If it's a plain date (YYYY-MM-DD), parse as local
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(date + "T00:00:00");
  }
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseLocalDate(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(date));
}

// Format Date as YYYY-MM-DD using local timezone (for DB queries)
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  let currentMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  while (currentMinutes < closeMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

export function generateSessionName(booking: {
  booking_date: string;
  booking_packages?: { packages: { name: string } | null }[];
  packages?: { name: string } | null;
  customers?: { name: string; phone: string } | null;
}): string {
  const dd = booking.booking_date.slice(8, 10);
  const mm = booking.booking_date.slice(5, 7);
  const yy = booking.booking_date.slice(2, 4);
  const dateStr = dd + mm + yy;

  const packageName =
    booking.booking_packages?.[0]?.packages?.name ??
    booking.packages?.name ??
    "";

  const clientName = booking.customers?.name ?? "";

  return [dateStr, packageName, clientName].filter(Boolean).join("_");
}
