import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getEmployees,
  createEmployee,
  getEmployeesStats,
} from '@/lib/employees/service';
import { createEmployeeSchema } from '@/lib/employees/validation';
import { EmployeeRole, EmployeeStatus } from '@/lib/employees/types';

// Helper to check permissions
async function checkPermissions(supabase: SupabaseClient, requestedCompanyId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 };

  // 1. Check global role
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  if (profile?.global_role === 'super_admin' || profile?.global_role === 'admin') {
    return { user, isGlobalAdmin: true };
  }

  // 2. If not global admin, check company membership and role
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!member) {
    return { error: 'Пользователь не привязан к компании', status: 403 };
  }

  // If requesting specific company, it must match
  if (requestedCompanyId && requestedCompanyId !== member.company_id) {
    return { error: 'Нет доступа к этой компании', status: 403 };
  }

  // Must be admin of the company to manage employees
  if (member.role !== 'admin') {
    return { error: 'Недостаточно прав (требуется роль администратора компании)', status: 403 };
  }

  return { user, member, isGlobalAdmin: false };
}

/**
 * GET /api/employees - Получить список сотрудников
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const searchParams = request.nextUrl.searchParams;
    const requestedCompanyId = searchParams.get('company_id');
    
    if (!requestedCompanyId) {
      return NextResponse.json(
        { error: 'company_id обязателен' },
        { status: 400 }
      );
    }

    // Check permissions
    const perm = await checkPermissions(supabase, requestedCompanyId);
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }
    
    // Получаем статистику если запрошено
    if (searchParams.get('stats') === 'true') {
      const stats = await getEmployeesStats(requestedCompanyId);
      return NextResponse.json(stats);
    }
    
    // Фильтры
    const filters = {
      search: searchParams.get('search') || undefined,
      role: (searchParams.get('role') as EmployeeRole) || undefined,
      status: (searchParams.get('status') as EmployeeStatus) || undefined,
      department: searchParams.get('department') || undefined,
      position: searchParams.get('position') || undefined,
      hire_date_from: searchParams.get('hire_date_from') || undefined,
      hire_date_to: searchParams.get('hire_date_to') || undefined,
    };
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await getEmployees(requestedCompanyId, filters, page, limit);
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/employees:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении сотрудников' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees - Создать нового сотрудника
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const body = await request.json();
    
    // Валидация
    const validationResult = createEmployeeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    // Check permissions
    // For POST, validationResult.data.company_id is what we want to check against
    const perm = await checkPermissions(supabase, validationResult.data.company_id);
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    // If not global admin, force company_id to prevent spoofing (though checkPermissions already checks match)
    const dataToCreate = { ...validationResult.data };
    if (!perm.isGlobalAdmin && perm.member) {
      dataToCreate.company_id = perm.member.company_id;
    }
    
    const employee = await createEmployee(dataToCreate);
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при создании сотрудника' },
      { status: 500 }
    );
  }
}
