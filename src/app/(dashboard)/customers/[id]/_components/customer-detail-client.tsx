"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from "@/lib/constants";
import type { BookingStatus, CurrentUser } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Instagram,
  MapPin,
  FileText,
  CalendarDays,
  TrendingUp,
  BookOpen,
  ExternalLink,
} from "lucide-react";

// ---- Types ----
interface BookingHistoryItem {
  id: string;
  booking_number: string;
  booking_date: string;
  status: BookingStatus;
  total: number;
  packages: { name: string } | null;
}

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  address: string | null;
  domicile: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
  leads: { id: string; name: string } | null;
  bookings: BookingHistoryItem[];
}

interface Props {
  currentUser: CurrentUser;
  customer: CustomerData;
  leads: { id: string; name: string }[];
}

interface EditForm {
  name: string;
  email: string;
  instagram: string;
  address: string;
  domicile: string;
  lead_id: string;
  notes: string;
}

const supabase = createClient();

export function CustomerDetailClient({ currentUser, customer, leads }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    name: customer.name,
    email: customer.email ?? "",
    instagram: customer.instagram ?? "",
    address: customer.address ?? "",
    domicile: customer.domicile ?? "",
    lead_id: customer.lead_id ?? "",
    notes: customer.notes ?? "",
  });

  const bookings = customer.bookings ?? [];
  const sortedBookings = [...bookings].sort((a, b) =>
    b.booking_date.localeCompare(a.booking_date)
  );
  const totalBookings = bookings.length;
  const totalSpend = bookings.reduce((s, b) => s + (b.total ?? 0), 0);
  const lastVisit = sortedBookings[0]?.booking_date ?? null;
  const currentLeadName = customer.leads?.name ?? leads.find(l => l.id === customer.lead_id)?.name ?? null;

  async function handleSave() {
    if (!editForm.name.trim()) {
      toast({ title: "Error", description: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        instagram: editForm.instagram.trim() || null,
        address: editForm.address.trim() || null,
        domicile: editForm.domicile.trim() || null,
        lead_id: editForm.lead_id && editForm.lead_id !== "none" ? editForm.lead_id : null,
        notes: editForm.notes.trim() || null,
      })
      .eq("id", customer.id);

    if (error) {
      setSaving(false);
      toast({ title: "Error", description: "Gagal menyimpan perubahan", variant: "destructive" });
      return;
    }

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "UPDATE",
      entity: "customers",
      entity_id: customer.id,
      description: `Data customer diperbarui: ${editForm.name}`,
    });

    setSaving(false);
    setShowEdit(false);
    toast({ title: "Data customer diperbarui!" });
    router.refresh();
  }

  async function handleDelete() {
    const activeStatuses = ["BOOKED", "PAID", "SHOOT_DONE", "PHOTOS_DELIVERED", "ADDON_UNPAID"];
    const hasActive = bookings.some(b => activeStatuses.includes(b.status));
    if (hasActive) {
      toast({ title: "Tidak dapat dihapus", description: "Customer masih memiliki booking aktif", variant: "destructive" });
      setShowDelete(false);
      return;
    }

    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
      setShowDelete(false);
      return;
    }

    await supabase.from("activity_log").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role_name,
      action: "DELETE",
      entity: "customers",
      entity_id: customer.id,
      description: `Customer dihapus: ${customer.name}`,
    });

    toast({ title: "Customer dihapus" });
    router.push("/customers");
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/customers"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Customers
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Hapus
          </Button>
        </div>
      </div>

      {/* Hero profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="h-2 bg-gradient-to-r from-[#8B1A1A] to-[#B22222]" />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-2xl bg-[#FEF2F2] border-2 border-[#8B1A1A]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#8B1A1A] text-2xl font-bold">
                {customer.name[0]?.toUpperCase()}
              </span>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Customer sejak {formatDate(customer.created_at)}
                  </p>
                </div>
                {currentLeadName && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                    {currentLeadName}
                  </span>
                )}
              </div>

              {/* Contact chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                <ContactChip icon={<Phone className="h-3.5 w-3.5" />} value={customer.phone} />
                {customer.email && <ContactChip icon={<Mail className="h-3.5 w-3.5" />} value={customer.email} />}
                {customer.instagram && <ContactChip icon={<Instagram className="h-3.5 w-3.5" />} value={customer.instagram} />}
              </div>
            </div>
          </div>

          {/* Address + notes row */}
          {(customer.address || customer.domicile || customer.notes) && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
              {(customer.address || customer.domicile) && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>
                    {[customer.address, customer.domicile].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              {customer.notes && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="italic text-gray-500">{customer.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row — attached to card bottom */}
        <div className="grid grid-cols-3 border-t border-gray-100">
          <div className="py-4 text-center border-r border-gray-100">
            <div className="flex justify-center mb-1">
              <BookOpen className="h-4 w-4 text-[#8B1A1A]" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Booking</p>
          </div>
          <div className="py-4 text-center border-r border-gray-100">
            <div className="flex justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900 truncate px-2">
              {totalSpend > 0 ? formatRupiah(totalSpend) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Total Spend</p>
          </div>
          <div className="py-4 text-center">
            <div className="flex justify-center mb-1">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-sm font-bold text-gray-900 px-2 truncate">
              {lastVisit ? formatDate(lastVisit) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Last Visit</p>
          </div>
        </div>
      </div>

      {/* Booking History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Riwayat Booking</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{totalBookings}</span>
        </div>

        {sortedBookings.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Belum ada riwayat booking</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Booking ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Paket</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-[#8B1A1A]">
                          {b.booking_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-xs">{formatDate(b.booking_date)}</td>
                      <td className="px-4 py-3.5 text-gray-700 text-xs">{b.packages?.name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>
                          {BOOKING_STATUS_LABEL[b.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700 font-medium">
                        {formatRupiah(b.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-[#8B1A1A]"
                          title="Lihat Detail"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-50">
              {sortedBookings.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="block px-4 py-3.5 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-semibold text-[#8B1A1A]">
                      {b.booking_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLOR[b.status]}`}>
                      {BOOKING_STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(b.booking_date)} · {b.packages?.name ?? "—"}</span>
                    <span className="font-mono font-medium text-gray-700">{formatRupiah(b.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama <span className="text-red-500">*</span></Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                WhatsApp
                <span className="text-xs text-gray-400 font-normal">(tidak dapat diubah)</span>
              </Label>
              <Input value={customer.phone} disabled className="bg-gray-50 text-gray-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input
                  value={editForm.instagram}
                  onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Domisili</Label>
                <Input
                  value={editForm.domicile}
                  onChange={e => setEditForm(f => ({ ...f, domicile: e.target.value }))}
                  placeholder="Kota"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Leads</Label>
                <Select
                  value={editForm.lead_id || "none"}
                  onValueChange={v => setEditForm(f => ({ ...f, lead_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih leads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>
                Batal
              </Button>
              <Button
                className="flex-1 bg-[#8B1A1A] hover:bg-[#B22222]"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{customer.name}</strong> dan semua datanya akan dihapus permanen.
              Customer yang masih memiliki booking aktif tidak dapat dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContactChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
      <span className="text-gray-400">{icon}</span>
      {value}
    </span>
  );
}
