"use server";

import type { Investment, InvestmentSource, ReturnScheduleItem } from "./types";
import { INVESTMENT_STATUS_LABELS, INTEREST_TYPE_LABELS } from "./types";
import { formatMoney } from "./calculations";
import { getInvestmentById, getSchedule, getTransactions, getSources, getInvestments } from "./service";
import { generateSummaryReport } from "./reports";

// ============================================
// Генерация PDF отчётов по инвестициям
// ============================================

export interface PdfReportData {
  title: string;
  generatedAt: string;
  content: string;
  filename: string;
}

/**
 * Генерация отчёта по инвестиции (договор займа)
 */
export async function generateInvestmentPdfReport(investmentId: string): Promise<PdfReportData> {
  const investment = await getInvestmentById(investmentId);
  if (!investment) throw new Error("Инвестиция не найдена");

  const schedule = await getSchedule(investmentId);
  await getTransactions(investmentId); // Used for future enhancements

  const content = generateInvestmentHtml(investment, schedule);
  
  return {
    title: `Инвестиция ${investment.investment_number}`,
    generatedAt: new Date().toISOString(),
    content,
    filename: `investment_${investment.investment_number}_${Date.now()}.pdf`,
  };
}

/**
 * Генерация сводного отчёта по всем инвестициям
 */
export async function generateSummaryPdfReport(period?: {
  startDate: string;
  endDate: string;
}): Promise<PdfReportData> {
  const report = await generateSummaryReport(period);
  const investments = await getInvestments();
  const sources = await getSources();

  const content = generateSummaryHtml(report, investments, sources);
  
  return {
    title: "Сводный отчёт по инвестициям",
    generatedAt: new Date().toISOString(),
    content,
    filename: `investments_summary_${Date.now()}.pdf`,
  };
}

/**
 * Генерация графика платежей
 */
export async function generateSchedulePdfReport(investmentId: string): Promise<PdfReportData> {
  const investment = await getInvestmentById(investmentId);
  if (!investment) throw new Error("Инвестиция не найдена");

  const schedule = await getSchedule(investmentId);
  const content = generateScheduleHtml(investment, schedule);
  
  return {
    title: `График платежей ${investment.investment_number}`,
    generatedAt: new Date().toISOString(),
    content,
    filename: `schedule_${investment.investment_number}_${Date.now()}.pdf`,
  };
}

/**
 * Генерация акта сверки
 */
export async function generateReconciliationPdfReport(investmentId: string): Promise<PdfReportData> {
  const investment = await getInvestmentById(investmentId);
  if (!investment) throw new Error("Инвестиция не найдена");

  const transactions = await getTransactions(investmentId);
  const content = generateReconciliationHtml(investment, transactions);
  
  return {
    title: `Акт сверки ${investment.investment_number}`,
    generatedAt: new Date().toISOString(),
    content,
    filename: `reconciliation_${investment.investment_number}_${Date.now()}.pdf`,
  };
}

// ============================================
// HTML генераторы для PDF
// ============================================

function generateInvestmentHtml(investment: Investment, schedule: ReturnScheduleItem[]): string {
  const today = new Date().toLocaleDateString("ru-RU");
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 40px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 30px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .label { color: #666; }
    .value { font-weight: bold; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .signature { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
  </style>
</head>
<body>
  <h1>ДОГОВОР ЗАЙМА №${investment.investment_number}</h1>
  
  <div class="header">
    <span>Дата: ${new Date(investment.investment_date).toLocaleDateString("ru-RU")}</span>
    <span>Сформировано: ${today}</span>
  </div>

  <h2>Стороны договора</h2>
  <p><strong>Займодавец:</strong> ${investment.source?.name || "—"}</p>
  ${investment.source?.inn ? `<p>ИНН: ${investment.source.inn}${investment.source.kpp ? `, КПП: ${investment.source.kpp}` : ""}</p>` : ""}
  ${investment.source?.bank_name ? `<p>Банк: ${investment.source.bank_name}, р/с: ${investment.source.bank_account}</p>` : ""}

  <h2>Условия займа</h2>
  <table>
    <tr><td class="label" width="40%">Сумма займа:</td><td class="value">${formatMoney(investment.approved_amount)}</td></tr>
    <tr><td class="label">Процентная ставка:</td><td class="value">${investment.interest_rate}% (${INTEREST_TYPE_LABELS[investment.interest_type]})</td></tr>
    <tr><td class="label">Срок:</td><td class="value">${investment.period_days} дней</td></tr>
    <tr><td class="label">Дата возврата:</td><td class="value">${new Date(investment.due_date).toLocaleDateString("ru-RU")}</td></tr>
    <tr><td class="label">Сумма процентов:</td><td class="value">${formatMoney(investment.interest_amount)}</td></tr>
    <tr><td class="label">Всего к возврату:</td><td class="value">${formatMoney(investment.total_return_amount)}</td></tr>
  </table>

  ${investment.purpose ? `<p><strong>Назначение:</strong> ${investment.purpose}</p>` : ""}
  ${investment.notes ? `<p><strong>Примечания:</strong> ${investment.notes}</p>` : ""}

  <h2>Текущее состояние</h2>
  <table>
    <tr><td class="label" width="40%">Статус:</td><td class="value">${INVESTMENT_STATUS_LABELS[investment.status]}</td></tr>
    <tr><td class="label">Возвращено основного долга:</td><td class="value">${formatMoney(investment.returned_principal)}</td></tr>
    <tr><td class="label">Возвращено процентов:</td><td class="value">${formatMoney(investment.returned_interest)}</td></tr>
    <tr><td class="label">Остаток к возврату:</td><td class="value">${formatMoney(investment.total_return_amount - investment.returned_principal - investment.returned_interest)}</td></tr>
  </table>

  ${schedule.length > 0 ? `
  <h2>График платежей</h2>
  <table>
    <tr>
      <th>№</th>
      <th>Дата</th>
      <th class="text-right">Основной долг</th>
      <th class="text-right">Проценты</th>
      <th class="text-right">Всего</th>
      <th class="text-center">Статус</th>
    </tr>
    ${schedule.map(item => `
    <tr>
      <td class="text-center">${item.payment_number}</td>
      <td>${new Date(item.scheduled_date).toLocaleDateString("ru-RU")}</td>
      <td class="text-right">${formatMoney(item.principal_amount)}</td>
      <td class="text-right">${formatMoney(item.interest_amount)}</td>
      <td class="text-right">${formatMoney(item.total_amount)}</td>
      <td class="text-center">${item.status === "paid" ? "Оплачен" : item.status === "partial" ? "Частично" : "Ожидает"}</td>
    </tr>
    `).join("")}
  </table>
  ` : ""}

  <div class="signature">
    <div>
      <div class="signature-line">Займодавец</div>
    </div>
    <div>
      <div class="signature-line">Заёмщик</div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateSummaryHtml(report: Awaited<ReturnType<typeof generateSummaryReport>>, investments: Investment[], sources: InvestmentSource[]): string {
  // Функция используется для генерации HTML отчётов
  void report; void investments; void sources;
  const today = new Date().toLocaleDateString("ru-RU");
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 40px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 30px; }
    h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .summary-box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
  </style>
</head>
<body>
  <h1>СВОДНЫЙ ОТЧЁТ ПО ИНВЕСТИЦИЯМ</h1>
  
  <p class="text-center">Период: ${report.period.startDate} — ${report.period.endDate}</p>
  <p class="text-center">Дата формирования: ${today}</p>

  <h2>Общая статистика</h2>
  <div class="summary-box">
    <div class="summary-row"><span>Всего источников:</span><span><strong>${report.totalSources}</strong> (активных: ${report.activeSources})</span></div>
    <div class="summary-row"><span>Всего инвестиций:</span><span><strong>${report.totalInvestments}</strong></span></div>
    <div class="summary-row"><span>Активных:</span><span>${report.activeInvestments}</span></div>
    <div class="summary-row"><span>Завершённых:</span><span>${report.completedInvestments}</span></div>
    <div class="summary-row"><span>Просроченных:</span><span style="color: red;">${report.overdueInvestments}</span></div>
  </div>

  <h2>Финансовые показатели</h2>
  <table>
    <tr><td width="50%">Привлечено средств:</td><td class="text-right"><strong>${formatMoney(report.totalInvested)}</strong></td></tr>
    <tr><td>Начислено процентов:</td><td class="text-right">${formatMoney(report.totalInterest)}</td></tr>
    <tr><td>Возвращено:</td><td class="text-right">${formatMoney(report.totalReturned)}</td></tr>
    <tr><td>К возврату:</td><td class="text-right"><strong>${formatMoney(report.totalRemaining)}</strong></td></tr>
  </table>

  <h2>По источникам</h2>
  <table>
    <tr>
      <th>Источник</th>
      <th>Тип</th>
      <th class="text-center">Кол-во</th>
      <th class="text-right">Сумма</th>
      <th class="text-right">Проценты</th>
      <th class="text-right">Возвращено</th>
    </tr>
    ${report.bySource.filter(s => s.investmentsCount > 0).map(source => `
    <tr>
      <td>${source.sourceName}</td>
      <td>${source.sourceType}</td>
      <td class="text-center">${source.investmentsCount}</td>
      <td class="text-right">${formatMoney(source.totalAmount)}</td>
      <td class="text-right">${formatMoney(source.totalInterest)}</td>
      <td class="text-right">${formatMoney(source.returnedAmount)}</td>
    </tr>
    `).join("")}
  </table>

  <h2>Детализация по инвестициям</h2>
  <table>
    <tr>
      <th>Номер</th>
      <th>Источник</th>
      <th>Дата</th>
      <th class="text-right">Сумма</th>
      <th class="text-right">К возврату</th>
      <th class="text-center">Статус</th>
    </tr>
    ${investments.slice(0, 50).map(inv => `
    <tr>
      <td>${inv.investment_number}</td>
      <td>${inv.source?.name || "—"}</td>
      <td>${new Date(inv.investment_date).toLocaleDateString("ru-RU")}</td>
      <td class="text-right">${formatMoney(inv.approved_amount)}</td>
      <td class="text-right">${formatMoney(inv.total_return_amount - inv.returned_principal - inv.returned_interest)}</td>
      <td class="text-center">${INVESTMENT_STATUS_LABELS[inv.status]}</td>
    </tr>
    `).join("")}
  </table>
</body>
</html>
  `;
}

function generateScheduleHtml(investment: Investment, schedule: ReturnScheduleItem[]): string {
  const today = new Date().toLocaleDateString("ru-RU");
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 40px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .paid { background: #e8f5e9; }
    .overdue { background: #ffebee; }
  </style>
</head>
<body>
  <h1>ГРАФИК ПЛАТЕЖЕЙ</h1>
  <p class="text-center">Инвестиция №${investment.investment_number} от ${investment.source?.name}</p>
  <p class="text-center">Сформировано: ${today}</p>

  <table style="margin-bottom: 30px;">
    <tr><td width="40%">Сумма займа:</td><td>${formatMoney(investment.approved_amount)}</td></tr>
    <tr><td>Ставка:</td><td>${investment.interest_rate}% ${INTEREST_TYPE_LABELS[investment.interest_type]}</td></tr>
    <tr><td>Срок:</td><td>${investment.period_days} дней (до ${new Date(investment.due_date).toLocaleDateString("ru-RU")})</td></tr>
  </table>

  <table>
    <tr>
      <th class="text-center">№</th>
      <th>Дата платежа</th>
      <th class="text-right">Основной долг</th>
      <th class="text-right">Проценты</th>
      <th class="text-right">Всего</th>
      <th class="text-right">Оплачено</th>
      <th class="text-center">Статус</th>
    </tr>
    ${schedule.map(item => {
      const rowClass = item.status === "paid" ? "paid" : item.status === "overdue" ? "overdue" : "";
      return `
      <tr class="${rowClass}">
        <td class="text-center">${item.payment_number}</td>
        <td>${new Date(item.scheduled_date).toLocaleDateString("ru-RU")}</td>
        <td class="text-right">${formatMoney(item.principal_amount)}</td>
        <td class="text-right">${formatMoney(item.interest_amount)}</td>
        <td class="text-right">${formatMoney(item.total_amount)}</td>
        <td class="text-right">${formatMoney(item.paid_amount)}</td>
        <td class="text-center">${item.status === "paid" ? "✓ Оплачен" : item.status === "partial" ? "Частично" : item.status === "overdue" ? "⚠ Просрочен" : "Ожидает"}</td>
      </tr>
      `;
    }).join("")}
    <tr style="font-weight: bold; background: #f0f0f0;">
      <td colspan="2">ИТОГО:</td>
      <td class="text-right">${formatMoney(schedule.reduce((s, i) => s + i.principal_amount, 0))}</td>
      <td class="text-right">${formatMoney(schedule.reduce((s, i) => s + i.interest_amount, 0))}</td>
      <td class="text-right">${formatMoney(schedule.reduce((s, i) => s + i.total_amount, 0))}</td>
      <td class="text-right">${formatMoney(schedule.reduce((s, i) => s + i.paid_amount, 0))}</td>
      <td></td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateReconciliationHtml(investment: Investment, transactions: Awaited<ReturnType<typeof getTransactions>>): string {
  const today = new Date().toLocaleDateString("ru-RU");
  
  const txTypeLabels: Record<string, string> = {
    receipt: "Получение займа",
    return_principal: "Возврат основного долга",
    return_interest: "Возврат процентов",
    penalty: "Пеня",
    adjustment: "Корректировка",
  };

  let runningBalance = 0;
  const txWithBalance = transactions.map(tx => {
    if (tx.transaction_type === "receipt") {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    return { ...tx, balance: runningBalance };
  });

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; margin: 40px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .income { color: green; }
    .expense { color: red; }
    .signature { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-block { width: 45%; }
    .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }
  </style>
</head>
<body>
  <h1>АКТ СВЕРКИ ВЗАИМНЫХ РАСЧЁТОВ</h1>
  <p class="text-center">по договору займа №${investment.investment_number}</p>
  <p class="text-center">за период с ${new Date(investment.investment_date).toLocaleDateString("ru-RU")} по ${today}</p>

  <p><strong>Займодавец:</strong> ${investment.source?.name}</p>
  <p><strong>Заёмщик:</strong> ____________________</p>

  <table>
    <tr>
      <th>Дата</th>
      <th>Операция</th>
      <th>Документ</th>
      <th class="text-right">Дебет</th>
      <th class="text-right">Кредит</th>
      <th class="text-right">Сальдо</th>
    </tr>
    <tr>
      <td>${new Date(investment.investment_date).toLocaleDateString("ru-RU")}</td>
      <td>Начальное сальдо</td>
      <td>—</td>
      <td class="text-right">—</td>
      <td class="text-right">—</td>
      <td class="text-right">0,00 ₽</td>
    </tr>
    ${txWithBalance.map(tx => `
    <tr>
      <td>${new Date(tx.transaction_date).toLocaleDateString("ru-RU")}</td>
      <td>${txTypeLabels[tx.transaction_type] || tx.transaction_type}</td>
      <td>${tx.document_number || "—"}</td>
      <td class="text-right ${tx.transaction_type === "receipt" ? "income" : ""}">${tx.transaction_type === "receipt" ? formatMoney(tx.amount) : "—"}</td>
      <td class="text-right ${tx.transaction_type !== "receipt" ? "expense" : ""}">${tx.transaction_type !== "receipt" ? formatMoney(tx.amount) : "—"}</td>
      <td class="text-right">${formatMoney(tx.balance)}</td>
    </tr>
    `).join("")}
    <tr style="font-weight: bold; background: #f0f0f0;">
      <td colspan="3">Итого:</td>
      <td class="text-right">${formatMoney(transactions.filter(t => t.transaction_type === "receipt").reduce((s, t) => s + t.amount, 0))}</td>
      <td class="text-right">${formatMoney(transactions.filter(t => t.transaction_type !== "receipt").reduce((s, t) => s + t.amount, 0))}</td>
      <td class="text-right">${formatMoney(txWithBalance.length > 0 ? txWithBalance[txWithBalance.length - 1].balance : 0)}</td>
    </tr>
  </table>

  <p><strong>Задолженность на ${today}:</strong> ${formatMoney(investment.total_return_amount - investment.returned_principal - investment.returned_interest)} в пользу Займодавца</p>

  <div class="signature">
    <div class="signature-block">
      <p><strong>От Займодавца:</strong></p>
      <div class="signature-line">Подпись / ФИО</div>
    </div>
    <div class="signature-block">
      <p><strong>От Заёмщика:</strong></p>
      <div class="signature-line">Подпись / ФИО</div>
    </div>
  </div>
</body>
</html>
  `;
}
