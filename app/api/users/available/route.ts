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

    // Получаем всех пользователей через Admin API (как на странице "Пользователи")
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

    const { data: { users: adminUsers }, error: usersError } = await adminClient.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Получаем профили для global_role (используем adminClient для обхода RLS)
    const { data: profilesData } = await adminClient
      .from('profiles')
      .select('id, global_role');

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

    // Получаем список user_id, которые уже назначены сотрудникам в этой компании
    // Используем adminClient чтобы обойти RLS
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

    // Фильтруем: исключаем super_admin и уже назначенных сотрудникам
    const availableUsers = (adminUsers || [])
      .filter((u) => {
        // Исключаем глобальных super_admin (они не должны быть видны)
        const profile = profilesMap.get(u.id);
        if (profile?.global_role === 'super_admin') return false;
        // Исключаем уже назначенных сотрудникам
        if (assignedUserIds.has(u.id)) return false;
        return true;
      })
      .map((u) => {
        return {
          id: u.id,
          email: u.email || '',
          full_name: u.user_metadata?.full_name || null,
          avatar_url: u.user_metadata?.avatar_url || null,
          role_in_company: 'member',
          role_id: null,
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
