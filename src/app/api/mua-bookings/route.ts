import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to params" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, booking_date, start_time, end_time, status,
      customers(name),
      packages(name),
      booking_addons(addons(name))
    `)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .neq("status", "CANCELED")
    .order("booking_date")
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter: booking has MUA add-on OR MUA as main package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const muaBookings = (data ?? []).filter((b: any) => {
    const hasAddonMua = (b.booking_addons ?? []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ba: any) => ba.addons?.name?.toLowerCase().includes("mua")
    );
    const hasPkgMua = b.packages?.name?.toLowerCase().includes("mua");
    return hasAddonMua || hasPkgMua;
  });

  return NextResponse.json(muaBookings);
}
