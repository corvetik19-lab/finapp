"use server";

import { createRSCClient } from "@/lib/supabase/server";
import type { Investment, InvestmentTransaction } from "./types";
import { formatMoney } from "./calculations";

// ============================================
// Генерация отчётов по инвестициям
// ============================================

export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export interface SummaryReport {
  period: ReportPeriod;
  totalSources: number;
  activeSources: number;
  totalInvestments: number;
  activeInvestments: number;
  completedInvestments: number;
  overdueInvestments: number;
  totalInvested: number;
  totalInterest: number;
  totalReturned: number;
  totalRemaining: number;
  bySource: SourceSummary[];
  byStatus: StatusSummary[];
}

export interface SourceSummary {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  investmentsCount: number;
  totalAmount: number;
  totalInterest: number;
  returnedAmount: number;
}

export interface StatusSummary {
  status: string;
  count: number;
  totalAmount: number;
}

export interface InvestmentReport {
  investment: Investment;
  transactions: InvestmentTransaction[];
  balance: {
    principal: number;
    interest: number;
    paid: number;
    remaining: number;
  };
  daysUntilDue: number;
  isOverdue: boolean;
}

/**
 * Генерация сводного отчёта
 */
export async function generateSummaryReport(period?: ReportPeriod): Promise<SummaryReport> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const now = new Date();
  const startDate = period?.startDate || new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const endDate = period?.endDate || now.toISOString().split("T")[0];

  // Получаем источники
  const { data: sources } = await supabase
    .from("investment_sources")
    .select("*")
    .eq("user_id", user.id);

  // Получаем инвестиции за период
  const { data: investments } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .eq("user_id", user.id)
    .gte("investment_date", startDate)
    .lte("investment_date", endDate);

  const allInvestments = investments || [];
  const allSources = sources || [];

  // Подсчёт статистики
  const activeInvestments = allInvestments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );
  const completedInvestments = allInvestments.filter((i) => i.status === "completed");
  const overdueInvestments = allInvestments.filter((i) => i.status === "overdue");

  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0);
  const totalInterest = activeInvestments.reduce((sum, i) => sum + i.interest_amount, 0);
  const totalReturned = allInvestments.reduce(
    (sum, i) => sum + i.returned_principal + i.returned_interest, 0
  );
  const totalRemaining = activeInvestments.reduce(
    (sum, i) => sum + i.total_return_amount - i.returned_principal - i.returned_interest, 0
  );

  // Группировка по источникам
  const bySource: SourceSummary[] = allSources.map((source) => {
    const sourceInvestments = allInvestments.filter((i) => i.source_id === source.id);
    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.source_type,
      investmentsCount: sourceInvestments.length,
      totalAmount: sourceInvestments.reduce((sum, i) => sum + i.approved_amount, 0),
      totalInterest: sourceInvestments.reduce((sum, i) => sum + i.interest_amount, 0),
      returnedAmount: sourceInvestments.reduce(
        (sum, i) => sum + i.returned_principal + i.returned_interest, 0
      ),
    };
  });

  // Группировка по статусам
  const statusCounts: Record<string, { count: number; totalAmount: number }> = {};
  allInvestments.forEach((inv) => {
    if (!statusCounts[inv.status]) {
      statusCounts[inv.status] = { count: 0, totalAmount: 0 };
    }
    statusCounts[inv.status].count++;
    statusCounts[inv.status].totalAmount += inv.approved_amount;
  });

  const byStatus: StatusSummary[] = Object.entries(statusCounts).map(([status, data]) => ({
    status,
    count: data.count,
    totalAmount: data.totalAmount,
  }));

  return {
    period: { startDate, endDate },
    totalSources: allSources.length,
    activeSources: allSources.filter((s) => s.is_active).length,
    totalInvestments: allInvestments.length,
    activeInvestments: activeInvestments.length,
    completedInvestments: completedInvestments.length,
    overdueInvestments: overdueInvestments.length,
    totalInvested,
    totalInterest,
    totalReturned,
    totalRemaining,
    bySource,
    byStatus,
  };
}

/**
 * Генерация детального отчёта по инвестиции
 */
export async function generateInvestmentReport(investmentId: string): Promise<InvestmentReport> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  // Получаем инвестицию
  const { data: investment, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(*)
    `)
    .eq("id", investmentId)
    .eq("user_id", user.id)
    .single();

  if (error || !investment) throw new Error("Инвестиция не найдена");

  // Получаем транзакции
  const { data: transactions } = await supabase
    .from("investment_transactions")
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  const today = new Date();
  const dueDate = new Date(investment.due_date);
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0 && investment.status !== "completed";

  const paid = investment.returned_principal + investment.returned_interest;
  const remaining = investment.total_return_amount - paid;

  return {
    investment,
    transactions: transactions || [],
    balance: {
      principal: investment.approved_amount,
      interest: investment.interest_amount,
      paid,
      remaining,
    },
    daysUntilDue,
    isOverdue,
  };
}

/**
 * Генерация текстового отчёта (для экспорта)
 */
export async function generateTextReport(period?: ReportPeriod): Promise<string> {
  const report = await generateSummaryReport(period);
  
  let text = `ОТЧЁТ ПО ИНВЕСТИЦИЯМ\n`;
  text += `Период: ${report.period.startDate} - ${report.period.endDate}\n`;
  text += `${"=".repeat(50)}\n\n`;

  text += `ОБЩАЯ СТАТИСТИКА\n`;
  text += `-`.repeat(30) + `\n`;
  text += `Источников: ${report.totalSources} (активных: ${report.activeSources})\n`;
  text += `Инвестиций: ${report.totalInvestments}\n`;
  text += `  - Активных: ${report.activeInvestments}\n`;
  text += `  - Завершённых: ${report.completedInvestments}\n`;
  text += `  - Просроченных: ${report.overdueInvestments}\n\n`;

  text += `ФИНАНСОВЫЕ ПОКАЗАТЕЛИ\n`;
  text += `-`.repeat(30) + `\n`;
  text += `Привлечено: ${formatMoney(report.totalInvested)}\n`;
  text += `Начислено процентов: ${formatMoney(report.totalInterest)}\n`;
  text += `Возвращено: ${formatMoney(report.totalReturned)}\n`;
  text += `К возврату: ${formatMoney(report.totalRemaining)}\n\n`;

  text += `ПО ИСТОЧНИКАМ\n`;
  text += `-`.repeat(30) + `\n`;
  for (const source of report.bySource) {
    if (source.investmentsCount > 0) {
      text += `${source.sourceName}: ${source.investmentsCount} инв., ${formatMoney(source.totalAmount)}\n`;
    }
  }

  return text;
}

/**
 * Экспорт данных в CSV формат
 */
export async function exportInvestmentsToCSV(): Promise<string> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data: investments } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(name)
    `)
    .eq("user_id", user.id)
    .order("investment_date", { ascending: false });

  if (!investments?.length) return "";

  const headers = [
    "Номер",
    "Дата",
    "Источник",
    "Сумма",
    "Ставка %",
    "Срок дней",
    "Дата возврата",
    "Проценты",
    "К возврату",
    "Возвращено",
    "Статус",
  ];

  const rows = investments.map((inv) => [
    inv.investment_number,
    inv.investment_date,
    inv.source?.name || "",
    (inv.approved_amount / 100).toFixed(2),
    inv.interest_rate,
    inv.period_days,
    inv.due_date,
    (inv.interest_amount / 100).toFixed(2),
    (inv.total_return_amount / 100).toFixed(2),
    ((inv.returned_principal + inv.returned_interest) / 100).toFixed(2),
    inv.status,
  ]);

  return [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
}
