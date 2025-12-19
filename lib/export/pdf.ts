import { logger } from "@/lib/logger";
/**
 * PDF экспорт финансовых отчётов
 * Требуется: npm install jspdf jspdf-autotable
 */

// Типы для использования без установленной библиотеки
type Transaction = {
  date: string;
  description: string;
  category: string;
  amount: number;
  direction: string;
};

type ExportData = {
  transactions: Transaction[];
  period: { start: string; end: string };
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  categoryBreakdown: { category: string; amount: number }[];
};

/**
 * Генерация PDF отчёта
 */
export async function generatePDFReport(data: ExportData): Promise<Blob> {
  // Динамический импорт для избежания ошибок при отсутствии библиотеки
  try {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    type JsPDFWithAutoTable = InstanceType<typeof jsPDF> & {
      autoTable: typeof autoTable;
      lastAutoTable?: { finalY: number };
    };
    const doc = new jsPDF() as JsPDFWithAutoTable;

    // Заголовок
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Финансовый отчёт", 14, 20);

    // Период
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Период: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`,
      14,
      28
    );

    // Сводная информация
    let yPos = 40;
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Сводка", 14, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);

    const summaryData = [
      ["Доходы", formatMoney(data.summary.totalIncome)],
      ["Расходы", formatMoney(data.summary.totalExpense)],
      ["Баланс", formatMoney(data.summary.balance)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["Показатель", "Сумма"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 },
    });

    // Расходы по категориям
    yPos = (doc.lastAutoTable?.finalY ?? yPos) + 15;
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Расходы по категориям", 14, yPos);

    const categoryData = data.categoryBreakdown
      .sort((a, b) => b.amount - a.amount)
      .map((item) => [item.category, formatMoney(item.amount)]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [["Категория", "Сумма"]],
      body: categoryData,
      theme: "striped",
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 10 },
    });

    // Транзакции
    if (data.transactions.length > 0) {
      yPos = (doc.lastAutoTable?.finalY ?? yPos) + 15;
      
      // Если не помещаются, добавляем новую страницу
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text("Детализация транзакций", 14, yPos);

      const transactionsData = data.transactions.map((t) => [
        formatDate(t.date),
        t.description || "-",
        t.category,
        t.direction === "income" ? "Доход" : "Расход",
        formatMoney(t.amount),
      ]);

      autoTable(doc, {
        startY: yPos + 5,
        head: [["Дата", "Описание", "Категория", "Тип", "Сумма"]],
        body: transactionsData,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30, halign: "right" },
        },
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Создано: ${new Date().toLocaleDateString("ru-RU")}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Страница ${i} из ${pageCount}`,
        doc.internal.pageSize.width - 40,
        doc.internal.pageSize.height - 10
      );
    }

    return doc.output("blob");
  } catch (error) {
    logger.error("PDF generation error:", error);
    throw new Error("Не удалось создать PDF. Установите библиотеку: npm install jspdf jspdf-autotable");
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

export type { ExportData };
