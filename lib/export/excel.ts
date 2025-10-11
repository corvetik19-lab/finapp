/**
 * Excel экспорт финансовых отчётов
 * Требуется: npm install exceljs
 */

import type { ExportData } from "./pdf";

/**
 * Генерация Excel отчёта
 */
export async function generateExcelReport(data: ExportData): Promise<Blob> {
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    // Метаданные
    workbook.creator = "FinApp";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Лист 1: Сводка
    const summarySheet = workbook.addWorksheet("Сводка");
    summarySheet.columns = [
      { header: "Показатель", key: "name", width: 30 },
      { header: "Значение", key: "value", width: 20 },
    ];

    // Заголовок
    summarySheet.getCell("A1").value = "Финансовый отчёт";
    summarySheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF4F46E5" } };
    summarySheet.mergeCells("A1:B1");

    // Период
    summarySheet.getCell("A2").value = `Период: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`;
    summarySheet.getCell("A2").font = { size: 11, color: { argb: "FF6B7280" } };
    summarySheet.mergeCells("A2:B2");

    summarySheet.addRow({});

    // Сводные данные
    summarySheet.addRow({ name: "Показатель", value: "Сумма" });
    const headerRow = summarySheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    summarySheet.addRow({
      name: "Доходы",
      value: formatMoney(data.summary.totalIncome),
    });
    summarySheet.addRow({
      name: "Расходы",
      value: formatMoney(data.summary.totalExpense),
    });
    summarySheet.addRow({
      name: "Баланс",
      value: formatMoney(data.summary.balance),
    });

    // Стиль для баланса
    const balanceRow = summarySheet.getRow(7);
    balanceRow.font = { bold: true };
    balanceRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: data.summary.balance >= 0 ? "FFD1FAE5" : "FFFEE2E2" },
    };

    // Лист 2: Расходы по категориям
    const categorySheet = workbook.addWorksheet("По категориям");
    categorySheet.columns = [
      { header: "Категория", key: "category", width: 30 },
      { header: "Сумма", key: "amount", width: 20 },
      { header: "% от расходов", key: "percentage", width: 15 },
    ];

    // Заголовок
    const catHeaderRow = categorySheet.getRow(1);
    catHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    catHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8B5CF6" },
    };

    // Данные
    const sortedCategories = data.categoryBreakdown.sort((a, b) => b.amount - a.amount);
    sortedCategories.forEach((item) => {
      const percentage = data.summary.totalExpense > 0
        ? ((item.amount / data.summary.totalExpense) * 100).toFixed(1)
        : "0.0";

      categorySheet.addRow({
        category: item.category,
        amount: formatMoney(item.amount),
        percentage: `${percentage}%`,
      });
    });

    // Лист 3: Все транзакции
    const transactionsSheet = workbook.addWorksheet("Транзакции");
    transactionsSheet.columns = [
      { header: "Дата", key: "date", width: 12 },
      { header: "Описание", key: "description", width: 40 },
      { header: "Категория", key: "category", width: 25 },
      { header: "Тип", key: "direction", width: 12 },
      { header: "Сумма", key: "amount", width: 15 },
    ];

    // Заголовок
    const txHeaderRow = transactionsSheet.getRow(1);
    txHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    txHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };

    // Данные
    data.transactions.forEach((tx) => {
      const row = transactionsSheet.addRow({
        date: formatDate(tx.date),
        description: tx.description || "-",
        category: tx.category,
        direction: tx.direction === "income" ? "Доход" : "Расход",
        amount: formatMoney(tx.amount),
      });

      // Цветовое выделение для типа
      if (tx.direction === "income") {
        row.getCell(5).font = { color: { argb: "FF059669" } };
      } else {
        row.getCell(5).font = { color: { argb: "FFDC2626" } };
      }
    });

    // Автофильтры
    summarySheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 7, column: 2 },
    };
    transactionsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.transactions.length + 1, column: 5 },
    };

    // Генерация
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (error) {
    console.error("Excel generation error:", error);
    throw new Error("Не удалось создать Excel. Установите библиотеку: npm install exceljs");
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
