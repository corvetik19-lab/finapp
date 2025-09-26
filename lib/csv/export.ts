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
