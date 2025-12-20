import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

interface TenderWithDetails {
  id: string;
  purchase_number: string;
  subject: string;
  customer: string;
  nmck: number;
  stage_id: string;
  status: string;
  created_at: string;
  submission_deadline: string;
  stage: {
    id: string;
    name: string;
    color: string;
    category: string;
  };
  responsible: Array<{
    employee: {
      id: string;
      full_name: string;
      role_data: { name: string; color: string } | null;
    };
  }>;
  stage_entered_at?: string;
  time_on_stage?: string;
}

/**
 * GET /api/tenders/admin-overview - Полная картина тендеров для админа организации
 * Возвращает все тендеры с группировкой по этапам, свободные тендеры, аналитику времени
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем company_id из параметров
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id обязателен' }, { status: 400 });
    }

    // Проверяем что пользователь - админ организации
    const { data: member } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const isAdmin = member?.role === 'admin' || 
                    profile?.global_role === 'super_admin' || 
                    profile?.global_role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Доступ только для админа организации' },
        { status: 403 }
      );
    }

    // Получаем все тендеры компании с полной информацией
    const { data: tenders, error: tendersError } = await supabase
      .from('tenders')
      .select(`
        id,
        purchase_number,
        subject,
        customer,
        nmck,
        stage_id,
        status,
        created_at,
        submission_deadline,
        stage:tender_stages!tenders_stage_id_fkey(
          id,
          name,
          color,
          category,
          order_index
        ),
        responsible:tender_responsible(
          employee:employees!tender_responsible_employee_id_fkey(
            id,
            full_name,
            email,
            role_data:roles!employees_role_id_fkey(
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (tendersError) {
      console.error('Error fetching tenders:', tendersError);
      return NextResponse.json(
        { error: 'Ошибка при получении тендеров' },
        { status: 500 }
      );
    }

    // Получаем историю этапов для расчета времени на этапе
    const tenderIds = (tenders || []).map(t => t.id);
    
    let stageHistory: Array<{
      tender_id: string;
      to_stage_id: string;
      entered_at: string;
      exited_at: string | null;
    }> = [];

    if (tenderIds.length > 0) {
      const { data: history } = await supabase
        .from('tender_stage_history')
        .select('tender_id, to_stage_id, entered_at, exited_at')
        .in('tender_id', tenderIds)
        .is('exited_at', null);
      
      stageHistory = history || [];
    }

    // Создаем map для быстрого поиска времени входа на этап
    const stageEntryMap = new Map<string, string>();
    stageHistory.forEach(h => {
      stageEntryMap.set(`${h.tender_id}-${h.to_stage_id}`, h.entered_at);
    });

    // Получаем все этапы для группировки
    const { data: stages } = await supabase
      .from('tender_stages')
      .select('id, name, color, category, order_index')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('category')
      .order('order_index');

    // Группируем тендеры по этапам
    const tendersByStage: Record<string, TenderWithDetails[]> = {};
    const freeTenders: TenderWithDetails[] = []; // Тендеры без назначенных сотрудников

    (tenders || []).forEach((tender) => {
      const stageId = tender.stage_id;
      const enteredAt = stageEntryMap.get(`${tender.id}-${stageId}`);
      
      // Рассчитываем время на этапе
      let timeOnStage = '';
      if (enteredAt) {
        const enteredDate = new Date(enteredAt);
        const now = new Date();
        const diffMs = now.getTime() - enteredDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (diffDays > 0) {
          timeOnStage = `${diffDays}д ${diffHours}ч`;
        } else if (diffHours > 0) {
          timeOnStage = `${diffHours}ч`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          timeOnStage = `${diffMins}мин`;
        }
      }

      const tenderWithDetails: TenderWithDetails = {
        ...tender,
        stage: tender.stage as TenderWithDetails['stage'],
        responsible: tender.responsible as TenderWithDetails['responsible'],
        stage_entered_at: enteredAt,
        time_on_stage: timeOnStage
      };

      // Инициализируем массив для этапа если нужно
      if (!tendersByStage[stageId]) {
        tendersByStage[stageId] = [];
      }
      tendersByStage[stageId].push(tenderWithDetails);

      // Проверяем есть ли назначенные сотрудники
      if (!tender.responsible || tender.responsible.length === 0) {
        freeTenders.push(tenderWithDetails);
      }
    });

    // Статистика
    const totalTenders = tenders?.length || 0;
    const freeTendersCount = freeTenders.length;
    const assignedTendersCount = totalTenders - freeTendersCount;

    // Статистика по этапам
    const stageStats = (stages || []).map(stage => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      category: stage.category,
      count: tendersByStage[stage.id]?.length || 0
    }));

    // Тендеры с долгим временем на этапе (более 3 дней)
    const staleTenders = (tenders || []).filter(tender => {
      const enteredAt = stageEntryMap.get(`${tender.id}-${tender.stage_id}`);
      if (!enteredAt) return false;
      
      const diffMs = Date.now() - new Date(enteredAt).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    }).map(tender => ({
      id: tender.id,
      purchase_number: tender.purchase_number,
      subject: tender.subject,
      stage: tender.stage,
      days_on_stage: Math.floor(
        (Date.now() - new Date(stageEntryMap.get(`${tender.id}-${tender.stage_id}`) || Date.now()).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
    }));

    return NextResponse.json({
      tenders: tenders || [],
      tendersByStage,
      freeTenders,
      stages: stages || [],
      stats: {
        total: totalTenders,
        free: freeTendersCount,
        assigned: assignedTendersCount,
        byStage: stageStats,
        stale: staleTenders.length
      },
      staleTenders
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/admin-overview:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
