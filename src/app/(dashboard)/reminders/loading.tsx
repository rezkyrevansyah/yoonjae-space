import { Skeleton } from "@/components/ui/skeleton";

export default function RemindersLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <Skeleton className="h-7 w-28" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />
        ))}
      </div>

      {/* Reminder cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="flex-shrink-0 space-y-1 text-center min-w-[52px]">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-10" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
