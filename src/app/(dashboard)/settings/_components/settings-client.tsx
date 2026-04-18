"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabGeneral } from "./tabs/tab-general";
import type { CurrentUser } from "@/lib/types/database";

// Lazy-load semua tab kecuali tab pertama (General) yang langsung visible
const TabReminders   = dynamic(() => import("./tabs/tab-reminders").then(m => ({ default: m.TabReminders })));
const TabStudioInfo  = dynamic(() => import("./tabs/tab-studio-info").then(m => ({ default: m.TabStudioInfo })));
const TabPackages    = dynamic(() => import("./tabs/tab-packages").then(m => ({ default: m.TabPackages })));
const TabBackgrounds = dynamic(() => import("./tabs/tab-backgrounds").then(m => ({ default: m.TabBackgrounds })));
const TabAddons      = dynamic(() => import("./tabs/tab-addons").then(m => ({ default: m.TabAddons })));
const TabVouchers    = dynamic(() => import("./tabs/tab-vouchers").then(m => ({ default: m.TabVouchers })));
const TabCustomFields = dynamic(() => import("./tabs/tab-custom-fields").then(m => ({ default: m.TabCustomFields })));
const TabSimpleCrud  = dynamic(() => import("./tabs/tab-simple-crud").then(m => ({ default: m.TabSimpleCrud })));
const TabCategories  = dynamic(() => import("./tabs/tab-categories").then(m => ({ default: m.TabCategories })));
const TabDomiciles   = dynamic(() => import("./tabs/tab-domiciles").then(m => ({ default: m.TabDomiciles })));

interface SettingsClientProps {
  currentUser: CurrentUser;
}

const TABS = [
  { value: "general",        label: "General" },
  { value: "reminders",      label: "Reminder Template" },
  { value: "studio-info",    label: "Studio Info" },
  { value: "packages",       label: "Packages" },
  { value: "backgrounds",    label: "Backgrounds" },
  { value: "addons",         label: "Add-ons" },
  { value: "categories",     label: "Kategori" },
  { value: "vouchers",       label: "Vouchers" },
  { value: "custom-fields",  label: "Custom Fields" },
  { value: "leads",          label: "Leads" },
  { value: "photo-for",      label: "Photo For" },
  { value: "domiciles",      label: "Domisili" },
];

const TabFallback = () => (
  <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
);

export function SettingsClient({ currentUser }: SettingsClientProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi studio dan sistem</p>
      </div>

      <Tabs defaultValue="general">
        {/* Horizontal scrollable tab list for mobile */}
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max h-auto gap-0.5 bg-gray-100 p-1 rounded-lg flex-nowrap">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="whitespace-nowrap text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-maroon-700 data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="mt-4">
          <TabsContent value="general" className="mt-0">
            <TabGeneral currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="reminders" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabReminders currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="studio-info" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabStudioInfo currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="packages" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabPackages currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="backgrounds" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabBackgrounds currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="addons" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabAddons currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabCategories currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="vouchers" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabVouchers currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="custom-fields" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabCustomFields currentUser={currentUser} />
            </Suspense>
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabSimpleCrud
                currentUser={currentUser}
                tableName="leads"
                entityLabel="Lead"
                addLabel="Tambah Lead"
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="photo-for" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabSimpleCrud
                currentUser={currentUser}
                tableName="photo_for"
                entityLabel="Photo For"
                addLabel="Tambah Photo For"
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="domiciles" className="mt-0">
            <Suspense fallback={<TabFallback />}>
              <TabDomiciles currentUser={currentUser} />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
