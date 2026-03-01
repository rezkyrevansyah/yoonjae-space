"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import type { CurrentUser } from "@/lib/types/database";

interface TabStudioInfoProps {
  currentUser: CurrentUser;
}

export function TabStudioInfo({ currentUser }: TabStudioInfoProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const frontPhotoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string | null>(null);

  const [studioName, setStudioName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from("settings_studio_info")
      .select("studio_name, address, google_maps_url, whatsapp_number, email, instagram, logo_url, front_photo_url, footer_text")
      .eq("lock", true)
      .maybeSingle();

    if (data) {
      setStudioName(data.studio_name ?? "");
      setAddress(data.address ?? "");
      setMapsUrl(data.google_maps_url ?? "");
      setWhatsapp(data.whatsapp_number ?? "");
      setEmail(data.email ?? "");
      setInstagram(data.instagram ?? "");
      setFooterText(data.footer_text ?? "");
      setLogoUrl(data.logo_url);
      setFrontPhotoUrl(data.front_photo_url);
    }
    setLoading(false);
  }

  async function uploadImage(file: File, path: "studio/logo" | "studio/front-photo", setter: (url: string) => void, setUploading: (v: boolean) => void) {
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("images-yoonjae")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("images-yoonjae").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      setter(url);

      // Save URL to DB
      const field = path === "studio/logo" ? "logo_url" : "front_photo_url";
      await supabase.from("settings_studio_info").upsert(
        { lock: true, [field]: url },
        { onConflict: "lock" }
      );

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "upload_studio_image",
        entity: "settings_studio_info",
        entity_id: null,
        description: `Uploaded ${path}`,
      });

      toast({ title: "Berhasil", description: "Gambar berhasil diupload." });
    } catch {
      toast({ title: "Gagal upload", description: "Terjadi kesalahan saat upload.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("settings_studio_info").upsert(
        {
          lock: true,
          studio_name: studioName,
          address: address || null,
          google_maps_url: mapsUrl || null,
          whatsapp_number: whatsapp || null,
          email: email || null,
          instagram: instagram || null,
          footer_text: footerText || null,
          logo_url: logoUrl,
          front_photo_url: frontPhotoUrl,
        },
        { onConflict: "lock" }
      );
      if (error) throw error;

      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role_name,
        action: "update_studio_info",
        entity: "settings_studio_info",
        entity_id: null,
        description: "Updated studio info",
      });

      toast({ title: "Berhasil", description: "Info studio disimpan." });
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Logo Studio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" width={120} height={120} className="object-contain max-h-28" unoptimized />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  <span className="text-xs">Belum ada logo</span>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, "studio/logo", setLogoUrl, setUploadingLogo);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Logo
            </Button>
          </CardContent>
        </Card>

        {/* Front Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Foto Tampak Depan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg bg-gray-50 overflow-hidden">
              {frontPhotoUrl ? (
                <Image src={frontPhotoUrl} alt="Front" width={120} height={120} className="object-cover w-full h-full max-h-28" unoptimized />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  <span className="text-xs">Belum ada foto</span>
                </div>
              )}
            </div>
            <input
              ref={frontPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, "studio/front-photo", setFrontPhotoUrl, setUploadingFront);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploadingFront}
              onClick={() => frontPhotoInputRef.current?.click()}
            >
              {uploadingFront ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Foto
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Studio Info Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Studio <span className="text-red-500">*</span></Label>
            <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="Yoonjaespace Studio" />
          </div>
          <div className="space-y-2">
            <Label>Alamat</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. ..." rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Google Maps URL</Label>
              <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="628xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="studio@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yoonjaespace" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Footer Text (tampil di invoice)</Label>
            <Textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={3} placeholder="Terima kasih telah memilih Yoonjaespace..." />
          </div>

          <Button onClick={handleSave} disabled={saving || !studioName} className="bg-maroon-700 hover:bg-maroon-600">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Info Studio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
