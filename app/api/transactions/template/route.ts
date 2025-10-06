import { NextResponse } from "next/server";
import { REQUIRED_HEADERS, OPTIONAL_HEADERS } from "@/lib/csv/import-schema";

// GET /api/transactions/template - скачать шаблон CSV для импорта транзакций
export async function GET() {
  try {
    // Формируем заголовки CSV (сначала обязательные, потом опциональные)
    const headers = [
      ...Object.values(REQUIRED_HEADERS),
      ...Object.values(OPTIONAL_HEADERS),
    ];

    // Создаём примеры данных для заполнения
    const exampleRows = [
      {
        [REQUIRED_HEADERS.occurredAt]: "01.01.2025 12:00",
        [REQUIRED_HEADERS.direction]: "расход",
        [REQUIRED_HEADERS.amountMajor]: "1500.50",
        [REQUIRED_HEADERS.currency]: "RUB",
        [OPTIONAL_HEADERS.externalId]: "",
        [OPTIONAL_HEADERS.accountName]: "Основная карта",
        [OPTIONAL_HEADERS.categoryName]: "Продукты",
        [OPTIONAL_HEADERS.counterparty]: "Магазин Пятёрочка",
        [OPTIONAL_HEADERS.note]: "Покупки на неделю",
        [OPTIONAL_HEADERS.tags]: "еда, дом",
      },
      {
        [REQUIRED_HEADERS.occurredAt]: "02.01.2025",
        [REQUIRED_HEADERS.direction]: "доход",
        [REQUIRED_HEADERS.amountMajor]: "50000",
        [REQUIRED_HEADERS.currency]: "RUB",
        [OPTIONAL_HEADERS.externalId]: "",
        [OPTIONAL_HEADERS.accountName]: "Зарплатная карта",
        [OPTIONAL_HEADERS.categoryName]: "Зарплата",
        [OPTIONAL_HEADERS.counterparty]: "ООО Рога и Копыта",
        [OPTIONAL_HEADERS.note]: "Аванс за январь",
        [OPTIONAL_HEADERS.tags]: "работа",
      },
      {
        [REQUIRED_HEADERS.occurredAt]: "2025-01-03T10:30:00Z",
        [REQUIRED_HEADERS.direction]: "expense",
        [REQUIRED_HEADERS.amountMajor]: "2500.00",
        [REQUIRED_HEADERS.currency]: "RUB",
        [OPTIONAL_HEADERS.externalId]: "",
        [OPTIONAL_HEADERS.accountName]: "",
        [OPTIONAL_HEADERS.categoryName]: "Транспорт",
        [OPTIONAL_HEADERS.counterparty]: "Яндекс Такси",
        [OPTIONAL_HEADERS.note]: "",
        [OPTIONAL_HEADERS.tags]: "",
      },
    ];

    // Формируем CSV-строку
    const csvLines = [
      headers.join(";"), // Заголовки
      ...exampleRows.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row] ?? "";
          // Экранируем значения, содержащие спецсимволы
          if (value.includes(";") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(";")
      ),
    ];

    const csvContent = csvLines.join("\n");

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions_template.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/transactions/template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
