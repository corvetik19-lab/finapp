import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";

type PdfMakeWithVfs = typeof pdfMake & { vfs: Record<string, string> };
const fontsModule = pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> };
(pdfMake as PdfMakeWithVfs).vfs = fontsModule.pdfMake?.vfs || fontsModule.vfs || {};

interface PDFReportOptions {
  user: { email: string; name: string };
  period: { start: Date; end: Date; label: string };
  transactions: Array<{
    id: string; date: string; occurred_at: string; amount: number; direction: string;
    categories?: { name: string } | null;
  }>;
  budgets: Array<{ id: string; amount: number; categories?: { name: string } | null }>;
  accounts: Array<{ id: string; name: string; balance: number; currency: string }>;
  options: {
    includeCharts: boolean;
    includeAccounts: boolean;
    includeBudgets: boolean;
    includeCategories: boolean;
    includeTransactions: boolean;
  };
}

export async function generatePDFReport(data: PDFReportOptions): Promise<Buffer> {
  const income = data.transactions.filter((t) => t.direction === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = data.transactions.filter((t) => t.direction === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const balance = income - expense;
  const totalAccounts = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const categoryTotals = new Map<string, number>();
  data.transactions.filter((t) => t.direction === "expense").forEach((t) => {
    const cat = t.categories?.name || "Без категории";
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(t.amount));
  });
  const topCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const content: Content = [
    { text: "FinApp - Финансовый Отчёт", style: "header", color: "#2980b9" },
    { text: `Период: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`, style: "subheader" },
    { text: `Пользователь: ${data.user.name} (${data.user.email})`, style: "info" },
    { text: `Сгенерировано: ${formatDate(new Date())}`, style: "info", margin: [0, 0, 0, 20] },
    { text: "Сводка", style: "sectionHeader" },
    {
      columns: [
        { width: "*", stack: [{ text: "Доходы", style: "label" }, { text: formatMoney(income), style: "income" }] },
        { width: "*", stack: [{ text: "Расходы", style: "label" }, { text: formatMoney(expense), style: "expense" }] },
        { width: "*", stack: [{ text: "Баланс", style: "label" }, { text: formatMoney(balance), style: balance >= 0 ? "income" : "expense" }] },
        { width: "*", stack: [{ text: "Всего на счетах", style: "label" }, { text: formatMoney(totalAccounts), style: "info" }] },
      ],
      margin: [0, 0, 0, 20],
    },
    ...(data.options.includeAccounts && data.accounts.length > 0
      ? [{ text: "Счета", style: "sectionHeader" } as Content, { ul: data.accounts.map((acc) => `${acc.name}: ${formatMoney(acc.balance)}`), margin: [0, 0, 0, 20] } as Content]
      : []),
    ...(data.options.includeBudgets && data.budgets.length > 0
      ? [{ text: "Бюджеты", style: "sectionHeader" } as Content, { ul: data.budgets.map((budget) => `${budget.categories?.name || "Без категории"}: ${formatMoney(Number(budget.amount) || 0)}`), margin: [0, 0, 0, 20] } as Content]
      : []),
    ...(data.options.includeCategories && topCategories.length > 0
      ? [{ text: "Топ-5 категорий расходов", style: "sectionHeader" } as Content, { ol: topCategories.map(([category, amount]) => `${category}: ${formatMoney(amount)}`), margin: [0, 0, 0, 20] } as Content]
      : []),
    ...(data.options.includeTransactions && data.transactions.length > 0
      ? [
          { text: "Последние транзакции", style: "sectionHeader" } as Content,
          {
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto"],
              body: [
                [{ text: "Дата", style: "tableHeader" }, { text: "Описание", style: "tableHeader" }, { text: "Категория", style: "tableHeader" }, { text: "Сумма", style: "tableHeader" }],
                ...data.transactions.slice(0, 20).map((t) => [
                  formatDate(new Date(t.occurred_at || t.date)),
                  t.id.substring(0, 8) + "...",
                  (t.categories?.name || "Без категории").substring(0, 20),
                  { text: `${t.direction === "income" ? "+" : "-"}${formatMoney(Math.abs(t.amount))}`, color: t.direction === "income" ? "#27ae60" : "#e74c3c" },
                ]),
              ],
            },
            layout: "lightHorizontalLines",
          } as Content,
        ]
      : []),
  ];

  const docDefinition: TDocumentDefinitions = {
    content,
    styles: {
      header: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, color: "#666666", margin: [0, 0, 0, 5] },
      info: { fontSize: 12, color: "#666666", margin: [0, 0, 0, 5] },
      sectionHeader: { fontSize: 16, bold: true, margin: [0, 10, 0, 10] },
      label: { fontSize: 10, color: "#666666", margin: [0, 0, 0, 5] },
      income: { fontSize: 14, bold: true, color: "#27ae60" },
      expense: { fontSize: 14, bold: true, color: "#e74c3c" },
      tableHeader: { bold: true, fontSize: 10, color: "#333333", fillColor: "#eeeeee" },
    },
    defaultStyle: { font: "Roboto" },
    footer: (currentPage, pageCount) => ({
      text: `Страница ${currentPage} из ${pageCount} | FinApp © ${new Date().getFullYear()}`,
      alignment: "center",
      fontSize: 8,
      color: "#999999",
      margin: [0, 10, 0, 0],
    }),
    pageMargins: [40, 60, 40, 60],
  };

  return new Promise((resolve) => {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBuffer((buffer: Buffer) => { resolve(buffer); });
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount / 100);
}
