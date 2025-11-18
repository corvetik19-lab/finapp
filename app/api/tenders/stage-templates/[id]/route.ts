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
    const { name, description, icon, is_active, stage_ids } = body;

    // Проверяем что шаблон существует и не является системным
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('tender_stage_templates')
      .select('id, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Обновляем шаблон
    const updateData: Record<string, string | boolean> = {};

    // Для системных шаблонов нельзя менять название
    if (!existingTemplate.is_system) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) updateData.description = description?.trim() || '';
    if (icon !== undefined) updateData.icon = icon || '📋';

    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error: updateError } = await supabase
      .from('tender_stage_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    // Обновляем этапы если указаны
    if (stage_ids && Array.isArray(stage_ids)) {
      // Удаляем существующие связи
      await supabase
        .from('tender_stage_template_items')
        .delete()
        .eq('template_id', id);

      // Создаем новые связи
      if (stage_ids.length > 0) {
        const items = stage_ids.map((stage_id: string, index: number) => ({
          template_id: id,
          stage_id,
          order_index: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('tender_stage_template_items')
          .insert(items);

        if (itemsError) {
          console.error('Error updating template items:', itemsError);
          return NextResponse.json(
            { error: 'Failed to update template items' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/tenders/stage-templates/[id]:', error);
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

    // Проверяем что шаблон не является системным
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('tender_stage_templates')
      .select('id, is_system, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: `Системный шаблон "${existingTemplate.name}" нельзя удалить` },
        { status: 403 }
      );
    }

    // Удаляем шаблон (связи удалятся автоматически через CASCADE)
    const { error } = await supabase
      .from('tender_stage_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/stage-templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
