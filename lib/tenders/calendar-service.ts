import { createRSCClient } from '@/lib/supabase/helpers';

// Типы событий календаря
export type CalendarEventType = 
  | 'submission' 
  | 'results' 
  | 'contract_start' 
  | 'contract_end' 
  | 'task' 
  | 'payment';

export interface CalendarEvent {
  id: string;
  date: string;
  time: string | null;
  type: CalendarEventType;
  title: string;
  description: string | null;
  tenderId: string | null;
  tenderNumber: string | null;
  customer: string | null;
  nmck: number | null;
  contractPrice: number | null;
  status: string | null;
  isUrgent: boolean;
  daysLeft: number | null;
  taskId?: string;
  taskStatus?: string;
}

export interface CalendarDay {
  date: string;
  events: CalendarEvent[];
  hasSubmission: boolean;
  hasResults: boolean;
  hasContract: boolean;
  hasTask: boolean;
  hasPayment: boolean;
  totalEvents: number;
}

export interface CalendarMonthData {
  year: number;
  month: number;
  days: Map<string, CalendarDay>;
}

export interface CalendarStats {
  totalEvents: number;
  submissionsCount: number;
  resultsCount: number;
  tasksCount: number;
  urgentCount: number;
  thisWeekEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
}

export interface CalendarData {
  events: CalendarEvent[];
  stats: CalendarStats;
}

export interface CalendarParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getCalendarData(params: CalendarParams): Promise<CalendarData> {
  const supabase = await createRSCClient();
  const { companyId } = params;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Получаем тендеры
  const { data: tenders, error: tendersError } = await supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      subject,
      customer,
      nmck,
      contract_price,
      status,
      submission_deadline,
      auction_date,
      results_date,
      review_date
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (tendersError) {
    console.error('Error fetching tenders for calendar:', tendersError);
  }

  // Получаем задачи (если таблица существует)
  let tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    priority: string;
    tender_id: string | null;
  }> | null = null;

  try {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tender_tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        status,
        priority,
        tender_id
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .not('due_date', 'is', null);

    if (!tasksError) {
      tasks = tasksData;
    }
  } catch {
    // Таблица tender_tasks может не существовать
  }

  const events: CalendarEvent[] = [];

  // Обрабатываем тендеры
  if (tenders) {
    for (const tender of tenders) {
      const customer = tender.customer || 'Неизвестный заказчик';
      const subject = tender.subject || '';

      // Дата подачи заявки
      if (tender.submission_deadline) {
        const submissionDate = new Date(tender.submission_deadline);
        const daysLeft = Math.ceil((submissionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `submission-${tender.id}`,
          date: tender.submission_deadline.split('T')[0],
          time: tender.submission_deadline.includes('T') 
            ? tender.submission_deadline.split('T')[1]?.substring(0, 5) 
            : null,
          type: 'submission',
          title: `Подача заявки: ${customer}`,
          description: subject,
          tenderId: tender.id,
          tenderNumber: tender.purchase_number,
          customer,
          nmck: tender.nmck ? tender.nmck / 100 : null,
          contractPrice: tender.contract_price ? tender.contract_price / 100 : null,
          status: tender.status,
          isUrgent: daysLeft >= 0 && daysLeft <= 3,
          daysLeft: daysLeft >= 0 ? daysLeft : null,
        });
      }

      // Дата подведения итогов
      if (tender.results_date) {
        const resultsDate = new Date(tender.results_date);
        const daysLeft = Math.ceil((resultsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `results-${tender.id}`,
          date: tender.results_date.split('T')[0],
          time: null,
          type: 'results',
          title: `Итоги торгов: ${customer}`,
          description: subject,
          tenderId: tender.id,
          tenderNumber: tender.purchase_number,
          customer,
          nmck: tender.nmck ? tender.nmck / 100 : null,
          contractPrice: tender.contract_price ? tender.contract_price / 100 : null,
          status: tender.status,
          isUrgent: daysLeft >= 0 && daysLeft <= 1,
          daysLeft: daysLeft >= 0 ? daysLeft : null,
        });
      }

      // Дата аукциона
      if (tender.auction_date) {
        const auctionDate = new Date(tender.auction_date);
        const daysLeft = Math.ceil((auctionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `auction-${tender.id}`,
          date: tender.auction_date.split('T')[0],
          time: tender.auction_date.includes('T') 
            ? tender.auction_date.split('T')[1]?.substring(0, 5) 
            : null,
          type: 'contract_start',
          title: `Аукцион: ${customer}`,
          description: subject,
          tenderId: tender.id,
          tenderNumber: tender.purchase_number,
          customer,
          nmck: tender.nmck ? tender.nmck / 100 : null,
          contractPrice: tender.contract_price ? tender.contract_price / 100 : null,
          status: tender.status,
          isUrgent: daysLeft >= 0 && daysLeft <= 1,
          daysLeft: daysLeft >= 0 ? daysLeft : null,
        });
      }

      // Дата рассмотрения
      if (tender.review_date) {
        const reviewDate = new Date(tender.review_date);
        const daysLeft = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `review-${tender.id}`,
          date: tender.review_date.split('T')[0],
          time: null,
          type: 'contract_end',
          title: `Рассмотрение заявок: ${customer}`,
          description: subject,
          tenderId: tender.id,
          tenderNumber: tender.purchase_number,
          customer,
          nmck: tender.nmck ? tender.nmck / 100 : null,
          contractPrice: tender.contract_price ? tender.contract_price / 100 : null,
          status: tender.status,
          isUrgent: daysLeft >= 0 && daysLeft <= 1,
          daysLeft: daysLeft >= 0 ? daysLeft : null,
        });
      }
    }
  }

  // Обрабатываем задачи
  if (tasks) {
    for (const task of tasks) {
      if (!task.due_date) continue;
      
      const dueDate = new Date(task.due_date);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      events.push({
        id: `task-${task.id}`,
        date: task.due_date.split('T')[0],
        time: task.due_date.includes('T') 
          ? task.due_date.split('T')[1]?.substring(0, 5) 
          : null,
        type: 'task',
        title: task.title,
        description: task.description,
        tenderId: task.tender_id || null,
        tenderNumber: null,
        customer: null,
        nmck: null,
        contractPrice: null,
        status: task.status,
        isUrgent: task.priority === 'high' || (daysLeft >= 0 && daysLeft <= 1),
        daysLeft: daysLeft >= 0 ? daysLeft : null,
        taskId: task.id,
        taskStatus: task.status,
      });
    }
  }

  // Сортируем по дате
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Статистика
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const thisWeekEvents = events.filter(e => e.date >= todayStr && e.date <= weekEndStr);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .slice(0, 10);

  const stats: CalendarStats = {
    totalEvents: events.length,
    submissionsCount: events.filter(e => e.type === 'submission').length,
    resultsCount: events.filter(e => e.type === 'results').length,
    tasksCount: events.filter(e => e.type === 'task').length,
    urgentCount: events.filter(e => e.isUrgent && e.date >= todayStr).length,
    thisWeekEvents,
    upcomingEvents,
  };

  return { events, stats };
}
