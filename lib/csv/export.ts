export type ExportRow = {
  id: string;
  occurred_at: string;
  direction: string;
  amount: number;
  currency: string;
  account_id: string;
  category_id: string | null;
  counterparty: string | null;
  note: string | null;
};

export type ExportLookup = {
  accounts: Map<string, string>;
  categories: Map<string, string>;
};

export type TransactionItemExport = {
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_amount: number;
};

export type ExportRowWithItems = ExportRow & {
  items?: TransactionItemExport[];
};

function escapeCsv(value: string): string {
  const needsQuotes = value.includes(";") || value.includes("\n") || value.includes("\"");
  const sanitized = value.replace(/"/g, '""');
  return needsQuotes ? `"${sanitized}"` : sanitized;
}

function formatAmount(amountMinor: number): string {
  const major = Number(amountMinor) / 100;
  return major.toFixed(2);
}

export function buildExportCsv(rows: ExportRow[], lookup: ExportLookup): string {
  const header = [
    "ID",
    "Дата",
    "Тип",
    "Сумма",
    "Валюта",
    "Счёт",
    "Категория",
    "Контрагент",
    "Заметка",
  ];
  const lines: string[] = [header.join(";")];

  for (const row of rows) {
    const accountName = lookup.accounts.get(row.account_id) ?? "";
    const categoryName = row.category_id ? lookup.categories.get(row.category_id) ?? "" : "";

    const values = [
      row.id,
      new Date(row.occurred_at).toISOString(),
      row.direction,
      formatAmount(Number(row.amount)),
      row.currency,
      accountName,
      categoryName,
      row.counterparty ?? "",
      row.note ?? "",
    ].map((value) => escapeCsv(value.toString()));

    lines.push(values.join(";"));
  }

  return lines.join("\r\n");
}

/**
 * Экспорт транзакций с детализацией позиций товаров
 * Каждая позиция товара экспортируется как отдельная строка
 */
export function buildExportCsvWithItems(rows: ExportRowWithItems[], lookup: ExportLookup): string {
  const header = [
    "ID транзакции",
    "Дата",
    "Тип",
    "Сумма транзакции",
    "Валюта",
    "Счёт",
    "Категория",
    "Контрагент",
    "Заметка",
    "Товар",
    "Количество",
    "Единица",
    "Цена за ед.",
    "Сумма позиции",
  ];
  const lines: string[] = [header.join(";")];

  for (const row of rows) {
    const accountName = lookup.accounts.get(row.account_id) ?? "";
    const categoryName = row.category_id ? lookup.categories.get(row.category_id) ?? "" : "";

    const baseValues = [
      row.id,
      new Date(row.occurred_at).toISOString(),
      row.direction,
      formatAmount(Number(row.amount)),
      row.currency,
      accountName,
      categoryName,
      row.counterparty ?? "",
      row.note ?? "",
    ];

    if (row.items && row.items.length > 0) {
      // Если есть позиции товаров, создаём строку для каждой позиции
      for (const item of row.items) {
        const itemValues = [
          ...baseValues,
          item.name,
          item.quantity.toString(),
          item.unit,
          formatAmount(item.price_per_unit),
          formatAmount(item.total_amount),
        ].map((value) => escapeCsv(value.toString()));

        lines.push(itemValues.join(";"));
      }
    } else {
      // Если нет позиций, создаём одну строку с пустыми полями для товаров
      const values = [
        ...baseValues,
        "", // Товар
        "", // Количество
        "", // Единица
        "", // Цена за ед.
        "", // Сумма позиции
      ].map((value) => escapeCsv(value.toString()));

      lines.push(values.join(";"));
    }
  }

  return lines.join("\r\n");
}
