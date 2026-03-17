import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatRupiah } from "@/lib/utils";
import type { BookingDetail } from "./booking-detail-client";
import { User, Calendar, Package, ImageIcon, Tag, FileText } from "lucide-react";

interface Props {
  booking: BookingDetail;
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 flex-shrink-0 mr-4">{label}</span>
      <span className="text-gray-900 text-right">{value ?? "—"}</span>
    </div>
  );
}

export function TabOverview({ booking }: Props) {
  const customer = booking.customers;
  const bgs = booking.booking_backgrounds.map((b) => b.backgrounds?.name).filter(Boolean);
  const addons = booking.booking_addons.filter((a) => !a.is_extra);
  const extraAddons = booking.booking_addons.filter((a) => a.is_extra);

  const startMin =
    booking.start_time
      ? parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1])
      : 0;
  const endMin =
    booking.end_time
      ? parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1])
      : 0;
  const duration = endMin - startMin;

  return (
    <div className="space-y-4 pt-4">
      {/* Customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
            <User className="h-4 w-4 text-maroon-700" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label="Nama" value={<span className="font-semibold">{customer?.name}</span>} />
          <Row label="WhatsApp" value={customer?.phone} />
          <Row label="Email" value={customer?.email} />
          <Row label="Instagram" value={customer?.instagram ? `@${customer.instagram.replace(/^@/, "")}` : null} />
          <Row label="Alamat" value={customer?.address} />
          <Row label="Domisili" value={customer?.domicile} />
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
            <Calendar className="h-4 w-4 text-maroon-700" />
            Sesi
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label="Tanggal" value={formatDate(booking.booking_date)} />
          <Row
            label="Waktu"
            value={`${formatTime(booking.start_time)} — ${formatTime(booking.end_time)} (${duration} mnt)`}
          />
          <Row label="Jumlah Orang" value={`${booking.person_count} orang`} />
          <Row label="Photo For" value={booking.photo_for?.name} />
          <Row label="BTS" value={booking.behind_the_scenes ? "Ya" : "Tidak"} />
          {booking.notes && <Row label="Notes" value={booking.notes} />}
          {booking.google_drive_link && (
            <Row
              label="Google Drive"
              value={
                <a
                  href={booking.google_drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline text-xs truncate max-w-[200px] block"
                >
                  Buka Link
                </a>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Packages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
            <Package className="h-4 w-4 text-maroon-700" />
            Paket
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {booking.booking_packages.length > 0 ? (
            booking.booking_packages.map((bp) => (
              <Row
                key={bp.id}
                label={
                  <span>
                    {bp.packages?.name ?? "-"}
                    {bp.quantity > 1 && (
                      <Badge variant="secondary" className="ml-1.5 text-xs py-0 px-1.5">x{bp.quantity}</Badge>
                    )}
                  </span>
                }
                value={<span className="font-medium">{formatRupiah(bp.price_snapshot * bp.quantity)}</span>}
              />
            ))
          ) : (
            <>
              <Row label="Paket" value={<span className="font-medium">{booking.packages?.name}</span>} />
              <Row label="Durasi" value={`${booking.packages?.duration_minutes} menit`} />
              <Row label="Harga" value={formatRupiah(booking.packages?.price ?? 0)} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Backgrounds */}
      {bgs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <ImageIcon className="h-4 w-4 text-maroon-700" />
              Background
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {bgs.map((bg, i) => (
                <Badge key={i} variant="secondary">{bg}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {(addons.length > 0 || extraAddons.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <Tag className="h-4 w-4 text-maroon-700" />
              Add-ons
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {addons.map((a) => (
              <Row
                key={a.addon_id}
                label={
                  <span>
                    {a.addons?.name ?? a.addon_id}
                    {(a.quantity ?? 1) > 1 && <span className="text-gray-400 ml-1">({a.quantity}x)</span>}
                  </span>
                }
                value={formatRupiah(a.price * (a.quantity ?? 1))}
              />
            ))}
            {extraAddons.map((a) => (
              <Row
                key={a.addon_id}
                label={
                  <span className="text-amber-600">
                    {a.addons?.name ?? a.addon_id}
                    {(a.quantity ?? 1) > 1 && <span className="text-xs ml-1">({a.quantity}x)</span>}
                    {" "}<span className="text-xs">(extra)</span>
                  </span>
                }
                value={
                  <span className={a.is_paid ? "text-green-600" : "text-red-500"}>
                    {formatRupiah(a.price * (a.quantity ?? 1))} · {a.is_paid ? "Lunas" : "Belum Lunas"}
                  </span>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom Fields */}
      {booking.booking_custom_fields.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <FileText className="h-4 w-4 text-maroon-700" />
              Informasi Tambahan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {booking.booking_custom_fields.map((cf) => (
              <Row
                key={cf.custom_field_id}
                label={cf.custom_fields?.label ?? cf.custom_field_id}
                value={cf.value ?? "—"}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 text-right">
        Dibuat oleh: {booking.creator?.name ?? "-"} ·{" "}
        {new Date(booking.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
