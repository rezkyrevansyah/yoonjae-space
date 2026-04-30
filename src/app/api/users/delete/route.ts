import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  // Verify caller is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller has user-management permission
  const { data: callerData } = await supabase
    .from("users")
    .select("id, name, is_primary, roles(name, menu_access)")
    .eq("auth_id", user.id)
    .single();
  const callerRolesData = callerData?.roles as unknown;
  const callerRole = (Array.isArray(callerRolesData) ? callerRolesData[0] : callerRolesData) as { name: string; menu_access: string[] } | null;
  const hasPermission = callerData?.is_primary || callerRole?.menu_access?.includes("user-management");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body; // users.id (not auth_id)

  if (!userId) {
    return NextResponse.json({ error: "userId wajib." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get user info
  const { data: targetUser, error: fetchError } = await admin
    .from("users")
    .select("id, auth_id, name, email, is_primary")
    .eq("id", userId)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  if (targetUser.is_primary) {
    return NextResponse.json({ error: "User utama tidak bisa dihapus." }, { status: 403 });
  }

  // Revoke login first so the deleted user can no longer authenticate,
  // even if the subsequent users-table delete fails (e.g. FK references from
  // bookings/commissions/activity_log).
  if (targetUser.auth_id) {
    const { error: authDelErr } = await admin.auth.admin.deleteUser(targetUser.auth_id);
    if (authDelErr) {
      return NextResponse.json({ error: `Gagal hapus auth user: ${authDelErr.message}` }, { status: 500 });
    }
  }

  // Then delete the profile row. May fail with FK violation if the user has
  // historical bookings/commissions — in that case auth is already revoked
  // (login blocked) so we surface the error but don't try to roll back.
  const { error: dbError } = await admin.from("users").delete().eq("id", userId);
  if (dbError) {
    return NextResponse.json(
      { error: `Auth dihapus, tapi gagal hapus profil user: ${dbError.message}. Hubungi admin DB.` },
      { status: 500 }
    );
  }

  // Activity log
  await supabase.from("activity_log").insert({
    user_id: callerData?.id ?? null,
    user_name: callerData?.name ?? "System",
    user_role: callerRole?.name ?? null,
    action: "delete_user",
    entity: "users",
    entity_id: userId,
    description: `Deleted user: ${targetUser.name} (${targetUser.email})`,
  });

  return NextResponse.json({ success: true });
}
