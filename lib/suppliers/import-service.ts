"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import { SupplierCategory, CreateSupplierInput } from "./types";

// =====================================================
// Типы для импорта
// =====================================================

export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface SupplierImport {
  id: string;
  company_id: string;
  user_id: string;
  file_name: string;
  file_size?: number;
  status: ImportStatus;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  duplicate_count: number;
  errors: ImportError[];
  column_mapping?: ColumnMapping;
  options?: ImportOptions;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

export interface ColumnMapping {
  name?: string;
  short_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  phone?: string;
  email?: string;
  website?: string;
  legal_address?: string;
  actual_address?: string;
  category?: string;
  status?: string;
  rating?: string;
  tags?: string;
  description?: string;
}

export interface ImportOptions {
  updateExisting: boolean;
  skipDuplicates: boolean;
  defaultCategory?: string;
  defaultStatus?: string;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
  existingId?: string;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  columns: string[];
  sampleRows: ParsedRow[];
  suggestedMapping: ColumnMapping;
}

// =====================================================
// Константы маппинга колонок
// =====================================================

const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  name: ["название", "наименование", "name", "company", "компания", "организация", "поставщик"],
  short_name: ["краткое название", "short_name", "short", "краткое", "сокращение"],
  inn: ["инн", "inn", "tin"],
  kpp: ["кпп", "kpp"],
  ogrn: ["огрн", "ogrn", "огрнип"],
  phone: ["телефон", "phone", "тел", "tel", "mobile", "мобильный"],
  email: ["email", "почта", "e-mail", "емайл", "эл.почта"],
  website: ["сайт", "website", "web", "url", "www"],
  legal_address: ["юридический адрес", "юр.адрес", "legal_address", "адрес юр"],
  actual_address: ["фактический адрес", "факт.адрес", "actual_address", "адрес факт"],
  category: ["категория", "category", "тип", "type", "группа"],
  status: ["статус", "status", "состояние"],
  rating: ["рейтинг", "rating", "оценка"],
  tags: ["теги", "tags", "метки"],
  description: ["описание", "description", "комментарий", "примечание", "notes"],
};

// =====================================================
// Функции импорта
// =====================================================

export async function createImportSession(
  fileName: string,
  fileSize?: number
): Promise<SupplierImport | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("supplier_imports")
    .insert({
      company_id: companyId,
      user_id: user.id,
      file_name: fileName,
      file_size: fileSize,
      status: "pending",
      total_rows: 0,
      processed_rows: 0,
      success_count: 0,
      error_count: 0,
      duplicate_count: 0,
      errors: [],
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating import session:", error);
    return null;
  }

  return data as SupplierImport;
}

export async function getImportSession(id: string): Promise<SupplierImport | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_imports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Error fetching import session:", error);
    return null;
  }

  return data as SupplierImport;
}

export async function getImportHistory(limit = 10): Promise<SupplierImport[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_imports")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error fetching import history:", error);
    return [];
  }

  return data as SupplierImport[];
}

export async function suggestColumnMapping(columns: string[]): Promise<ColumnMapping> {
  const mapping: ColumnMapping = {};

  for (const column of columns) {
    const normalizedColumn = column.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => normalizedColumn.includes(alias) || alias.includes(normalizedColumn))) {
        mapping[field as keyof ColumnMapping] = column;
        break;
      }
    }
  }

  return mapping;
}

export async function parseCSV(
  content: string,
  mapping: ColumnMapping,
  options: ImportOptions
): Promise<{ rows: ParsedRow[]; preview: ImportPreview }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  // Получаем существующие ИНН для проверки дубликатов
  const { data: existingSuppliers } = await supabase
    .from("suppliers")
    .select("id, inn, name")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  const existingINNs = new Map<string, string>();
  existingSuppliers?.forEach(s => {
    if (s.inn) existingINNs.set(s.inn, s.id);
  });

  // Парсим CSV
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { rows: [], preview: { totalRows: 0, validRows: 0, errorRows: 0, duplicateRows: 0, columns: [], sampleRows: [], suggestedMapping: {} } };
  }

  // Определяем разделитель
  const firstLine = lines[0];
  const separator = firstLine.includes(";") ? ";" : ",";

  // Заголовки
  const headers = parseCSVLine(firstLine, separator);
  const suggestedMapping = await suggestColumnMapping(headers);

  // Данные
  const rows: ParsedRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
    const data: Record<string, string> = {};

    headers.forEach((header, index) => {
      data[header] = values[index] || "";
    });

    const row: ParsedRow = {
      rowNumber: i + 1,
      data,
      errors: [],
      isValid: true,
      isDuplicate: false,
    };

    // Проверяем обязательное поле name
    const nameColumn = mapping.name || suggestedMapping.name;
    const name = nameColumn ? data[nameColumn]?.trim() : "";
    if (!name) {
      row.errors.push("Отсутствует название компании");
      row.isValid = false;
    }

    // Проверяем ИНН на дубликаты
    const innColumn = mapping.inn || suggestedMapping.inn;
    const inn = innColumn ? data[innColumn]?.trim() : "";
    if (inn && existingINNs.has(inn)) {
      row.isDuplicate = true;
      row.existingId = existingINNs.get(inn);
      duplicateCount++;
    }

    // Валидация ИНН
    if (inn && !validateINN(inn)) {
      row.errors.push(`Некорректный ИНН: ${inn}`);
      row.isValid = false;
    }

    // Валидация email
    const emailColumn = mapping.email || suggestedMapping.email;
    const email = emailColumn ? data[emailColumn]?.trim() : "";
    if (email && !validateEmail(email)) {
      row.errors.push(`Некорректный email: ${email}`);
      row.isValid = false;
    }

    if (row.isValid) validCount++;
    else errorCount++;

    rows.push(row);
  }

  const preview: ImportPreview = {
    totalRows: rows.length,
    validRows: validCount,
    errorRows: errorCount,
    duplicateRows: duplicateCount,
    columns: headers,
    sampleRows: rows.slice(0, 5),
    suggestedMapping,
  };

  return { rows, preview };
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function validateINN(inn: string): boolean {
  if (!/^\d+$/.test(inn)) return false;
  if (inn.length !== 10 && inn.length !== 12) return false;

  const getCheckDigit = (inn: string, coefficients: number[]): number => {
    let sum = 0;
    for (let i = 0; i < coefficients.length; i++) {
      sum += parseInt(inn[i]) * coefficients[i];
    }
    return (sum % 11) % 10;
  };

  if (inn.length === 10) {
    const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    return getCheckDigit(inn, coefficients) === parseInt(inn[9]);
  }

  if (inn.length === 12) {
    const coefficients1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const coefficients2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    return (
      getCheckDigit(inn, coefficients1) === parseInt(inn[10]) &&
      getCheckDigit(inn, coefficients2) === parseInt(inn[11])
    );
  }

  return false;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function executeImport(
  importId: string,
  rows: ParsedRow[],
  mapping: ColumnMapping,
  options: ImportOptions,
  categories: SupplierCategory[]
): Promise<{ success: boolean; successCount: number; errorCount: number; errors: ImportError[] }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, successCount: 0, errorCount: 0, errors: [{ row: 0, message: "Компания не найдена" }] };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, successCount: 0, errorCount: 0, errors: [{ row: 0, message: "Пользователь не авторизован" }] };
  }

  // Обновляем статус на processing
  await supabase
    .from("supplier_imports")
    .update({ status: "processing", started_at: new Date().toISOString(), total_rows: rows.length })
    .eq("id", importId);

  const errors: ImportError[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Создаём карту категорий по названию
  const categoryMap = new Map<string, string>();
  categories.forEach(c => {
    categoryMap.set(c.name.toLowerCase(), c.id);
  });

  // Обрабатываем пакетами по 100
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const suppliersToInsert: CreateSupplierInput[] = [];
    const suppliersToUpdate: { id: string; data: Partial<CreateSupplierInput> }[] = [];

    for (const row of batch) {
      if (!row.isValid && !options.skipDuplicates) {
        row.errors.forEach(err => {
          errors.push({ row: row.rowNumber, message: err });
        });
        errorCount++;
        continue;
      }

      if (row.isDuplicate) {
        if (options.skipDuplicates) {
          continue;
        }
        if (options.updateExisting && row.existingId) {
          suppliersToUpdate.push({
            id: row.existingId,
            data: mapRowToSupplier(row.data, mapping, categoryMap, options),
          });
        }
        continue;
      }

      const supplierData = mapRowToSupplier(row.data, mapping, categoryMap, options);
      suppliersToInsert.push({
        ...supplierData,
        company_id: companyId,
        user_id: user.id,
      } as CreateSupplierInput);
    }

    // Вставляем новые
    if (suppliersToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("suppliers")
        .insert(suppliersToInsert);

      if (insertError) {
        logger.error("Error inserting suppliers batch:", insertError);
        errors.push({ row: i, message: `Ошибка пакета ${i}-${i + batchSize}: ${insertError.message}` });
        errorCount += suppliersToInsert.length;
      } else {
        successCount += suppliersToInsert.length;
      }
    }

    // Обновляем существующие
    for (const update of suppliersToUpdate) {
      const { error: updateError } = await supabase
        .from("suppliers")
        .update(update.data)
        .eq("id", update.id);

      if (updateError) {
        errors.push({ row: 0, message: `Ошибка обновления ${update.id}: ${updateError.message}` });
        errorCount++;
      } else {
        successCount++;
      }
    }

    // Обновляем прогресс
    await supabase
      .from("supplier_imports")
      .update({ processed_rows: Math.min(i + batchSize, rows.length), success_count: successCount, error_count: errorCount })
      .eq("id", importId);
  }

  // Финализируем импорт
  await supabase
    .from("supplier_imports")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      success_count: successCount,
      error_count: errorCount,
      errors,
    })
    .eq("id", importId);

  return { success: true, successCount, errorCount, errors };
}

function mapRowToSupplier(
  data: Record<string, string>,
  mapping: ColumnMapping,
  categoryMap: Map<string, string>,
  options: ImportOptions
): Partial<CreateSupplierInput> {
  const getValue = (field: keyof ColumnMapping): string => {
    const column = mapping[field];
    return column ? data[column]?.trim() || "" : "";
  };

  const categoryName = getValue("category").toLowerCase();
  const categoryId = categoryMap.get(categoryName) || options.defaultCategory;

  const statusValue = getValue("status").toLowerCase();
  const status = statusValue === "активный" || statusValue === "active" ? "active" :
                 statusValue === "неактивный" || statusValue === "inactive" ? "inactive" :
                 statusValue === "чёрный список" || statusValue === "blacklisted" ? "blacklisted" :
                 options.defaultStatus || "active";

  const ratingStr = getValue("rating");
  const rating = ratingStr ? Math.min(5, Math.max(1, parseInt(ratingStr) || 0)) : undefined;

  const tagsStr = getValue("tags");
  const tags = tagsStr ? tagsStr.split(/[,;]/).map(t => t.trim()).filter(Boolean) : [];

  return {
    name: getValue("name"),
    short_name: getValue("short_name") || undefined,
    inn: getValue("inn") || undefined,
    kpp: getValue("kpp") || undefined,
    ogrn: getValue("ogrn") || undefined,
    phone: getValue("phone") || undefined,
    email: getValue("email") || undefined,
    website: getValue("website") || undefined,
    legal_address: getValue("legal_address") || undefined,
    actual_address: getValue("actual_address") || undefined,
    category_id: categoryId,
    status: status as "active" | "inactive" | "blacklisted",
    rating,
    tags,
    description: getValue("description") || undefined,
  };
}

export async function cancelImport(importId: string): Promise<boolean> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_imports")
    .update({ status: "cancelled" })
    .eq("id", importId);

  if (error) {
    logger.error("Error cancelling import:", error);
    return false;
  }

  return true;
}

export async function downloadImportTemplate(): Promise<string> {
  const headers = [
    "Название",
    "Краткое название",
    "ИНН",
    "КПП",
    "ОГРН",
    "Телефон",
    "Email",
    "Сайт",
    "Юридический адрес",
    "Фактический адрес",
    "Категория",
    "Статус",
    "Рейтинг",
    "Теги",
    "Описание",
  ];

  const sampleData = [
    [
      "ООО Поставщик-1",
      "Поставщик-1",
      "7707123456",
      "770701001",
      "1027700123456",
      "+7 (495) 123-45-67",
      "info@supplier1.ru",
      "https://supplier1.ru",
      "г. Москва, ул. Примерная, д. 1",
      "г. Москва, ул. Фактическая, д. 2",
      "Материалы",
      "Активный",
      "5",
      "надёжный, быстрый",
      "Проверенный поставщик материалов",
    ],
    [
      "ИП Иванов И.И.",
      "Иванов",
      "123456789012",
      "",
      "304123456789012",
      "+7 (916) 987-65-43",
      "ivanov@mail.ru",
      "",
      "г. Подольск, ул. Ленина, д. 5",
      "",
      "Услуги",
      "Активный",
      "4",
      "местный",
      "ИП по услугам",
    ],
  ];

  const bom = "\uFEFF";
  const csv = [
    headers.join(";"),
    ...sampleData.map(row => row.join(";")),
  ].join("\n");

  return bom + csv;
}
