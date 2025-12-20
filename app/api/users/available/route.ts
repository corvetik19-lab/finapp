import { NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

interface AssignedEmployee {
  user_id: string | null;
}

// GET /api/users/available - получить пользователей, доступных для привязки к сотруднику
export async function GET(request: Request) {
  try {
    const supabase = await createRSCClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    // Получаем Service Key для обхода RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Получаем пользователей ТОЛЬКО этой компании из company_members
    const { data: companyMembers, error: membersError } = await adminClient
      .from('company_members')
      .select('user_id, role')
      .eq('company_id', companyId);

    if (membersError) {
      console.error('Error fetching company members:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Получаем данные пользователей через Admin API
    const { data: { users: adminUsers }, error: usersError } = await adminClient.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Создаём карту пользователей для быстрого доступа
    const usersMap = new Map((adminUsers || []).map(u => [u.id, u]));

    // Создаём Set из user_id членов компании
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const companyMemberIds = new Set((companyMembers || []).map(m => m.user_id));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const companyMembersMap = new Map((companyMembers || []).map(m => [m.user_id, m]));

    // Получаем профили для global_role
    const { data: profilesData } = await adminClient
      .from('profiles')
      .select('id, global_role');

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

    // Получаем роли пользователей из user_roles для этой компании
    const { data: userRolesData } = await adminClient
      .from('user_roles')
      .select('user_id, role_id, roles(id, name, color, description)')
      .eq('company_id', companyId);
    
    const userRolesMap = new Map((userRolesData || []).map(ur => [ur.user_id, ur]));

    // Получаем роль "Администратор" для компании (для админов без записи в user_roles)
    const { data: adminRoleData } = await adminClient
      .from('roles')
      .select('id, name, color, description')
      .eq('company_id', companyId)
      .eq('name', 'Администратор')
      .single();
    
    const adminRole = adminRoleData || { id: null, name: 'Администратор', color: '#667eea', description: 'Полный доступ' };

    // Получаем список user_id, которые уже назначены сотрудникам в этой компании
    const { data: assignedEmployees, error: employeesError } = await adminClient
      .from('employees')
      .select('user_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (employeesError) {
      console.error('Error fetching assigned employees:', employeesError);
      return NextResponse.json({ error: employeesError.message }, { status: 500 });
    }

    const assignedUserIds = new Set(
      (assignedEmployees as AssignedEmployee[] || [])
        .map((e: AssignedEmployee) => e.user_id)
        .filter((id): id is string => id !== null)
    );

    // Получаем organization_id для проверки владельца
    const { data: companyData } = await adminClient
      .from('companies')
      .select('organization_id, organizations!inner(owner_id)')
      .eq('id', companyId)
      .single();
    
    const orgOwnerId = (companyData?.organizations as { owner_id?: string })?.owner_id;

    // Фильтруем: только члены компании, исключаем super_admin (кроме владельца организации) и уже привязанных к сотрудникам
    const availableUsers = (companyMembers || [])
      .filter((m) => {
        const profile = profilesMap.get(m.user_id);
        // Разрешаем супер-админа если он владелец этой организации
        if (profile?.global_role === 'super_admin') {
          if (m.user_id === orgOwnerId) return true; // Владелец может быть добавлен
          return false; // Другие супер-админы скрыты
        }
        // Исключаем уже назначенных сотрудникам
        if (assignedUserIds.has(m.user_id)) return false;
        return true;
      })
      .map((m) => {
        const userData = usersMap.get(m.user_id);
        const userRole = userRolesMap.get(m.user_id);
        // roles может быть объектом или массивом в зависимости от связи
        const rolesRaw = userRole?.roles;
        const roleData = Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw;
        
        // Для админов/владельцев организации используем роль "Администратор" если нет записи в user_roles
        const isOrgAdmin = m.role === 'admin' || m.role === 'owner';
        const effectiveRoleId = userRole?.role_id || (isOrgAdmin ? adminRole?.id : null);
        const effectiveRoleName = roleData?.name || (isOrgAdmin ? adminRole?.name : null);
        const effectiveRoleColor = roleData?.color || (isOrgAdmin ? adminRole?.color : null);
        const effectiveRoleDescription = roleData?.description || (isOrgAdmin ? adminRole?.description : null);
        
        return {
          id: m.user_id,
          email: userData?.email || '',
          full_name: userData?.user_metadata?.full_name || null,
          avatar_url: userData?.user_metadata?.avatar_url || null,
          role_in_company: m.role || 'member',
          role_id: effectiveRoleId,
          role_name: effectiveRoleName,
          role_color: effectiveRoleColor,
          role_description: effectiveRoleDescription,
        };
      });

    return NextResponse.json({ users: availableUsers });
  } catch (error) {
    console.error('Error in GET /api/users/available:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
