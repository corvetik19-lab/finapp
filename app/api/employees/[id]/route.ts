import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '@/lib/employees/service';
import { updateEmployeeSchema } from '@/lib/employees/validation';

// Helper to check permissions (Same logic as in main route)
async function checkPermissions(supabase: SupabaseClient, targetCompanyId: string) {
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

  // The target resource must belong to the user's company
  if (targetCompanyId !== member.company_id) {
    return { error: 'Нет доступа к сотруднику другой компании', status: 403 };
  }

  // Must be admin of the company to manage employees (except maybe viewing self? for now stick to admin)
  if (member.role !== 'admin') {
    return { error: 'Недостаточно прав (требуется роль администратора компании)', status: 403 };
  }

  return { user, member, isGlobalAdmin: false };
}

/**
 * GET /api/employees/[id] - Получить сотрудника по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id } = await params;
    
    const employee = await getEmployeeById(id);
    if (!employee) {
       return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Check permissions
    const perm = await checkPermissions(supabase, employee.company_id);
    // Allow viewing if it's the user themselves? (Optional improvement later)
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error in GET /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Сотрудник не найден' },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/employees/[id] - Обновить данные сотрудника
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createRouteClient();
    const body = await request.json();
    
    // 1. Check existence and ownership first
    const employee = await getEmployeeById(id);
    if (!employee) {
       return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    const perm = await checkPermissions(supabase, employee.company_id);
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }
    
    // 2. Validation
    const validationResult = updateEmployeeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const updatedEmployee = await updateEmployee(id, validationResult.data);
    
    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error in PATCH /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении сотрудника' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/[id] - Удалить сотрудника
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id } = await params;

    // 1. Check existence and ownership
    const employee = await getEmployeeById(id);
    if (!employee) {
       return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    const perm = await checkPermissions(supabase, employee.company_id);
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    await deleteEmployee(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении сотрудника' },
      { status: 500 }
    );
  }
}
