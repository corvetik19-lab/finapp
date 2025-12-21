"use server";

// import { logger } from "@/lib/logger";

// =====================================================
// Парсер прайс-листов (Excel/CSV)
// =====================================================

export interface PricelistItem {
  article?: string;
  name: string;
  description?: string;
  unit?: string;
  price: number;
  oldPrice?: number;
  quantity?: number;
  minOrder?: number;
  category?: string;
}

export interface ParsedPricelist {
  items: PricelistItem[];
  errors: { row: number; message: string }[];
  totalRows: number;
  validRows: number;
}

export interface PricelistColumnMapping {
  article?: string;
  name?: string;
  description?: string;
  unit?: string;
  price?: string;
  oldPrice?: string;
  quantity?: string;
  minOrder?: string;
  category?: string;
}

// Алиасы колонок для автомаппинга
const COLUMN_ALIASES: Record<keyof PricelistColumnMapping, string[]> = {
  article: ["артикул", "article", "sku", "код", "code", "номер", "арт", "арт."],
  name: ["название", "наименование", "name", "товар", "product", "позиция", "номенклатура"],
  description: ["описание", "description", "desc", "характеристики", "примечание"],
  unit: ["единица", "ед.", "unit", "ед.изм.", "единица измерения", "uom"],
  price: ["цена", "price", "стоимость", "cost", "цена руб", "цена, руб"],
  oldPrice: ["старая цена", "old_price", "цена до скидки", "была цена", "прежняя цена"],
  quantity: ["количество", "qty", "quantity", "остаток", "наличие", "в наличии", "stock"],
  minOrder: ["мин. заказ", "min_order", "минимальный заказ", "от", "мин."],
  category: ["категория", "category", "группа", "раздел", "тип"],
};

/**
 * Автоматическое определение маппинга колонок
 */
export function detectPricelistMapping(headers: string[]): PricelistColumnMapping {
  const mapping: PricelistColumnMapping = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const index = normalizedHeaders.findIndex(
        (h) => h === alias || h.includes(alias)
      );
      if (index !== -1) {
        mapping[field as keyof PricelistColumnMapping] = headers[index];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Парсинг цены из строки
 */
function parsePrice(value: string): number | null {
  if (!value) return null;

  // Убираем всё кроме цифр, точки и запятой
  let cleaned = value.replace(/[^\d.,]/g, "");
  
  // Заменяем запятую на точку
  cleaned = cleaned.replace(",", ".");
  
  // Если несколько точек - оставляем последнюю как десятичный разделитель
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  }

  const price = parseFloat(cleaned);
  return isNaN(price) ? null : Math.round(price * 100); // В копейках
}

/**
 * Парсинг количества из строки
 */
function parseQuantity(value: string): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[^\d]/g, "");
  const qty = parseInt(cleaned, 10);
  return isNaN(qty) ? null : qty;
}

/**
 * Парсинг строки прайс-листа
 */
export function parsePricelistRow(
  row: Record<string, string>,
  mapping: PricelistColumnMapping,
  rowNumber: number
): { item?: PricelistItem; error?: string } {
  const getValue = (field: keyof PricelistColumnMapping): string => {
    const column = mapping[field];
    return column ? row[column]?.trim() || "" : "";
  };

  const name = getValue("name");
  if (!name) {
    return { error: `Строка ${rowNumber}: отсутствует название товара` };
  }

  const priceStr = getValue("price");
  const price = parsePrice(priceStr);
  if (price === null || price <= 0) {
    return { error: `Строка ${rowNumber}: некорректная цена "${priceStr}"` };
  }

  const item: PricelistItem = {
    name,
    price,
    article: getValue("article") || undefined,
    description: getValue("description") || undefined,
    unit: getValue("unit") || "шт",
    oldPrice: parsePrice(getValue("oldPrice")) || undefined,
    quantity: parseQuantity(getValue("quantity")) || undefined,
    minOrder: parseQuantity(getValue("minOrder")) || undefined,
    category: getValue("category") || undefined,
  };

  return { item };
}

/**
 * Парсинг CSV-контента прайс-листа
 */
export function parsePricelistCSV(
  content: string,
  customMapping?: PricelistColumnMapping
): ParsedPricelist {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  
  if (lines.length === 0) {
    return { items: [], errors: [{ row: 0, message: "Файл пуст" }], totalRows: 0, validRows: 0 };
  }

  // Определяем разделитель
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  // Парсим заголовки
  const headers = parseCSVLine(firstLine, delimiter);
  
  // Определяем маппинг
  const mapping = customMapping || detectPricelistMapping(headers);
  
  if (!mapping.name || !mapping.price) {
    return {
      items: [],
      errors: [{ row: 1, message: "Не удалось определить колонки 'Название' и 'Цена'" }],
      totalRows: lines.length - 1,
      validRows: 0,
    };
  }

  const items: PricelistItem[] = [];
  const errors: { row: number; message: string }[] = [];

  // Парсим строки данных
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const result = parsePricelistRow(row, mapping, i + 1);
    
    if (result.item) {
      items.push(result.item);
    } else if (result.error) {
      errors.push({ row: i + 1, message: result.error });
    }
  }

  return {
    items,
    errors,
    totalRows: lines.length - 1,
    validRows: items.length,
  };
}

/**
 * Парсит одну строку CSV
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Сравнение цен двух прайс-листов
 */
export interface PriceComparison {
  article?: string;
  name: string;
  supplier1Price?: number;
  supplier2Price?: number;
  priceDiff?: number;
  priceDiffPercent?: number;
  cheaperSupplier?: 1 | 2;
}

export function comparePricelists(
  pricelist1: PricelistItem[],
  pricelist2: PricelistItem[]
): PriceComparison[] {
  const comparisons: PriceComparison[] = [];
  const processed = new Set<string>();

  // Создаём индекс по артикулу и названию
  const index2ByArticle = new Map<string, PricelistItem>();
  const index2ByName = new Map<string, PricelistItem>();
  
  for (const item of pricelist2) {
    if (item.article) {
      index2ByArticle.set(item.article.toLowerCase(), item);
    }
    index2ByName.set(item.name.toLowerCase(), item);
  }

  // Сравниваем позиции из первого прайса
  for (const item1 of pricelist1) {
    const key = item1.article?.toLowerCase() || item1.name.toLowerCase();
    
    if (processed.has(key)) continue;
    processed.add(key);

    // Ищем соответствие во втором прайсе
    let item2: PricelistItem | undefined;
    if (item1.article) {
      item2 = index2ByArticle.get(item1.article.toLowerCase());
    }
    if (!item2) {
      item2 = index2ByName.get(item1.name.toLowerCase());
    }

    const comparison: PriceComparison = {
      article: item1.article,
      name: item1.name,
      supplier1Price: item1.price,
      supplier2Price: item2?.price,
    };

    if (item2) {
      comparison.priceDiff = item1.price - item2.price;
      comparison.priceDiffPercent = Math.round(
        ((item1.price - item2.price) / item1.price) * 100
      );
      comparison.cheaperSupplier = item1.price <= item2.price ? 1 : 2;
    }

    comparisons.push(comparison);
  }

  // Добавляем позиции только из второго прайса
  for (const item2 of pricelist2) {
    const key = item2.article?.toLowerCase() || item2.name.toLowerCase();
    
    if (processed.has(key)) continue;
    processed.add(key);

    comparisons.push({
      article: item2.article,
      name: item2.name,
      supplier2Price: item2.price,
    });
  }

  return comparisons;
}
