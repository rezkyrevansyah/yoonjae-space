import { Skeleton } from "@/components/ui/skeleton";

export default function ActivitiesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Activity list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-24 flex-shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
