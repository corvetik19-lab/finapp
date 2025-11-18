'use server';

import { createRouteClient } from '@/lib/supabase/server';
import type {
  Tender,
  CreateTenderInput,
  UpdateTenderInput,
  TenderListParams,
  TenderStats,
  TenderStage,
  TenderType,
} from './types';

// ============================================================
// CRUD ОПЕРАЦИИ ДЛЯ ТЕНДЕРОВ
// ============================================================

/**
 * Получить список тендеров компании с фильтрами
 */
export async function getTenders(
  companyId: string,
  params: TenderListParams = {}
): Promise<{ data: Tender[]; total: number; error: string | null }> {
  try {
    const supabase = await createRouteClient();
    const {
      filters = {},
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = params;

    let query = supabase
      .from('tenders')
      .select(`
        *,
        manager:employees!tenders_manager_id_fkey(id, full_name, role),
        specialist:employees!tenders_specialist_id_fkey(id, full_name, role),
        investor:employees!tenders_investor_id_fkey(id, full_name, role),
        executor:employees!tenders_executor_id_fkey(id, full_name, role),
        stage:tender_stages(id, name, category, color),
        type:tender_types(id, name),
        responsible:tender_responsible(employee:employees(id, full_name, role)),
        tender_comments(count)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    // Применяем фильтры
    if (filters.search) {
      query = query.or(
        `purchase_number.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,customer.ilike.%${filters.search}%`
      );
    }

    if (filters.purchase_number) {
      query = query.eq('purchase_number', filters.purchase_number);
    }

    if (filters.stage_id) {
      query = query.eq('stage_id', filters.stage_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type_id) {
      query = query.eq('type_id', filters.type_id);
    }

    if (filters.template_id) {
      query = query.eq('template_id', filters.template_id);
    }

    if (filters.manager_id) {
      query = query.eq('manager_id', filters.manager_id);
    }

    if (filters.specialist_id) {
      query = query.eq('specialist_id', filters.specialist_id);
    }

    if (filters.investor_id) {
      query = query.eq('investor_id', filters.investor_id);
    }

    if (filters.executor_id) {
      query = query.eq('executor_id', filters.executor_id);
    }

    if (filters.date_from) {
      query = query.gte('submission_deadline', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('submission_deadline', filters.date_to);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    // Сортировка
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Пагинация
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tenders:', error);
      return { data: [], total: 0, error: error.message };
    }

    // Временный тип для обработки ответа с count
    type RawTenderWithCount = Tender & {
      tender_comments?: { count: number }[] | null;
    };

    const tenders = (data as unknown as RawTenderWithCount[]).map((t) => {
      const commentsCount = t.tender_comments?.[0]?.count ?? 0;
      
      // Создаем копию и удаляем временное поле
      const tender = { ...t };
      delete tender.tender_comments;
      
      return {
        ...tender,
        comments_count: commentsCount,
      };
    });

    return { data: tenders as Tender[], total: count || 0, error: null };
  } catch (error) {
    console.error('Error in getTenders:', error);
    return { data: [], total: 0, error: 'Ошибка при загрузке тендеров' };
  }
}

/**
 * Получить один тендер по ID
 */
export async function getTenderById(
  tenderId: string
): Promise<{ data: Tender | null; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from('tenders')
      .select(
        `
        *,
        manager:employees!tenders_manager_id_fkey(id, full_name, role),
        specialist:employees!tenders_specialist_id_fkey(id, full_name, role),
        investor:employees!tenders_investor_id_fkey(id, full_name, role),
        executor:employees!tenders_executor_id_fkey(id, full_name, role),
        stage:tender_stages(*),
        type:tender_types(*),
        responsible:tender_responsible(employee:employees(id, full_name, role))
      `
      )
      .eq('id', tenderId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching tender:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in getTenderById:', error);
    return { data: null, error: 'Ошибка при загрузке тендера' };
  }
}

/**
 * Создать новый тендер
 */
export async function createTender(
  input: CreateTenderInput
): Promise<{ data: Tender | null; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    // Получаем текущего пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Пользователь не авторизован' };
    }

    // Проверяем уникальность номера закупки в рамках компании
    const { data: existingTender, error: checkError } = await supabase
      .from('tenders')
      .select('id, purchase_number')
      .eq('company_id', input.company_id)
      .eq('purchase_number', input.purchase_number)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking tender uniqueness:', checkError);
      return { data: null, error: 'Ошибка при проверке уникальности номера' };
    }

    if (existingTender) {
      return { 
        data: null, 
        error: `Тендер с номером "${input.purchase_number}" уже существует в системе` 
      };
    }

    // Определяем stage_id автоматически, если не указан
    let stageId = input.stage_id;
    if (!stageId) {
      // Если указан template_id, берём первый этап из шаблона
      if (input.template_id && input.template_id !== 'system') {
        const { data: templateStages } = await supabase
          .from('tender_stage_template_items')
          .select('stage_id, order_index')
          .eq('template_id', input.template_id)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (templateStages) {
          stageId = templateStages.stage_id;
        }
      }
      
      // Если stage_id всё ещё не определён, берём первый системный этап
      if (!stageId) {
        const { data: firstStage } = await supabase
          .from('tender_stages')
          .select('id')
          .eq('category', 'tender_dept')
          .eq('is_system', true)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstStage) {
          stageId = firstStage.id;
        }
      }
    }

    const { data, error } = await supabase
      .from('tenders')
      .insert({
        ...input,
        stage_id: stageId,
        created_by: user.id,
      })
      .select(
        `
        *,
        stage:tender_stages(*),
        type:tender_types(*)
      `
      )
      .single();

    if (error) {
      console.error('Error creating tender:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in createTender:', error);
    return { data: null, error: 'Ошибка при создании тендера' };
  }
}

/**
 * Обновить тендер
 */
export async function updateTender(
  tenderId: string,
  input: UpdateTenderInput
): Promise<{ data: Tender | null; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from('tenders')
      .update(input)
      .eq('id', tenderId)
      .select(
        `
        *,
        stage:tender_stages(*),
        type:tender_types(*)
      `
      )
      .single();

    if (error) {
      console.error('Error updating tender:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in updateTender:', error);
    return { data: null, error: 'Ошибка при обновлении тендера' };
  }
}

/**
 * Удалить тендер (soft delete)
 */
export async function deleteTender(
  tenderId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from('tenders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', tenderId);

    if (error) {
      console.error('Error deleting tender:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deleteTender:', error);
    return { success: false, error: 'Ошибка при удалении тендера' };
  }
}

/**
 * Изменить этап тендера
 */
export async function updateTenderStage(
  tenderId: string,
  newStageId: string,
  comment?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    // Обновляем этап (триггер автоматически создаст запись в истории)
    const { error } = await supabase
      .from('tenders')
      .update({ stage_id: newStageId })
      .eq('id', tenderId);

    if (error) {
      console.error('Error updating tender stage:', error);
      return { success: false, error: error.message };
    }

    // Если есть комментарий, обновляем последнюю запись в истории
    if (comment) {
      const { error: historyError } = await supabase
        .from('tender_stage_history')
        .update({ comment })
        .eq('tender_id', tenderId)
        .eq('to_stage_id', newStageId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (historyError) {
        console.error('Error updating history comment:', historyError);
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in updateTenderStage:', error);
    return { success: false, error: 'Ошибка при изменении этапа' };
  }
}

// ============================================================
// ЭТАПЫ И ТИПЫ
// ============================================================

/**
 * Получить все этапы тендеров
 */
export async function getTenderStages(
  companyId: string | null = null
): Promise<{ data: TenderStage[]; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    let query = supabase
      .from('tender_stages')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('order_index');

    // Получаем только этапы компании (системных этапов больше нет)
    if (companyId) {
      query = query.eq('company_id', companyId);
    } else {
      // Если нет companyId, возвращаем пустой массив
      return { data: [], error: null };
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tender stages:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error in getTenderStages:', error);
    return { data: [], error: 'Ошибка при загрузке этапов' };
  }
}

/**
 * Получить все типы тендеров компании
 */
export async function getTenderTypes(
  companyId: string | null = null
): Promise<{ data: TenderType[]; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    let query = supabase
      .from('tender_types')
      .select(`
        *,
        tender_type_methods(
          procurement_method:procurement_methods(*)
        )
      `)
      .order('name');

    // Получаем системные типы (company_id = null) и типы компании
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    } else {
      // Если нет companyId, возвращаем только системные типы
      query = query.is('company_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tender types:', error);
      return { data: [], error: error.message };
    }

    // Преобразуем данные: извлекаем методы из связующей таблицы
    const typesWithMethods = (data || []).map((type: Record<string, unknown>) => {
      const methods = ((type.tender_type_methods as Array<Record<string, unknown>>) || [])
        .map((ttm: Record<string, unknown>) => ttm.procurement_method)
        .filter((m: unknown) => m && typeof m === 'object' && (m as Record<string, unknown>).is_active);
      
      return {
        ...type,
        methods,
        tender_type_methods: undefined, // Убираем промежуточные данные
      } as unknown as TenderType;
    });

    return { data: typesWithMethods, error: null };
  } catch (error) {
    console.error('Error in getTenderTypes:', error);
    return { data: [], error: 'Ошибка при загрузке типов' };
  }
}

// ============================================================
// СТАТИСТИКА
// ============================================================

/**
 * Получить статистику по тендерам компании
 */
export async function getTenderStats(
  companyId: string
): Promise<{ data: TenderStats | null; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    const { data, error } = await supabase.rpc('get_company_tender_stats', {
      p_company_id: companyId,
    });

    if (error) {
      console.error('Error fetching tender stats:', error);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        data: {
          total_count: 0,
          active_count: 0,
          won_count: 0,
          lost_count: 0,
          total_nmck: 0,
          total_contract_price: 0,
          avg_nmck: 0,
          conversion_rate: 0,
        },
        error: null,
      };
    }

    const stats = data[0];
    const conversionRate =
      stats.active_count > 0
        ? (stats.won_count / stats.active_count) * 100
        : 0;
    const avgNmck =
      stats.total_count > 0 ? stats.total_nmck / stats.total_count : 0;

    return {
      data: {
        ...stats,
        avg_nmck: avgNmck,
        conversion_rate: conversionRate,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getTenderStats:', error);
    return { data: null, error: 'Ошибка при загрузке статистики' };
  }
}

/**
 * Получить тендеры, сгруппированные по этапам (для Kanban)
 */
export async function getTendersByStage(
  companyId: string,
  category: 'tender_dept' | 'realization' | 'archive' = 'tender_dept'
): Promise<{
  data: Record<string, Tender[]>;
  stages: TenderStage[];
  error: string | null;
}> {
  try {
    const supabase = await createRouteClient();

    // Получаем этапы нужной категории
    const { data: stages, error: stagesError } = await supabase
      .from('tender_stages')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .order('order_index');

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
      return { data: {}, stages: [], error: stagesError.message };
    }

    // Получаем тендеры
    const { data: tenders, error: tendersError } = await supabase
      .from('tenders')
      .select(
        `
        *,
        stage:tender_stages(*),
        type:tender_types(*),
        manager:profiles!tenders_manager_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in(
        'stage_id',
        stages?.map((s) => s.id) || []
      )
      .order('created_at', { ascending: false });

    if (tendersError) {
      console.error('Error fetching tenders:', tendersError);
      return { data: {}, stages: stages || [], error: tendersError.message };
    }

    // Группируем тендеры по этапам
    const grouped: Record<string, Tender[]> = {};
    stages?.forEach((stage: TenderStage) => {
      grouped[stage.id] = tenders?.filter((t: Tender) => t.stage_id === stage.id) || [];
    });

    return { data: grouped, stages: stages || [], error: null };
  } catch (error) {
    console.error('Error in getTendersByStage:', error);
    return { data: {}, stages: [], error: 'Ошибка при загрузке тендеров' };
  }
}

// ============================================================
// ИСТОРИЯ
// ============================================================

/**
 * Получить историю переходов тендера
 */
export async function getTenderHistory(tenderId: string) {
  try {
    const supabase = await createRouteClient();

    const { data, error } = await supabase
      .from('tender_stage_history')
      .select(
        `
        *,
        from_stage:tender_stages!tender_stage_history_from_stage_id_fkey(*),
        to_stage:tender_stages!tender_stage_history_to_stage_id_fkey(*),
        changed_by_user:profiles!tender_stage_history_changed_by_fkey(id, full_name, avatar_url)
      `
      )
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tender history:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error in getTenderHistory:', error);
    return { data: [], error: 'Ошибка при загрузке истории' };
  }
}
