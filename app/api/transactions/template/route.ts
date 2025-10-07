import { NextResponse } from "next/server";
import { REQUIRED_HEADERS, OPTIONAL_HEADERS } from "@/lib/csv/import-schema";

// GET /api/transactions/template - скачать шаблон CSV для импорта транзакций
export async function GET() {
  try {
    // Формируем заголовки CSV (только нужные, без валюты)
    const headers = [
      REQUIRED_HEADERS.occurredAt,
      REQUIRED_HEADERS.direction,
      REQUIRED_HEADERS.amountMajor,
      OPTIONAL_HEADERS.accountName,
      OPTIONAL_HEADERS.categoryName,
      OPTIONAL_HEADERS.counterparty,
      OPTIONAL_HEADERS.note,
      OPTIONAL_HEADERS.tags,
    ];

    // Строка с инструкцией (будет как первая строка данных с пояснением)
    const instructionRow = {
      [REQUIRED_HEADERS.occurredAt]: "ОБЯЗАТЕЛЬНО: Дата в формате ДД.ММ.ГГГГ или ISO",
      [REQUIRED_HEADERS.direction]: "ОБЯЗАТЕЛЬНО: расход/доход/перевод",
      [REQUIRED_HEADERS.amountMajor]: "ОБЯЗАТЕЛЬНО: число (например 1500.50)",
      [OPTIONAL_HEADERS.accountName]: "Опционально: название счёта",
      [OPTIONAL_HEADERS.categoryName]: "Опционально: категория",
      [OPTIONAL_HEADERS.counterparty]: "Опционально: контрагент",
      [OPTIONAL_HEADERS.note]: "Опционально: заметка",
      [OPTIONAL_HEADERS.tags]: "Опционально: теги через запятую",
    };

    // Примеры транзакций
    const exampleRows = [
      {
        [REQUIRED_HEADERS.occurredAt]: "01.01.2025 12:00",
        [REQUIRED_HEADERS.direction]: "расход",
        [REQUIRED_HEADERS.amountMajor]: "1500.50",
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
        [OPTIONAL_HEADERS.accountName]: "",
        [OPTIONAL_HEADERS.categoryName]: "Транспорт",
        [OPTIONAL_HEADERS.counterparty]: "Яндекс Такси",
        [OPTIONAL_HEADERS.note]: "",
        [OPTIONAL_HEADERS.tags]: "",
      },
    ];

    // Пустые строки для заполнения
    const emptyRows = Array.from({ length: 5 }, () => ({
      [REQUIRED_HEADERS.occurredAt]: "",
      [REQUIRED_HEADERS.direction]: "",
      [REQUIRED_HEADERS.amountMajor]: "",
      [OPTIONAL_HEADERS.accountName]: "",
      [OPTIONAL_HEADERS.categoryName]: "",
      [OPTIONAL_HEADERS.counterparty]: "",
      [OPTIONAL_HEADERS.note]: "",
      [OPTIONAL_HEADERS.tags]: "",
    }));

    const allRows = [instructionRow, ...exampleRows, ...emptyRows];

    // Формируем CSV-строку
    const csvLines = [
      headers.join(";"), // Заголовки
      ...allRows.map((row) =>
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
