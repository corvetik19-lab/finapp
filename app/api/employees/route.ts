import { NextRequest, NextResponse } from 'next/server';
import {
  getEmployees,
  createEmployee,
  getEmployeesStats,
} from '@/lib/employees/service';
import { createEmployeeSchema } from '@/lib/employees/validation';

/**
 * GET /api/employees - Получить список сотрудников
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('company_id');
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id обязателен' },
        { status: 400 }
      );
    }
    
    // Получаем статистику если запрошено
    if (searchParams.get('stats') === 'true') {
      const stats = await getEmployeesStats(companyId);
      return NextResponse.json(stats);
    }
    
    // Фильтры
    const filters = {
      search: searchParams.get('search') || undefined,
      role: (searchParams.get('role') as 'admin' | 'manager' | 'tender_specialist' | 'accountant' | 'logistics' | 'viewer' | null) || undefined,
      status: (searchParams.get('status') as 'active' | 'inactive' | 'vacation' | 'dismissed' | null) || undefined,
      department: searchParams.get('department') || undefined,
      position: searchParams.get('position') || undefined,
      hire_date_from: searchParams.get('hire_date_from') || undefined,
      hire_date_to: searchParams.get('hire_date_to') || undefined,
    };
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await getEmployees(companyId, filters, page, limit);
    
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
    const body = await request.json();
    
    // Валидация
    const validationResult = createEmployeeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const employee = await createEmployee(validationResult.data);
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при создании сотрудника' },
      { status: 500 }
    );
  }
}
