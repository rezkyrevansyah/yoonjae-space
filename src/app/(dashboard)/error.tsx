"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <AlertTriangle className="h-12 w-12 text-maroon-700 opacity-70" />
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Terjadi Kesalahan</h2>
        <p className="text-sm text-gray-500 mt-1">Halaman ini mengalami error. Coba muat ulang.</p>
      </div>
      <Button onClick={reset} className="bg-maroon-700 hover:bg-maroon-600">
        Coba Lagi
      </Button>
    </div>
  );
}
