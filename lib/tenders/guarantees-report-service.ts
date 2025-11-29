import { createRSCClient } from '@/lib/supabase/helpers';

// Интерфейсы для отчёта по банковским гарантиям
export type GuaranteeType = 'application' | 'contract' | 'warranty';
export type GuaranteeStatus = 'active' | 'expiring' | 'expired' | 'returned';

export interface GuaranteeInfo {
  id: string;
  purchaseNumber: string;
  customer: string;
  type: GuaranteeType;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  daysLeft: number;
  status: GuaranteeStatus;
  executor: string | null;
  stage: string | null;
}

export interface GuaranteesByType {
  type: GuaranteeType;
  label: string;
  count: number;
  amount: number;
  activeCount: number;
  activeAmount: number;
}

export interface GuaranteesByBank {
  bank: string;
  count: number;
  amount: number;
}

export interface MonthlyGuarantees {
  month: string;
  monthLabel: string;
  newCount: number;
  newAmount: number;
  expiringCount: number;
  expiringAmount: number;
}

export interface GuaranteesReportOverview {
  totalCount: number;
  totalAmount: number;
  activeCount: number;
  activeAmount: number;
  expiringCount: number;
  expiringAmount: number;
  expiredCount: number;
  expiredAmount: number;
  applicationSecurityTotal: number;
  contractSecurityTotal: number;
  avgGuaranteeAmount: number;
}

export interface GuaranteesReportData {
  overview: GuaranteesReportOverview;
  guarantees: GuaranteeInfo[];
  byType: GuaranteesByType[];
  expiringGuarantees: GuaranteeInfo[];
  monthly: MonthlyGuarantees[];
}

export interface GuaranteesReportParams {
  companyId: string;
  dateFrom?: string;
  dateTo?: string;
}

// Хелпер для извлечения первого элемента из joined данных
function getFirst<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

function getEmptyReport(): GuaranteesReportData {
  return {
    overview: {
      totalCount: 0,
      totalAmount: 0,
      activeCount: 0,
      activeAmount: 0,
      expiringCount: 0,
      expiringAmount: 0,
      expiredCount: 0,
      expiredAmount: 0,
      applicationSecurityTotal: 0,
      contractSecurityTotal: 0,
      avgGuaranteeAmount: 0,
    },
    guarantees: [],
    byType: [],
    expiringGuarantees: [],
    monthly: [],
  };
}

export async function getGuaranteesReportData(
  params: GuaranteesReportParams
): Promise<GuaranteesReportData> {
  const supabase = await createRSCClient();
  const { companyId, dateFrom, dateTo } = params;

  // Получаем тендеры с обеспечением
  let query = supabase
    .from('tenders')
    .select(`
      id,
      purchase_number,
      customer,
      application_security,
      contract_security,
      submission_deadline,
      results_date,
      contract_duration,
      status,
      created_at,
      stage:tender_stages!tenders_stage_id_fkey(id, name, category, color),
      executor:employees!tenders_executor_id_fkey(id, full_name)
    `)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data: allTenders, error } = await query;

  if (error) {
    console.error('Error fetching tenders for guarantees report:', error);
    return getEmptyReport();
  }

  if (!allTenders || allTenders.length === 0) {
    return getEmptyReport();
  }

  // Фильтруем тендеры с обеспечением
  const tenders = allTenders.filter(tender => 
    (tender.application_security && tender.application_security > 0) ||
    (tender.contract_security && tender.contract_security > 0)
  );

  if (tenders.length === 0) {
    return getEmptyReport();
  }

  const today = new Date();
  const guarantees: GuaranteeInfo[] = [];
  const monthlyMap = new Map<string, { newCount: number; newAmount: number; expiringCount: number; expiringAmount: number }>();

  let totalAmount = 0;
  let activeCount = 0;
  let activeAmount = 0;
  let expiringCount = 0;
  let expiringAmount = 0;
  let expiredCount = 0;
  let expiredAmount = 0;
  let applicationSecurityTotal = 0;
  let contractSecurityTotal = 0;

  const typeStats = {
    application: { count: 0, amount: 0, activeCount: 0, activeAmount: 0 },
    contract: { count: 0, amount: 0, activeCount: 0, activeAmount: 0 },
  };

  for (const tender of tenders) {
    const stage = getFirst(tender.stage as unknown) as { name: string; category: string } | null;
    const executor = getFirst(tender.executor as unknown) as { full_name: string } | null;
    const stageCategory = stage?.category || '';

    // Обеспечение заявки
    if (tender.application_security && tender.application_security > 0) {
      const appAmount = tender.application_security / 100;
      applicationSecurityTotal += appAmount;
      totalAmount += appAmount;
      typeStats.application.count++;
      typeStats.application.amount += appAmount;

      // Определяем статус обеспечения заявки
      let appStatus: GuaranteeStatus = 'active';
      let appDaysLeft = 0;
      let appEndDate: string | null = null;

      // Обеспечение заявки действует до подведения итогов
      if (tender.results_date) {
        const resultsDate = new Date(tender.results_date);
        appEndDate = tender.results_date;
        appDaysLeft = Math.ceil((resultsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (appDaysLeft < 0) {
          appStatus = 'expired';
          expiredCount++;
          expiredAmount += appAmount;
        } else if (appDaysLeft <= 14) {
          appStatus = 'expiring';
          expiringCount++;
          expiringAmount += appAmount;
          typeStats.application.activeCount++;
          typeStats.application.activeAmount += appAmount;
        } else {
          activeCount++;
          activeAmount += appAmount;
          typeStats.application.activeCount++;
          typeStats.application.activeAmount += appAmount;
        }
      } else if (tender.submission_deadline) {
        // Если нет даты итогов, используем дедлайн подачи + 30 дней
        const deadline = new Date(tender.submission_deadline);
        deadline.setDate(deadline.getDate() + 30);
        appEndDate = deadline.toISOString().split('T')[0];
        appDaysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (appDaysLeft < 0) {
          appStatus = 'expired';
          expiredCount++;
          expiredAmount += appAmount;
        } else if (appDaysLeft <= 14) {
          appStatus = 'expiring';
          expiringCount++;
          expiringAmount += appAmount;
          typeStats.application.activeCount++;
          typeStats.application.activeAmount += appAmount;
        } else {
          activeCount++;
          activeAmount += appAmount;
          typeStats.application.activeCount++;
          typeStats.application.activeAmount += appAmount;
        }
      } else {
        activeCount++;
        activeAmount += appAmount;
        typeStats.application.activeCount++;
        typeStats.application.activeAmount += appAmount;
      }

      // Если тендер проигран или в архиве - гарантия возвращена
      if (tender.status === 'lost' || stageCategory === 'archive') {
        appStatus = 'returned';
      }

      guarantees.push({
        id: `${tender.id}-app`,
        purchaseNumber: tender.purchase_number,
        customer: tender.customer || 'Неизвестный заказчик',
        type: 'application',
        amount: appAmount,
        startDate: tender.created_at?.split('T')[0] || null,
        endDate: appEndDate,
        daysLeft: Math.max(0, appDaysLeft),
        status: appStatus,
        executor: executor?.full_name || null,
        stage: stage?.name || null,
      });

      // Агрегация по месяцам
      const createdDate = new Date(tender.created_at);
      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyMap.get(monthKey) || { newCount: 0, newAmount: 0, expiringCount: 0, expiringAmount: 0 };
      monthData.newCount++;
      monthData.newAmount += appAmount;
      monthlyMap.set(monthKey, monthData);
    }

    // Обеспечение контракта
    if (tender.contract_security && tender.contract_security > 0) {
      const contractAmount = tender.contract_security / 100;
      contractSecurityTotal += contractAmount;
      totalAmount += contractAmount;
      typeStats.contract.count++;
      typeStats.contract.amount += contractAmount;

      // Обеспечение контракта действует только для выигранных/реализуемых тендеров
      if (tender.status === 'won' || stageCategory === 'realization') {
        let contractStatus: GuaranteeStatus = 'active';
        let contractDaysLeft = 0;
        let contractEndDate: string | null = null;

        // Обеспечение контракта действует до конца контракта
        if (tender.contract_duration) {
          // Пробуем парсить срок действия контракта
          const durationMatch = tender.contract_duration.match(/(\d+)/);
          if (durationMatch && tender.results_date) {
            const days = parseInt(durationMatch[1]);
            const resultsDate = new Date(tender.results_date);
            resultsDate.setDate(resultsDate.getDate() + days);
            contractEndDate = resultsDate.toISOString().split('T')[0];
            contractDaysLeft = Math.ceil((resultsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (contractDaysLeft < 0) {
              contractStatus = 'expired';
              expiredCount++;
              expiredAmount += contractAmount;
            } else if (contractDaysLeft <= 30) {
              contractStatus = 'expiring';
              expiringCount++;
              expiringAmount += contractAmount;
              typeStats.contract.activeCount++;
              typeStats.contract.activeAmount += contractAmount;
            } else {
              activeCount++;
              activeAmount += contractAmount;
              typeStats.contract.activeCount++;
              typeStats.contract.activeAmount += contractAmount;
            }
          } else {
            activeCount++;
            activeAmount += contractAmount;
            typeStats.contract.activeCount++;
            typeStats.contract.activeAmount += contractAmount;
          }
        } else {
          // По умолчанию контракт действует 1 год
          if (tender.results_date) {
            const resultsDate = new Date(tender.results_date);
            resultsDate.setFullYear(resultsDate.getFullYear() + 1);
            contractEndDate = resultsDate.toISOString().split('T')[0];
            contractDaysLeft = Math.ceil((resultsDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          activeCount++;
          activeAmount += contractAmount;
          typeStats.contract.activeCount++;
          typeStats.contract.activeAmount += contractAmount;
        }

        guarantees.push({
          id: `${tender.id}-contract`,
          purchaseNumber: tender.purchase_number,
          customer: tender.customer || 'Неизвестный заказчик',
          type: 'contract',
          amount: contractAmount,
          startDate: tender.results_date?.split('T')[0] || tender.created_at?.split('T')[0] || null,
          endDate: contractEndDate,
          daysLeft: Math.max(0, contractDaysLeft),
          status: contractStatus,
          executor: executor?.full_name || null,
          stage: stage?.name || null,
        });

        // Агрегация по месяцам
        if (tender.results_date) {
          const resultsDate = new Date(tender.results_date);
          const monthKey = `${resultsDate.getFullYear()}-${String(resultsDate.getMonth() + 1).padStart(2, '0')}`;
          const monthData = monthlyMap.get(monthKey) || { newCount: 0, newAmount: 0, expiringCount: 0, expiringAmount: 0 };
          monthData.newCount++;
          monthData.newAmount += contractAmount;
          monthlyMap.set(monthKey, monthData);
        }
      }
    }
  }

  // Формируем данные по типам
  const byType: GuaranteesByType[] = [
    {
      type: 'application' as GuaranteeType,
      label: 'Обеспечение заявки',
      count: typeStats.application.count,
      amount: typeStats.application.amount,
      activeCount: typeStats.application.activeCount,
      activeAmount: typeStats.application.activeAmount,
    },
    {
      type: 'contract' as GuaranteeType,
      label: 'Обеспечение контракта',
      count: typeStats.contract.count,
      amount: typeStats.contract.amount,
      activeCount: typeStats.contract.activeCount,
      activeAmount: typeStats.contract.activeAmount,
    },
  ].filter(t => t.count > 0);

  // Истекающие гарантии
  const expiringGuarantees = guarantees
    .filter(g => g.status === 'expiring' || (g.status === 'active' && g.daysLeft <= 30 && g.daysLeft > 0))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  // Формируем данные по месяцам
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const monthly: MonthlyGuarantees[] = Array.from(monthlyMap.entries())
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      return {
        month,
        monthLabel: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
        newCount: data.newCount,
        newAmount: data.newAmount,
        expiringCount: data.expiringCount,
        expiringAmount: data.expiringAmount,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const totalCount = guarantees.length;
  const avgGuaranteeAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  return {
    overview: {
      totalCount,
      totalAmount,
      activeCount,
      activeAmount,
      expiringCount,
      expiringAmount,
      expiredCount,
      expiredAmount,
      applicationSecurityTotal,
      contractSecurityTotal,
      avgGuaranteeAmount,
    },
    guarantees: guarantees.sort((a, b) => a.daysLeft - b.daysLeft),
    byType,
    expiringGuarantees,
    monthly,
  };
}
