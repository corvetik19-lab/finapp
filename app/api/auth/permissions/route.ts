import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createRouteClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ permissions: [] }, { status: 401 });
    }

    // Получаем роль пользователя
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role_id, roles(permissions)")
      .eq("user_id", user.id)
      .single();

    let permissions: string[] = [];

    if (userRole && userRole.roles) {
      // @ts-expect-error - Supabase types
      permissions = userRole.roles.permissions || [];
    }

    // Первый созданный пользователь считается администратором
    const { data: allUsers } = await supabase
      .from("user_roles")
      .select("user_id, created_at")
      .order("created_at", { ascending: true })
      .limit(1);

    const isFirstUser = allUsers?.[0]?.user_id === user.id;
    
    if (isFirstUser) {
      permissions = ["admin:all", ...permissions];
    }

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error loading permissions:", error);
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
