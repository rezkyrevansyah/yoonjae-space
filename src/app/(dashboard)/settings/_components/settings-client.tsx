"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TabGeneral } from "./tab-general";
import { TabReminders } from "./tab-reminders";
import { TabStudioInfo } from "./tab-studio-info";
import { TabPackages } from "./tab-packages";
import { TabBackgrounds } from "./tab-backgrounds";
import { TabAddons } from "./tab-addons";
import { TabVouchers } from "./tab-vouchers";
import { TabCustomFields } from "./tab-custom-fields";
import { TabSimpleCrud } from "./tab-simple-crud";
import { TabCategories } from "./tab-categories";
import { TabDomiciles } from "./tab-domiciles";
import type { CurrentUser } from "@/lib/types/database";

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
            <TabReminders currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="studio-info" className="mt-0">
            <TabStudioInfo currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="packages" className="mt-0">
            <TabPackages currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="backgrounds" className="mt-0">
            <TabBackgrounds currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="addons" className="mt-0">
            <TabAddons currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <TabCategories currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="vouchers" className="mt-0">
            <TabVouchers currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="custom-fields" className="mt-0">
            <TabCustomFields currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <TabSimpleCrud
              currentUser={currentUser}
              tableName="leads"
              entityLabel="Lead"
              addLabel="Tambah Lead"
            />
          </TabsContent>

          <TabsContent value="photo-for" className="mt-0">
            <TabSimpleCrud
              currentUser={currentUser}
              tableName="photo_for"
              entityLabel="Photo For"
              addLabel="Tambah Photo For"
            />
          </TabsContent>

          <TabsContent value="domiciles" className="mt-0">
            <TabDomiciles currentUser={currentUser} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
