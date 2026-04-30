import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 90;

function diffDays(fromIso: string, toIso: string): number {
  const f = Date.UTC(
    parseInt(fromIso.slice(0, 4)),
    parseInt(fromIso.slice(5, 7)) - 1,
    parseInt(fromIso.slice(8, 10))
  );
  const t = Date.UTC(
    parseInt(toIso.slice(0, 4)),
    parseInt(toIso.slice(5, 7)) - 1,
    parseInt(toIso.slice(8, 10))
  );
  return Math.round((t - f) / (1000 * 60 * 60 * 24));
}

interface MuaBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  packages: { name: string; is_mua: boolean } | null;
  booking_addons:
    | { addons: { name: string; is_mua: boolean } | null }[]
    | null;
}

/**
 * Public endpoint for the /mua schedule.
 *
 * Returns ONLY availability slots — no customer name, no booking number,
 * no package name when it's not the MUA driver. Filtered server-side via
 * the is_mua flag (added in migration 20260430000000_add_is_mua_flag.sql)
 * so we don't string-match in JS.
 *
 * Range capped at 90 days to prevent scraping a full year in one request.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !isoDate.test(from) || !isoDate.test(to)) {
    return NextResponse.json({ error: "Invalid from/to params" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "from must be ≤ to" }, { status: 400 });
  }
  if (diffDays(from, to) > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Range exceeds ${MAX_RANGE_DAYS} days` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, booking_date, start_time, end_time,
       packages(name, is_mua),
       booking_addons(addons(name, is_mua))`
    )
    .gte("booking_date", from)
    .lte("booking_date", to)
    .neq("status", "CANCELED")
    .order("booking_date")
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const slots = ((data ?? []) as unknown as MuaBookingRow[]).flatMap((b) => {
    const muaAddons = (b.booking_addons ?? [])
      .map((ba) => ba.addons)
      .filter((a): a is { name: string; is_mua: boolean } => !!a && a.is_mua);

    const pkgIsMua = b.packages?.is_mua === true;

    if (!pkgIsMua && muaAddons.length === 0) return [];

    // Pick a non-PII service label: MUA addon name first, else MUA package name.
    const muaService = muaAddons[0]?.name ?? (pkgIsMua ? b.packages?.name : null) ?? null;

    return [
      {
        id: b.id,
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        mua_service: muaService,
      },
    ];
  });

  return NextResponse.json(slots);
}
