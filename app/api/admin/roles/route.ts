import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createRouteClient();
  
  // Проверяем авторизацию
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Проверяем что пользователь - super_admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();
  
  if (profile?.global_role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const { roles } = await request.json();
    
    // Обновляем каждую роль
    for (const role of roles) {
      const { error } = await supabase
        .from("role_configs")
        .update({
          allowed_modules: role.allowed_modules,
          is_active: role.is_active,
        })
        .eq("id", role.id);
      
      if (error) {
        console.error("Error updating role:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating roles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
