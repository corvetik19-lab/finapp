/**
 * Сервис интеграции с 1С для модуля инвесторов
 * Фаза 7: Синхронизация договоров займа, начислений, актов сверки
 */

import { createRSCClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface OneCLoanContract {
  id: string;
  number: string;
  date: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyInn: string;
  amount: number;
  interestRate: number;
  startDate: string;
  endDate: string;
  status: "active" | "closed" | "overdue";
}

export interface OneCAccrual {
  id: string;
  contractId: string;
  date: string;
  type: "interest" | "penalty" | "commission";
  amount: number;
  period: string;
}

export interface OneCReconciliationAct {
  id: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  openingDebt: number;
  closingDebt: number;
  totalAccrued: number;
  totalPaid: number;
  signed: boolean;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Настройки подключения к 1С
 */
export interface OneCConnectionSettings {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
}

/**
 * Проверяет подключение к 1С
 */
export async function testOneCConnection(
  settings: OneCConnectionSettings
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${settings.baseUrl}/api/v1/ping`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { success: true, message: "Подключение успешно" };
    }

    return {
      success: false,
      message: `Ошибка подключения: ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Ошибка сети: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Экспортирует инвестиции в формат 1С
 */
export async function exportInvestmentsTo1C(): Promise<OneCLoanContract[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data: investments } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(
        name, inn
      )
    `)
    .eq("user_id", user.id);

  if (!investments) return [];

  return investments.map((inv) => ({
    id: inv.id,
    number: inv.investment_number || "",
    date: inv.created_at,
    counterpartyId: inv.source_id || "",
    counterpartyName: inv.source?.name || "",
    counterpartyInn: inv.source?.inn || "",
    amount: inv.approved_amount || 0,
    interestRate: inv.interest_rate || 0,
    startDate: inv.start_date || "",
    endDate: inv.due_date || "",
    status: mapStatus(inv.status),
  }));
}

/**
 * Импортирует договоры займа из 1С
 */
export async function importLoanContractsFrom1C(
  contracts: OneCLoanContract[]
): Promise<SyncResult> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, created: 0, updated: 0, errors: ["Не авторизован"] };
  }

  const result: SyncResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
  };

  for (const contract of contracts) {
    try {
      // Ищем существующую инвестицию по номеру
      const { data: existing } = await supabase
        .from("investments")
        .select("id")
        .eq("user_id", user.id)
        .eq("investment_number", contract.number)
        .single();

      // Ищем или создаём источник по ИНН
      let sourceId: string | null = null;
      
      if (contract.counterpartyInn) {
        const { data: source } = await supabase
          .from("investment_sources")
          .select("id")
          .eq("user_id", user.id)
          .eq("inn", contract.counterpartyInn)
          .single();

        if (source) {
          sourceId = source.id;
        } else {
          // Создаём новый источник
          const { data: newSource } = await supabase
            .from("investment_sources")
            .insert({
              user_id: user.id,
              name: contract.counterpartyName,
              inn: contract.counterpartyInn,
              source_type: "private",
            })
            .select("id")
            .single();
          
          sourceId = newSource?.id || null;
        }
      }

      const investmentData = {
        user_id: user.id,
        source_id: sourceId,
        investment_number: contract.number,
        approved_amount: contract.amount,
        interest_rate: contract.interestRate,
        start_date: contract.startDate,
        due_date: contract.endDate,
        status: reverseMapStatus(contract.status),
        metadata: {
          synced_from_1c: true,
          sync_date: new Date().toISOString(),
          original_1c_id: contract.id,
        },
      };

      if (existing) {
        // Обновляем существующую
        await supabase
          .from("investments")
          .update(investmentData)
          .eq("id", existing.id);
        result.updated++;
      } else {
        // Создаём новую
        await supabase.from("investments").insert(investmentData);
        result.created++;
      }
    } catch (error) {
      const errorMsg = `Ошибка при обработке ${contract.number}: ${error instanceof Error ? error.message : "Unknown"}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Экспортирует начисления процентов в 1С
 */
export async function exportAccrualsTo1C(
  investmentId: string,
  periodStart: string,
  periodEnd: string
): Promise<OneCAccrual[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  // Получаем инвестицию
  const { data: investment } = await supabase
    .from("investments")
    .select("*")
    .eq("id", investmentId)
    .eq("user_id", user.id)
    .single();

  if (!investment) return [];

  // Рассчитываем проценты за период
  const days = Math.ceil(
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  
  const dailyRate = (investment.interest_rate || 0) / 365 / 100;
  const interestAmount = Math.round(investment.approved_amount * dailyRate * days);

  const accruals: OneCAccrual[] = [];

  // Начисление процентов
  if (interestAmount > 0) {
    accruals.push({
      id: `${investmentId}-interest-${periodEnd}`,
      contractId: investmentId,
      date: periodEnd,
      type: "interest",
      amount: interestAmount,
      period: `${periodStart} - ${periodEnd}`,
    });
  }

  // Начисление пени (если есть просрочка)
  if (investment.status === "overdue" && investment.penalty_rate) {
    const penaltyAmount = Math.round(
      investment.approved_amount * (investment.penalty_rate / 100) * days
    );
    
    if (penaltyAmount > 0) {
      accruals.push({
        id: `${investmentId}-penalty-${periodEnd}`,
        contractId: investmentId,
        date: periodEnd,
        type: "penalty",
        amount: penaltyAmount,
        period: `${periodStart} - ${periodEnd}`,
      });
    }
  }

  return accruals;
}

/**
 * Экспортирует акт сверки в формат 1С
 */
export async function exportReconciliationActTo1C(
  actId: string
): Promise<OneCReconciliationAct | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: act } = await supabase
    .from("investor_reconciliation_acts")
    .select("*")
    .eq("id", actId)
    .eq("user_id", user.id)
    .single();

  if (!act) return null;

  return {
    id: act.id,
    contractId: act.investment_id,
    periodStart: act.period_start,
    periodEnd: act.period_end,
    openingDebt: act.opening_balance,
    closingDebt: act.closing_balance,
    totalAccrued: act.total_invested,
    totalPaid: act.total_returned,
    signed: act.status === "confirmed",
  };
}

/**
 * Генерирует XML для обмена с 1С
 */
export function generateOneCExchangeXML(
  contracts: OneCLoanContract[],
  accruals: OneCAccrual[]
): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.10" ДатаФормирования="${new Date().toISOString()}">
  <ДоговорыЗайма>
    ${contracts.map((c) => `
    <Договор>
      <Ид>${c.id}</Ид>
      <Номер>${c.number}</Номер>
      <Дата>${c.date}</Дата>
      <Контрагент>
        <Ид>${c.counterpartyId}</Ид>
        <Наименование>${escapeXML(c.counterpartyName)}</Наименование>
        <ИНН>${c.counterpartyInn}</ИНН>
      </Контрагент>
      <Сумма>${c.amount / 100}</Сумма>
      <Ставка>${c.interestRate}</Ставка>
      <ДатаНачала>${c.startDate}</ДатаНачала>
      <ДатаОкончания>${c.endDate}</ДатаОкончания>
      <Статус>${c.status}</Статус>
    </Договор>`).join("")}
  </ДоговорыЗайма>
  <Начисления>
    ${accruals.map((a) => `
    <Начисление>
      <Ид>${a.id}</Ид>
      <ДоговорИд>${a.contractId}</ДоговорИд>
      <Дата>${a.date}</Дата>
      <Тип>${a.type}</Тип>
      <Сумма>${a.amount / 100}</Сумма>
      <Период>${a.period}</Период>
    </Начисление>`).join("")}
  </Начисления>
</КоммерческаяИнформация>`;

  return xml;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapStatus(status: string): "active" | "closed" | "overdue" {
  switch (status) {
    case "active":
    case "in_progress":
      return "active";
    case "completed":
    case "returned":
      return "closed";
    case "overdue":
      return "overdue";
    default:
      return "active";
  }
}

function reverseMapStatus(status: "active" | "closed" | "overdue"): string {
  switch (status) {
    case "active":
      return "active";
    case "closed":
      return "completed";
    case "overdue":
      return "overdue";
    default:
      return "pending";
  }
}
