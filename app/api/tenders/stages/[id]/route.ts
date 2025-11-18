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
    const { name, color, is_final, category, order_index, is_active, is_hidden } = body;

    // Проверяем что этап существует и принадлежит компании пользователя
    const { data: existingStage, error: fetchError } = await supabase
      .from('tender_stages')
      .select('id, company_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingStage) {
      console.error('Stage not found or access denied:', fetchError);
      return NextResponse.json(
        { error: 'Stage not found or access denied' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: Record<string, string | number | boolean> = {};

    // Добавляем поля только если они переданы
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (color !== undefined) updateData.color = color;
    if (is_final !== undefined) updateData.is_final = is_final;
    if (category !== undefined) updateData.category = category;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_hidden !== undefined) updateData.is_hidden = is_hidden;

    // Проверяем что есть хотя бы одно поле для обновления
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Обновляем этап
    console.log('Updating tender stage:', id, 'with data:', updateData);
    
    const { data: stage, error } = await supabase
      .from('tender_stages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tender stage:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to update tender stage', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: stage,
      message: 'Tender stage updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/tenders/stages/[id]:', error);
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

    // Удаляем этап
    const { error } = await supabase
      .from('tender_stages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tender stage:', error);
      return NextResponse.json(
        { error: 'Failed to delete tender stage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Tender stage deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/stages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
