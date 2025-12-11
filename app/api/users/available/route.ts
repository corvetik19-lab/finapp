import { NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

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

    // RLS политики позволяют админу компании видеть всех членов и их профили
    // Получаем всех пользователей компании (company_members)
    const { data: members, error: membersError } = await supabase
      .from('company_members')
      .select('user_id, role, role_id')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching company members:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Получаем profiles для этих пользователей (RLS разрешает админу компании)
    const userIds = (members || []).map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, global_role')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Создаём map profiles по id
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    // Получаем список user_id, которые уже назначены сотрудникам
    const { data: assignedEmployees, error: employeesError } = await supabase
      .from('employees')
      .select('user_id')
      .eq('company_id', companyId)
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

    // Фильтруем: исключаем админов и уже назначенных
    const availableUsers = (members || [])
      .filter((m) => {
        // Исключаем владельцев и админов компании
        if (m.role === 'owner' || m.role === 'admin') return false;
        // Исключаем глобальных админов
        const profile = profilesMap.get(m.user_id);
        if (profile?.global_role === 'admin' || profile?.global_role === 'super_admin') return false;
        // Исключаем уже назначенных сотрудникам
        if (assignedUserIds.has(m.user_id)) return false;
        return true;
      })
      .map((m) => {
        const profile = profilesMap.get(m.user_id);
        return {
          id: m.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || null,
          role_in_company: m.role,
          role_id: m.role_id || null,
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
