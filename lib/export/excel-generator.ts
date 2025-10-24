/**
 * Генератор Excel отчётов с использованием exceljs
 * 
 * Создаёт Excel файл с несколькими листами:
 * - Сводка (общая статистика)
 * - Транзакции (детальный список)
 * - Категории (анализ по категориям)
 * - Бюджеты (состояние бюджетов)
 */

import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';

// Типы для данных из БД (Supabase возвращает массивы для nested relations)
interface DbTransaction {
  occurred_at: string;
  direction: string;
  amount: number;
  note?: string | null;
  categories: { name: string }[] | null;
  accounts: { name: string }[] | null;
}

interface DbAccount {
  name: string;
  type?: string;
  balance: number;
  currency: string;
}

interface DbBudget {
  limit_amount: number;
  currency?: string;
  period_start?: string;
  period_end?: string;
  categories: { name: string }[] | null;
}

interface ExcelExportOptions {
  userId: string;
  startDate?: string;
  endDate?: string;
  includeCharts?: boolean;
}

interface TransactionRow {
  date: string;
  direction: string;
  amount: number;
  category: string;
  account: string;
  note: string;
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  average: number;
  percentage: number;
}

interface ReportData {
  transactions: TransactionRow[];
  accounts: DbAccount[];
  budgets: DbBudget[];
  categories: CategorySummary[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  };
}

/**
 * Генерирует Excel отчёт
 */
export async function generateExcelReport(
  supabase: SupabaseClient,
  options: ExcelExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Метаданные
  workbook.creator = 'FinApp';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Получаем данные
  const data = await fetchReportData(supabase, options);

  // Создаём листы
  await createSummarySheet(workbook, data);
  await createTransactionsSheet(workbook, data.transactions);
  await createCategoriesSheet(workbook, data.categories);
  await createBudgetsSheet(workbook, data.budgets);

  // Возвращаем буфер
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Получает данные для отчёта
 */
async function fetchReportData(
  supabase: SupabaseClient,
  options: ExcelExportOptions
): Promise<ReportData> {
  const { userId, startDate, endDate } = options;

  // Транзакции
  let transactionsQuery = supabase
    .from('transactions')
    .select(`
      occurred_at,
      direction,
      amount,
      note,
      categories(name),
      accounts(name)
    `)
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (startDate) {
    transactionsQuery = transactionsQuery.gte('occurred_at', startDate);
  }
  if (endDate) {
    transactionsQuery = transactionsQuery.lte('occurred_at', endDate);
  }

  const { data: transactions } = await transactionsQuery;

  // Счета
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, type, balance, currency')
    .eq('user_id', userId)
    .is('deleted_at', null);

  // Бюджеты
  const { data: budgets } = await supabase
    .from('budgets')
    .select(`
      limit_amount,
      currency,
      period_start,
      period_end,
      categories(name)
    `)
    .eq('user_id', userId);

  // Преобразуем транзакции (извлекаем первый элемент из массивов)
  const transactionRows: TransactionRow[] = (transactions || []).map((t: DbTransaction) => ({
    date: new Date(t.occurred_at).toLocaleDateString('ru-RU'),
    direction: t.direction === 'income' ? 'Доход' : t.direction === 'expense' ? 'Расход' : 'Перевод',
    amount: t.amount / 100,
    category: (t.categories && t.categories.length > 0) ? t.categories[0].name : 'Без категории',
    account: (t.accounts && t.accounts.length > 0) ? t.accounts[0].name : 'Неизвестно',
    note: t.note || '',
  }));

  const totalIncome = transactionRows
    .filter(t => t.direction === 'Доход')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactionRows
    .filter(t => t.direction === 'Расход')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Группировка по категориям
  const categoryMap = new Map<string, { total: number; count: number }>();
  transactionRows
    .filter(t => t.direction === 'Расход')
    .forEach(t => {
      const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
      categoryMap.set(t.category, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    });

  const totalCategoryExpenses = Array.from(categoryMap.values())
    .reduce((sum, cat) => sum + cat.total, 0);

  const categories: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      average: data.total / data.count,
      percentage: totalCategoryExpenses > 0 ? (data.total / totalCategoryExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    transactions: transactionRows,
    accounts: accounts || [],
    budgets: budgets || [],
    categories,
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactionRows.length,
    },
  };
}

/**
 * Лист: Сводка
 */
async function createSummarySheet(
  workbook: ExcelJS.Workbook,
  data: ReportData
): Promise<void> {
  const sheet = workbook.addWorksheet('Сводка', {
    properties: { tabColor: { argb: 'FF3B82F6' } },
  });

  // Заголовок
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = '📊 Финансовая сводка';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF1F2937' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  // Период
  sheet.getCell('A2').value = 'Период:';
  sheet.getCell('B2').value = 'За всё время';
  sheet.getCell('A2').font = { bold: true };

  // Пустая строка
  sheet.addRow([]);

  // Основные показатели
  const metricsStartRow = 4;
  const metrics: Array<[string, string | number]> = [
    ['Показатель', 'Значение'],
    ['💰 Доходы', `${data.summary.totalIncome.toFixed(2)} ₽`],
    ['💸 Расходы', `${data.summary.totalExpense.toFixed(2)} ₽`],
    ['💵 Баланс', `${data.summary.balance.toFixed(2)} ₽`],
    ['📝 Транзакций', data.summary.transactionCount],
    ['📂 Категорий', data.categories.length],
  ];

  metrics.forEach((row, idx) => {
    const currentRow = sheet.getRow(metricsStartRow + idx);
    currentRow.values = row;
    
    if (idx === 0) {
      // Заголовок таблицы
      currentRow.font = { bold: true };
      currentRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
    } else {
      // Данные - проверяем тип перед использованием includes
      const label = String(row[0]);
      if (label.includes('Доходы')) {
        currentRow.getCell(2).font = { color: { argb: 'FF10B981' }, bold: true };
      } else if (label.includes('Расходы')) {
        currentRow.getCell(2).font = { color: { argb: 'FFEF4444' }, bold: true };
      } else if (label.includes('Баланс')) {
        currentRow.getCell(2).font = { 
          color: { argb: data.summary.balance >= 0 ? 'FF10B981' : 'FFEF4444' }, 
          bold: true 
        };
      }
    }
  });

  // Форматирование колонок
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 25;

  // Счета (если есть)
  if (data.accounts.length > 0) {
    const accountsStartRow = metricsStartRow + metrics.length + 2;
    sheet.getCell(`A${accountsStartRow}`).value = '💳 Счета:';
    sheet.getCell(`A${accountsStartRow}`).font = { bold: true, size: 14 };

    const accountsHeaderRow = accountsStartRow + 1;
    sheet.getRow(accountsHeaderRow).values = ['Название', 'Тип', 'Баланс', 'Валюта'];
    sheet.getRow(accountsHeaderRow).font = { bold: true };
    sheet.getRow(accountsHeaderRow).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    data.accounts.forEach((acc, idx) => {
      const row = sheet.getRow(accountsHeaderRow + 1 + idx);
      const accountType = acc.type === 'debit_card' ? 'Дебетовая' : 
                         acc.type === 'credit_card' ? 'Кредитная' : 'Наличные';
      row.values = [
        acc.name,
        accountType,
        (acc.balance / 100).toFixed(2),
        acc.currency || 'RUB',
      ];
    });
  }
}

/**
 * Лист: Транзакции
 */
async function createTransactionsSheet(
  workbook: ExcelJS.Workbook,
  transactions: TransactionRow[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Транзакции', {
    properties: { tabColor: { argb: 'FF8B5CF6' } },
  });

  // Заголовки
  const headers = ['Дата', 'Тип', 'Сумма (₽)', 'Категория', 'Счёт', 'Примечание'];
  sheet.addRow(headers);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B5CF6' },
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Данные
  transactions.forEach((t, idx) => {
    const row = sheet.addRow([
      t.date,
      t.direction,
      t.amount,
      t.category,
      t.account,
      t.note,
    ]);

    // Цвет для типа
    if (t.direction === 'Доход') {
      row.getCell(3).font = { color: { argb: 'FF10B981' }, bold: true };
    } else if (t.direction === 'Расход') {
      row.getCell(3).font = { color: { argb: 'FFEF4444' }, bold: true };
    }

    // Чередующийся фон
    if (idx % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }
  });

  // Форматирование колонок
  sheet.getColumn(1).width = 15; // Дата
  sheet.getColumn(2).width = 12; // Тип
  sheet.getColumn(3).width = 15; // Сумма
  sheet.getColumn(3).numFmt = '#,##0.00';
  sheet.getColumn(4).width = 20; // Категория
  sheet.getColumn(5).width = 20; // Счёт
  sheet.getColumn(6).width = 30; // Примечание

  // Автофильтр
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  // Закрепить заголовок
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

/**
 * Лист: Категории
 */
async function createCategoriesSheet(
  workbook: ExcelJS.Workbook,
  categories: CategorySummary[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Категории', {
    properties: { tabColor: { argb: 'FFEF4444' } },
  });

  // Заголовки
  const headers = ['Категория', 'Сумма (₽)', 'Кол-во', 'Средний чек (₽)', '% от общих расходов'];
  sheet.addRow(headers);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEF4444' },
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Данные
  categories.forEach((cat, idx) => {
    const row = sheet.addRow([
      cat.category,
      cat.total,
      cat.count,
      cat.average,
      cat.percentage.toFixed(1) + '%',
    ]);

    // Чередующийся фон
    if (idx % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }
  });

  // Форматирование колонок
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(2).numFmt = '#,##0.00';
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(4).numFmt = '#,##0.00';
  sheet.getColumn(5).width = 20;

  // Автофильтр
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  // Закрепить заголовок
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

/**
 * Лист: Бюджеты
 */
async function createBudgetsSheet(
  workbook: ExcelJS.Workbook,
  budgets: DbBudget[]
): Promise<void> {
  const sheet = workbook.addWorksheet('Бюджеты', {
    properties: { tabColor: { argb: 'FF10B981' } },
  });

  // Заголовки
  const headers = ['Категория', 'Лимит (₽)', 'Валюта', 'Период начало', 'Период конец'];
  sheet.addRow(headers);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' },
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Данные
  budgets.forEach((budget, idx) => {
    const categoryName = (budget.categories && budget.categories.length > 0) 
      ? budget.categories[0].name 
      : 'Без категории';
    
    const row = sheet.addRow([
      categoryName,
      budget.limit_amount / 100,
      budget.currency || 'RUB',
      budget.period_start ? new Date(budget.period_start).toLocaleDateString('ru-RU') : '',
      budget.period_end ? new Date(budget.period_end).toLocaleDateString('ru-RU') : '',
    ]);

    // Чередующийся фон
    if (idx % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }
  });

  // Форматирование колонок
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(2).numFmt = '#,##0.00';
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 15;

  // Автофильтр
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  // Закрепить заголовок
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}
