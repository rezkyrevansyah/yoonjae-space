import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center">
              <Skeleton className="h-3 w-6 mx-auto" />
            </div>
          ))}
        </div>
        {/* Weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-gray-50">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="min-h-[80px] p-2 border-r border-gray-50 space-y-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                {(week * 7 + day) % 3 !== 2 && <Skeleton className="h-5 w-full rounded" />}
                {(week * 7 + day) % 5 === 0 && <Skeleton className="h-5 w-full rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
