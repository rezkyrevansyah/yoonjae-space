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
  const { name, email, phone, password, role_id, is_active } = body;

  if (!name || !email || !password || !role_id) {
    return NextResponse.json({ error: "Field wajib tidak lengkap." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password minimal 8 karakter." },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Format email tidak valid." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message.toLowerCase().includes("already")
      ? "Email sudah terdaftar."
      : authError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Insert into users table
  const { data: newUser, error: dbError } = await admin
    .from("users")
    .insert({
      auth_id: authData.user.id,
      name,
      email,
      phone: phone || null,
      role_id,
      is_active: is_active ?? true,
      is_primary: false,
    })
    .select("id, auth_id, name, email, phone, role_id, is_active, is_primary, created_at, roles(id, name)")
    .single();

  if (dbError) {
    // Rollback: delete the auth user we just created
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Activity log
  await supabase.from("activity_log").insert({
    user_id: callerData?.id ?? null,
    user_name: callerData?.name ?? "System",
    user_role: callerRole?.name ?? null,
    action: "create_user",
    entity: "users",
    entity_id: newUser.id,
    description: `Created user: ${name} (${email})`,
  });

  return NextResponse.json({ user: newUser });
}
