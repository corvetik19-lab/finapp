import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Проверяем что тип существует и не является системным
    const { data: existingType, error: fetchError } = await supabase
      .from('tender_types')
      .select('id, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !existingType) {
      return NextResponse.json(
        { error: 'Type not found' },
        { status: 404 }
      );
    }

    // Обновляем тип
    const updateData: Record<string, string | null> = {};

    // Для системных типов нельзя менять название
    if (!existingType.is_system) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const { data: type, error } = await supabase
      .from('tender_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tender type:', error);
      return NextResponse.json(
        { error: 'Failed to update tender type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: type,
      message: 'Tender type updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/tenders/types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Проверяем что тип не является системным
    const { data: existingType, error: fetchError } = await supabase
      .from('tender_types')
      .select('id, is_system, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingType) {
      return NextResponse.json(
        { error: 'Type not found' },
        { status: 404 }
      );
    }

    if (existingType.is_system) {
      return NextResponse.json(
        { error: `Системный тип "${existingType.name}" нельзя удалить` },
        { status: 403 }
      );
    }

    // Удаляем тип
    const { error } = await supabase
      .from('tender_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tender type:', error);
      return NextResponse.json(
        { error: 'Failed to delete tender type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tender type deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/types/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
