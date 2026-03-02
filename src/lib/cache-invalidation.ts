"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./cached-queries";

export async function invalidatePackages() {
  revalidateTag(CACHE_TAGS.PACKAGES);
}

export async function invalidateBackgrounds() {
  revalidateTag(CACHE_TAGS.BACKGROUNDS);
}

export async function invalidateAddons() {
  revalidateTag(CACHE_TAGS.ADDONS);
}

export async function invalidateLeads() {
  revalidateTag(CACHE_TAGS.LEADS);
}

export async function invalidatePhotoFor() {
  revalidateTag(CACHE_TAGS.PHOTO_FOR);
}

export async function invalidateCustomFields() {
  revalidateTag(CACHE_TAGS.CUSTOM_FIELDS);
}

export async function invalidateSettingsGeneral() {
  revalidateTag(CACHE_TAGS.SETTINGS_GENERAL);
}

export async function invalidateStudioInfo() {
  revalidateTag(CACHE_TAGS.SETTINGS_STUDIO_INFO);
}

export async function invalidateReminderTemplates() {
  revalidateTag(CACHE_TAGS.SETTINGS_REMINDER_TEMPLATES);
}

export async function invalidateHolidays() {
  revalidateTag(CACHE_TAGS.STUDIO_HOLIDAYS);
}

export async function invalidateRoles() {
  revalidateTag(CACHE_TAGS.ROLES);
}

export async function invalidateActiveUsers() {
  revalidateTag(CACHE_TAGS.USERS_ACTIVE);
}

export async function invalidateActiveVendors() {
  revalidateTag(CACHE_TAGS.VENDORS_ACTIVE);
}
