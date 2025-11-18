import { NextRequest, NextResponse } from 'next/server';
import { getTenders, createTender } from '@/lib/tenders/service';
import type { CreateTenderInput, TenderListParams } from '@/lib/tenders/types';
import { createRSCClient } from '@/lib/supabase/server';

/**
 * GET /api/tenders
 * Получить список тендеров компании
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

    // Парсим параметры
    const params: TenderListParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort_by: (searchParams.get('sort_by') as 'created_at' | 'nmck' | 'submission_deadline') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      filters: {
        search: searchParams.get('search') || undefined,
        purchase_number: searchParams.get('purchase_number') || undefined,
        stage_id: searchParams.get('stage_id') || undefined,
        status: (searchParams.get('status') as 'active' | 'won' | 'lost' | 'archived' | undefined) || undefined,
        type_id: searchParams.get('type_id') || undefined,
        template_id: searchParams.get('template_id') || undefined,
        manager_id: searchParams.get('manager_id') || undefined,
        specialist_id: searchParams.get('specialist_id') || undefined,
        investor_id: searchParams.get('investor_id') || undefined,
        executor_id: searchParams.get('executor_id') || undefined,
        date_from: searchParams.get('date_from') || undefined,
        date_to: searchParams.get('date_to') || undefined,
      },
    };

    const result = await getTenders(companyId, params);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Возвращаем данные напрямую как массив
    return NextResponse.json(result.data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tenders:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenders
 * Создать новый тендер
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация обязательных полей (stage_id теперь опциональный, определяется автоматически)
    const requiredFields = [
      'company_id',
      'purchase_number',
      'subject',
      'customer',
      'nmck',
      'submission_deadline',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Поле ${field} обязательно` },
          { status: 400 }
        );
      }
    }

    const normalizeFk = (value: string | null | undefined) =>
      value && value !== '' ? value : undefined;

    const input: CreateTenderInput = {
      company_id: body.company_id,
      purchase_number: body.purchase_number,
      subject: body.subject,
      customer: body.customer,
      nmck: body.nmck,
      submission_deadline: body.submission_deadline,
      stage_id: normalizeFk(body.stage_id), // Опционально, определяется автоматически если не указан
      project_name: body.project_name,
      method: body.method,
      type_id: normalizeFk(body.type_id),
      template_id: normalizeFk(body.template_id),
      city: body.city,
      platform: body.platform,
      our_price: body.our_price,
      contract_price: body.contract_price,
      application_security: body.application_security,
      contract_security: body.contract_security,
      auction_date: body.auction_date,
      results_date: body.results_date,
      review_date: body.review_date,
      manager_id: normalizeFk(body.manager_id),
      specialist_id: normalizeFk(body.specialist_id),
      investor_id: normalizeFk(body.investor_id),
      executor_id: normalizeFk(body.executor_id),
      comment: body.comment,
      tags: body.tags,
      metadata: body.metadata,
    };

    const result = await createTender(input);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Обрабатываем список ответственных (если указан)
    if (result.data?.id && body.responsible_ids && Array.isArray(body.responsible_ids) && body.responsible_ids.length > 0) {
      const supabase = await createRSCClient();
      const responsibleRecords = body.responsible_ids.map((employeeId: string) => ({
        tender_id: result.data!.id,
        employee_id: employeeId,
      }));

      const { error: responsibleError } = await supabase
        .from('tender_responsible')
        .insert(responsibleRecords);

      if (responsibleError) {
        console.error('Error creating responsible records:', responsibleError);
        // Не возвращаем ошибку, так как основной тендер уже создан
      }
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tenders:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
