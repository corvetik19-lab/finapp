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

    // Комментарии и инструкции
    const commentRows = [
      {
        [REQUIRED_HEADERS.occurredAt]: "# ИНСТРУКЦИЯ: Дата в формате ДД.ММ.ГГГГ ЧЧ:ММ или ISO (2025-01-15T12:00:00Z)",
        [REQUIRED_HEADERS.direction]: "# Тип: расход, доход или перевод (expense, income, transfer)",
        [REQUIRED_HEADERS.amountMajor]: "# Сумма: число без пробелов или с пробелами (1500 или 1 500)",
        [OPTIONAL_HEADERS.accountName]: "# Счёт: название вашего счёта",
        [OPTIONAL_HEADERS.categoryName]: "# Категория: название категории",
        [OPTIONAL_HEADERS.counterparty]: "# Контрагент: кому платили/от кого получили",
        [OPTIONAL_HEADERS.note]: "# Заметка: комментарий",
        [OPTIONAL_HEADERS.tags]: "# Теги: через запятую",
      },
      {
        [REQUIRED_HEADERS.occurredAt]: "# ПРИМЕРЫ (можно удалить строки с примерами):",
        [REQUIRED_HEADERS.direction]: "",
        [REQUIRED_HEADERS.amountMajor]: "",
        [OPTIONAL_HEADERS.accountName]: "",
        [OPTIONAL_HEADERS.categoryName]: "",
        [OPTIONAL_HEADERS.counterparty]: "",
        [OPTIONAL_HEADERS.note]: "",
        [OPTIONAL_HEADERS.tags]: "",
      },
    ];

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

    const allRows = [...commentRows, ...exampleRows, ...emptyRows];

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
