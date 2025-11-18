import { NextRequest, NextResponse } from 'next/server';
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '@/lib/employees/service';
import { updateEmployeeSchema } from '@/lib/employees/validation';

/**
 * GET /api/employees/[id] - Получить сотрудника по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getEmployeeById(id);
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
    const body = await request.json();
    
    // Валидация
    const validationResult = updateEmployeeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const employee = await updateEmployee(id, validationResult.data);
    
    return NextResponse.json(employee);
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
    const { id } = await params;
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
