import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAIStudioAccessInfo, isSuperAdmin } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";

/**
 * GET - Проверка доступа к AI Studio
 */
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { hasAccess: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const accessInfo = await getAIStudioAccessInfo(user.id, user.email);
    
    // Получаем роль пользователя и права
    let userRole: {
      id: string;
      name: string;
      color: string;
      permissions: string[];
      allowed_modes: string[];
    } | null = null;
    let isAdmin = false;
    
    // Супер-админ всегда админ
    if (isSuperAdmin(user.email)) {
      isAdmin = true;
      userRole = {
        id: 'super_admin',
        name: 'Супер-админ',
        color: '#ef4444',
        permissions: ['*'],
        allowed_modes: ['*'],
      };
    } else {
      // Получаем роль из company_members
      const adminClient = createAdminClient();
      
      const { data: memberData } = await adminClient
        .from('company_members')
        .select(`
          role,
          role_id,
          roles (
            id,
            name,
            color,
            permissions,
            allowed_modes
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (memberData) {
        isAdmin = memberData.role === 'admin' || memberData.role === 'owner';
        
        if (memberData.roles) {
          const rolesData = memberData.roles as {
            id: string;
            name: string;
            color: string;
            permissions: string[];
            allowed_modes: string[];
          } | {
            id: string;
            name: string;
            color: string;
            permissions: string[];
            allowed_modes: string[];
          }[] | null;
          const role = Array.isArray(rolesData) ? rolesData[0] : rolesData;
          if (role) {
            userRole = {
              id: role.id,
              name: role.name,
              color: role.color || '#6366f1',
              permissions: role.permissions || [],
              allowed_modes: role.allowed_modes || [],
            };
          
            // Проверяем права админа в permissions
            if (role.permissions?.includes('admin:*') || 
                role.permissions?.includes('settings:*') ||
                role.permissions?.includes('employees:*')) {
              isAdmin = true;
            }
          }
        }
      }
      
      // Проверяем global_role в profiles
      const { data: profile } = await adminClient
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();
      
      if (profile?.global_role === 'admin' || profile?.global_role === 'super_admin') {
        isAdmin = true;
      }
    }

    return NextResponse.json({
      ...accessInfo,
      isAdmin,
      userRole,
    });
  } catch (error) {
    console.error("AI Studio access check error:", error);
    return NextResponse.json(
      { hasAccess: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
