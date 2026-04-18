import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { NewBookingClient } from "./_components/new-booking-client";
import {
  getCachedPackages,
  getCachedBackgrounds,
  getCachedAddons,
  getCachedLeads,
  getCachedPhotoFor,
  getCachedCustomFields,
  getCachedSettingsGeneral,
  getCachedHolidays,
  getCachedActiveUsers,
  getCachedDomiciles,
  getCachedPackageCategories,
  getCachedAddonCategories,
} from "@/lib/cached-queries";
import type { Package, Background, Addon, Lead, PhotoFor, CustomField, SettingsGeneral, StudioHoliday } from "@/lib/types/database";

export const metadata = { title: "Buat Booking — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [
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
    domiciles,
    packageCategories,
    addonCategories,
  ] = await Promise.all([
    getCurrentUser(),
    getCachedPackages(),
    getCachedBackgrounds(),
    getCachedAddons(),
    getCachedLeads(),
    getCachedPhotoFor(),
    getCachedCustomFields(),
    getCachedSettingsGeneral(),
    getCachedHolidays(),
    getCachedActiveUsers(),
    getCachedDomiciles(),
    getCachedPackageCategories(),
    getCachedAddonCategories(),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <NewBookingClient
      currentUser={currentUser}
      packages={(packages as Package[]) ?? []}
      backgrounds={(backgrounds as Background[]) ?? []}
      addons={(addons as Addon[]) ?? []}
      leads={(leads as Lead[]) ?? []}
      photoFors={(photoFors as PhotoFor[]) ?? []}
      customFields={(customFields as CustomField[]) ?? []}
      settingsGeneral={settingsGeneral as SettingsGeneral | null}
      holidays={(holidays as StudioHoliday[]) ?? []}
      users={(users as { id: string; name: string }[]) ?? []}
      domicileOptions={(domiciles as { name: string }[]).map(d => d.name)}
      packageCategories={(packageCategories as { id: string; name: string; sort_order: number }[]) ?? []}
      addonCategories={(addonCategories as { id: string; name: string; sort_order: number }[]) ?? []}
    />
  );
}
