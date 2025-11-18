import { NextRequest, NextResponse } from 'next/server';
import {
  getTenderById,
  updateTender,
  deleteTender,
} from '@/lib/tenders/service';
import type { UpdateTenderInput } from '@/lib/tenders/types';
import { createRSCClient } from '@/lib/supabase/server';

/**
 * GET /api/tenders/[id]
 * Получить тендер по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getTenderById(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Тендер не найден' }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tenders/[id]
 * Обновить тендер
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Фильтруем только переданные поля (не undefined)
    const input: UpdateTenderInput = {};
    
    if (body.project_name !== undefined) input.project_name = body.project_name;
    if (body.subject !== undefined) input.subject = body.subject;
    if (body.method !== undefined) input.method = body.method;
    if (body.type_id !== undefined) input.type_id = body.type_id;
    if (body.customer !== undefined) input.customer = body.customer;
    if (body.city !== undefined) input.city = body.city;
    if (body.platform !== undefined) input.platform = body.platform;
    if (body.nmck !== undefined) input.nmck = body.nmck;
    if (body.our_price !== undefined) input.our_price = body.our_price;
    if (body.contract_price !== undefined) input.contract_price = body.contract_price;
    if (body.application_security !== undefined) input.application_security = body.application_security;
    if (body.contract_security !== undefined) input.contract_security = body.contract_security;
    if (body.submission_deadline !== undefined) input.submission_deadline = body.submission_deadline;
    if (body.auction_date !== undefined) input.auction_date = body.auction_date;
    if (body.results_date !== undefined) input.results_date = body.results_date;
    if (body.review_date !== undefined) input.review_date = body.review_date;
    if (body.manager_id !== undefined) input.manager_id = body.manager_id;
    if (body.specialist_id !== undefined) input.specialist_id = body.specialist_id;
    if (body.investor_id !== undefined) input.investor_id = body.investor_id;
    if (body.executor_id !== undefined) input.executor_id = body.executor_id;
    if (body.stage_id !== undefined) input.stage_id = body.stage_id;
    if (body.status !== undefined) input.status = body.status;
    if (body.comment !== undefined) input.comment = body.comment;
    if (body.tags !== undefined) input.tags = body.tags;
    if (body.metadata !== undefined) input.metadata = body.metadata;
    if (body.winner_inn !== undefined) input.winner_inn = body.winner_inn;
    if (body.winner_name !== undefined) input.winner_name = body.winner_name;
    if (body.winner_price !== undefined) input.winner_price = body.winner_price;

    // Если изменился шаблон, автоматически переключаем на первый этап этого шаблона
    if (body.template_id !== undefined) {
      const supabase = await createRSCClient();

      if (body.template_id === 'system') {
        // Для системного шаблона не сохраняем template_id, ищем первый системный этап
        input.template_id = null;
        
        const { data: firstStage } = await supabase
          .from('tender_stages')
          .select('id')
          .eq('category', 'tender_dept')
          .eq('is_system', true)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstStage) {
          input.stage_id = firstStage.id;
        }
      } else if (body.template_id) {
        // Для конкретного шаблона сохраняем его ID и ищем первый этап
        input.template_id = body.template_id;
        
        const { data: templateStage } = await supabase
          .from('tender_stage_template_items')
          .select('stage_id')
          .eq('template_id', body.template_id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (templateStage) {
          input.stage_id = templateStage.stage_id;
        }
      } else {
        // Если template_id пустой, сбрасываем
        input.template_id = null;
      }
    }

    const result = await updateTender(id, input);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const supabase = await createRSCClient();

    // Если переданы responsible_ids, обновляем связи
    if (body.responsible_ids !== undefined && Array.isArray(body.responsible_ids)) {
      // Удаляем старые связи
      await supabase
        .from('tender_responsible')
        .delete()
        .eq('tender_id', id);
      
      // Добавляем новые связи
      if (body.responsible_ids.length > 0) {
        const responsibleRecords = body.responsible_ids.map((employeeId: string) => ({
          tender_id: id,
          employee_id: employeeId,
        }));
        
        await supabase
          .from('tender_responsible')
          .insert(responsibleRecords);
      }
    }

    // Если изменился этап, проверяем архивный ли он
    if (body.stage_id !== undefined) {
      // Список архивных этапов
      const ARCHIVED_STAGE_NAMES = [
        'Не участвуем',
        'Не прошло проверку',
        'Не подано',
        'Проиграли',
        'Договор не заключен',
      ];

      // Получаем информацию об этапе
      const { data: stage } = await supabase
        .from('tender_stages')
        .select('name')
        .eq('id', body.stage_id)
        .single();

      // Если этап архивный, удаляем комментарии и задачи
      if (stage && ARCHIVED_STAGE_NAMES.includes(stage.name)) {
        console.log(`Tender ${id} moved to archived stage "${stage.name}". Cleaning up comments and tasks...`);

        // Удаляем комментарии к задачам
        const { data: tasks } = await supabase
          .from('tender_tasks')
          .select('id')
          .eq('tender_id', id);

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id);
          await supabase
            .from('tender_task_comments')
            .delete()
            .in('task_id', taskIds);
        }

        // Удаляем задачи
        await supabase
          .from('tender_tasks')
          .delete()
          .eq('tender_id', id);

        // Удаляем вложения комментариев
        const { data: comments } = await supabase
          .from('tender_comments')
          .select('id')
          .eq('tender_id', id);

        if (comments && comments.length > 0) {
          const commentIds = comments.map(c => c.id);
          await supabase
            .from('tender_comment_attachments')
            .delete()
            .in('comment_id', commentIds);
        }

        // Удаляем комментарии к тендеру
        await supabase
          .from('tender_comments')
          .delete()
          .eq('tender_id', id);

        console.log(`Cleanup completed for tender ${id}`);
      }
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in PATCH /api/tenders/[id]:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenders/[id]
 * Удалить тендер (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteTender(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/[id]:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
