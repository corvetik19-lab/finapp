'use server';

import { createRouteClient } from '@/lib/supabase/server';
import { getCurrentUserPermissions, canViewAllTenders } from '@/lib/permissions/check-permissions';
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

    // Проверяем права пользователя
    const userPermissions = await getCurrentUserPermissions();
    const canViewAll = canViewAllTenders(userPermissions);

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

    // Фильтрация по правам: если нет права view_all, показываем только свои тендеры
    if (!canViewAll && userPermissions.employeeId) {
      // Пользователь видит тендеры где он manager, specialist, investor или executor
      query = query.or(
        `manager_id.eq.${userPermissions.employeeId},specialist_id.eq.${userPermissions.employeeId},investor_id.eq.${userPermissions.employeeId},executor_id.eq.${userPermissions.employeeId}`
      );
    } else if (!canViewAll && !userPermissions.employeeId) {
      // Нет employee_id и нет права view_all - возвращаем пустой список
      return { data: [], total: 0, error: null };
    }

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

    // Получаем текущую версию тендера для сравнения
    const { data: oldTender } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

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

    // Если обновление успешно и есть старая версия, записываем изменения
    if (oldTender) {
      const changes: { field: string; old: unknown; new: unknown }[] = [];

      if (input.status && input.status !== oldTender.status) {
        changes.push({ field: 'status', old: oldTender.status, new: input.status });
      }
      if (input.nmck && input.nmck !== oldTender.nmck) {
        changes.push({ field: 'nmck', old: oldTender.nmck, new: input.nmck });
      }
      if (input.submission_deadline && input.submission_deadline !== oldTender.submission_deadline) {
        changes.push({ field: 'submission_deadline', old: oldTender.submission_deadline, new: input.submission_deadline });
      }
      if (input.manager_id && input.manager_id !== oldTender.manager_id) {
        changes.push({ field: 'manager_id', old: oldTender.manager_id, new: input.manager_id });
      }

      if (changes.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { error: historyError } = await supabase
            .from('tender_field_history')
            .insert(
              changes.map((c) => ({
                tender_id: tenderId,
                field_name: c.field,
                old_value: c.old ? String(c.old) : null,
                new_value: c.new ? String(c.new) : null,
                changed_by: userData.user.id,
              }))
            );

          if (historyError) console.error('Error logging history:', historyError);
        }
      }
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

    // Получаем этапы компании и системные
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    } else {
      // Если нет companyId, возвращаем только системные
      query = query.is('company_id', null);
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
 * Получить статистику по тендерам компании (с учётом прав пользователя)
 */
export async function getTenderStats(
  companyId: string
): Promise<{ data: TenderStats | null; error: string | null }> {
  try {
    const supabase = await createRouteClient();

    // Проверяем права пользователя
    const userPermissions = await getCurrentUserPermissions();
    const canViewAll = canViewAllTenders(userPermissions);

    // Если пользователь видит все тендеры - используем RPC
    if (canViewAll) {
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
    }

    // Для пользователей с ограниченными правами - вычисляем из отфильтрованных тендеров
    if (!userPermissions.employeeId) {
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

    // Получаем тендеры пользователя
    const { data: tenders, error } = await supabase
      .from('tenders')
      .select('id, status, nmck, contract_price')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .or(
        `manager_id.eq.${userPermissions.employeeId},specialist_id.eq.${userPermissions.employeeId},investor_id.eq.${userPermissions.employeeId},executor_id.eq.${userPermissions.employeeId}`
      );

    if (error) {
      console.error('Error fetching user tenders for stats:', error);
      return { data: null, error: error.message };
    }

    const totalCount = tenders?.length || 0;
    const activeCount = tenders?.filter(t => t.status === 'active' || t.status === 'in_progress').length || 0;
    const wonCount = tenders?.filter(t => t.status === 'won').length || 0;
    const lostCount = tenders?.filter(t => t.status === 'lost').length || 0;
    const totalNmck = tenders?.reduce((sum, t) => sum + (t.nmck || 0), 0) || 0;
    const totalContractPrice = tenders?.reduce((sum, t) => sum + (t.contract_price || 0), 0) || 0;
    const avgNmck = totalCount > 0 ? totalNmck / totalCount : 0;
    const conversionRate = activeCount > 0 ? (wonCount / activeCount) * 100 : 0;

    return {
      data: {
        total_count: totalCount,
        active_count: activeCount,
        won_count: wonCount,
        lost_count: lostCount,
        total_nmck: totalNmck,
        total_contract_price: totalContractPrice,
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

    // Проверяем права пользователя
    const userPermissions = await getCurrentUserPermissions();
    const canViewAll = canViewAllTenders(userPermissions);

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

    // Если нет права view_all и нет employee_id - возвращаем пустые данные
    if (!canViewAll && !userPermissions.employeeId) {
      const grouped: Record<string, Tender[]> = {};
      (stages || []).forEach((stage) => {
        grouped[stage.id] = [];
      });
      return { data: grouped, stages: stages || [], error: null };
    }

    // Получаем тендеры
    let tendersQuery = supabase
      .from('tenders')
      .select(
        `
        *,
        stage:tender_stages(*),
        type:tender_types(*),
        manager:profiles!tenders_manager_id_fkey(id, full_name, avatar_url),
        tender_comments(content, created_at),
        tender_tasks(title, due_date, status)
      `
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in(
        'stage_id',
        stages?.map((s) => s.id) || []
      );

    // Фильтрация по правам пользователя
    if (!canViewAll && userPermissions.employeeId) {
      tendersQuery = tendersQuery.or(
        `manager_id.eq.${userPermissions.employeeId},specialist_id.eq.${userPermissions.employeeId},investor_id.eq.${userPermissions.employeeId},executor_id.eq.${userPermissions.employeeId}`
      );
    }

    const { data: tenders, error: tendersError } = await tendersQuery.order('created_at', { ascending: false });

    if (tendersError) {
      console.error('Error fetching tenders:', tendersError);
      return { data: {}, stages: stages || [], error: tendersError.message };
    }

    // Обрабатываем данные для добавления last_comment и next_task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedTenders = (tenders || []).map((t: any) => {
      // Получаем последний комментарий
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastComment = t.tender_comments?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Получаем следующую задачу (не выполненную, с ближайшим дедлайном)
      const nextTask = t.tender_tasks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.filter((task: any) => task.status !== 'completed')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.sort((a: any, b: any) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        })[0];

      return {
        ...t,
        last_comment: lastComment ? { content: lastComment.content, created_at: lastComment.created_at } : undefined,
        next_task: nextTask ? { title: nextTask.title, due_date: nextTask.due_date } : undefined,
        tender_comments: undefined, // Очищаем лишние данные
        tender_tasks: undefined,
      };
    });

    // Группируем тендеры по этапам
    const grouped: Record<string, Tender[]> = {};
    stages?.forEach((stage: TenderStage) => {
      grouped[stage.id] = processedTenders.filter((t: Tender) => t.stage_id === stage.id);
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

    // 1. Получаем историю этапов
    const { data: stageHistory, error: stageError } = await supabase
      .from('tender_stage_history')
      .select(
        `
        *,
        from_stage:tender_stages!tender_stage_history_from_stage_id_fkey(*),
        to_stage:tender_stages!tender_stage_history_to_stage_id_fkey(*)
      `
      )
      .eq('tender_id', tenderId);

    if (stageError) {
      console.error('Error fetching tender stage history:', stageError);
      // Не прерываем, попробуем получить хотя бы историю полей
    }

    // 2. Получаем историю полей
    const { data: fieldHistory, error: fieldError } = await supabase
      .from('tender_field_history')
      .select('*')
      .eq('tender_id', tenderId);

    if (fieldError) {
      console.error('Error fetching tender field history:', fieldError);
    }

    // 3. Собираем ID пользователей для получения информации о них
    const userIds = new Set<string>();
    fieldHistory?.forEach(h => userIds.add(h.changed_by));
    stageHistory?.forEach(h => {
      if (h.changed_by) userIds.add(h.changed_by);
    });

    // Если есть ID, получаем пользователей из employees
    // (так как profiles может не быть доступна или не существовать)
    const usersMap: Record<string, { id: string; full_name: string; avatar_url?: string }> = {};
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('employees')
        .select('user_id, full_name, avatar_url') // Используем user_id для маппинга
        .in('user_id', Array.from(userIds));

      if (users) {
        users.forEach((u) => {
          if (u.user_id) usersMap[u.user_id] = { id: u.user_id, full_name: u.full_name, avatar_url: u.avatar_url || undefined };
        });
      }
    }

    // 4. Объединяем и сортируем
    const combinedHistory = [
      ...(stageHistory || []).map((item) => ({
        ...item,
        type: 'stage_change' as const,
        created_at: item.created_at,
        changed_by_user: item.changed_by ? (usersMap[item.changed_by] || { id: item.changed_by, full_name: 'Неизвестный' }) : { id: 'system', full_name: 'Система' },
      })),
      ...(fieldHistory || []).map((item) => ({
        ...item,
        type: 'field_change' as const,
        created_at: item.created_at,
        changed_by_user: usersMap[item.changed_by] || { id: item.changed_by, full_name: 'Неизвестный' },
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: combinedHistory, error: null };
  } catch (error) {
    console.error('Error in getTenderHistory:', error);
    return { data: [], error: 'Ошибка при загрузке истории' };
  }
}
