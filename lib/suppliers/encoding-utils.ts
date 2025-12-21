// =====================================================
// Утилиты для определения и конвертации кодировок
// =====================================================

/**
 * Определяет кодировку текста (UTF-8 или Windows-1251)
 */
export function detectEncoding(buffer: ArrayBuffer): "utf-8" | "windows-1251" {
  const bytes = new Uint8Array(buffer);
  
  // Проверяем BOM для UTF-8
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return "utf-8";
  }
  
  // Анализируем содержимое для определения кодировки
  let utf8Score = 0;
  let win1251Score = 0;
  
  for (let i = 0; i < Math.min(bytes.length, 10000); i++) {
    const byte = bytes[i];
    
    // UTF-8 мультибайтовые последовательности
    if (byte >= 0xC0 && byte <= 0xDF && i + 1 < bytes.length) {
      const next = bytes[i + 1];
      if (next >= 0x80 && next <= 0xBF) {
        utf8Score += 2;
        i++; // пропускаем следующий байт
        continue;
      }
    }
    
    if (byte >= 0xE0 && byte <= 0xEF && i + 2 < bytes.length) {
      const next1 = bytes[i + 1];
      const next2 = bytes[i + 2];
      if (next1 >= 0x80 && next1 <= 0xBF && next2 >= 0x80 && next2 <= 0xBF) {
        utf8Score += 3;
        i += 2;
        continue;
      }
    }
    
    // Windows-1251 кириллица (А-я: 0xC0-0xFF)
    if (byte >= 0xC0 && byte <= 0xFF) {
      win1251Score += 1;
    }
    
    // Частые русские буквы в Windows-1251
    // а(0xE0), е(0xE5), и(0xE8), о(0xEE), н(0xED), т(0xF2), с(0xF1), р(0xF0)
    if ([0xE0, 0xE5, 0xE8, 0xEE, 0xED, 0xF2, 0xF1, 0xF0].includes(byte)) {
      win1251Score += 0.5;
    }
  }
  
  // Если есть валидные UTF-8 последовательности - это UTF-8
  if (utf8Score > win1251Score * 0.5) {
    return "utf-8";
  }
  
  // Если много байтов в диапазоне кириллицы Windows-1251
  if (win1251Score > 10) {
    return "windows-1251";
  }
  
  return "utf-8"; // по умолчанию
}

/**
 * Декодирует ArrayBuffer в строку с учётом кодировки
 */
export function decodeText(buffer: ArrayBuffer, encoding?: "utf-8" | "windows-1251"): string {
  const detectedEncoding = encoding || detectEncoding(buffer);
  
  if (detectedEncoding === "utf-8") {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
  }
  
  // Windows-1251 декодирование
  return decodeWindows1251(buffer);
}

/**
 * Декодирует Windows-1251 в строку
 */
function decodeWindows1251(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const win1251Map: Record<number, string> = {
    // Кириллица А-Я (0xC0-0xDF)
    0xC0: "А", 0xC1: "Б", 0xC2: "В", 0xC3: "Г", 0xC4: "Д", 0xC5: "Е", 0xC6: "Ж", 0xC7: "З",
    0xC8: "И", 0xC9: "Й", 0xCA: "К", 0xCB: "Л", 0xCC: "М", 0xCD: "Н", 0xCE: "О", 0xCF: "П",
    0xD0: "Р", 0xD1: "С", 0xD2: "Т", 0xD3: "У", 0xD4: "Ф", 0xD5: "Х", 0xD6: "Ц", 0xD7: "Ч",
    0xD8: "Ш", 0xD9: "Щ", 0xDA: "Ъ", 0xDB: "Ы", 0xDC: "Ь", 0xDD: "Э", 0xDE: "Ю", 0xDF: "Я",
    // Кириллица а-я (0xE0-0xFF)
    0xE0: "а", 0xE1: "б", 0xE2: "в", 0xE3: "г", 0xE4: "д", 0xE5: "е", 0xE6: "ж", 0xE7: "з",
    0xE8: "и", 0xE9: "й", 0xEA: "к", 0xEB: "л", 0xEC: "м", 0xED: "н", 0xEE: "о", 0xEF: "п",
    0xF0: "р", 0xF1: "с", 0xF2: "т", 0xF3: "у", 0xF4: "ф", 0xF5: "х", 0xF6: "ц", 0xF7: "ч",
    0xF8: "ш", 0xF9: "щ", 0xFA: "ъ", 0xFB: "ы", 0xFC: "ь", 0xFD: "э", 0xFE: "ю", 0xFF: "я",
    // Специальные символы
    0xA8: "Ё", 0xB8: "ё",
    0x96: "–", 0x97: "—", // дефисы
    0xAB: "«", 0xBB: "»", // кавычки
    0xA0: " ", // неразрывный пробел
    0xB9: "№",
  };
  
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } else if (win1251Map[byte]) {
      result += win1251Map[byte];
    } else {
      result += String.fromCharCode(byte);
    }
  }
  
  return result;
}

/**
 * Парсит CSV с автоопределением разделителя
 */
export function parseCSVContent(content: string): {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
} {
  // Определяем разделитель
  const firstLines = content.split("\n").slice(0, 5).join("\n");
  const semicolonCount = (firstLines.match(/;/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;
  
  let delimiter = ",";
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }
  
  // Парсим CSV
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter };
  }
  
  // Парсим заголовки
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Парсим строки данных
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });
    
    rows.push(row);
  }
  
  return { headers, rows, delimiter };
}

/**
 * Парсит одну строку CSV с учётом кавычек
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
        // Экранированная кавычка
        current += '"';
        i++;
      } else {
        // Переключаем режим кавычек
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
 * Читает файл как ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Определяет тип файла
 */
export function getFileType(file: File): "csv" | "xlsx" | "xls" | "unknown" {
  const name = file.name.toLowerCase();
  const type = file.type;
  
  if (name.endsWith(".csv") || type === "text/csv") {
    return "csv";
  }
  if (name.endsWith(".xlsx") || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "xlsx";
  }
  if (name.endsWith(".xls") || type === "application/vnd.ms-excel") {
    return "xls";
  }
  
  return "unknown";
}

/**
 * Генерирует CSV-шаблон для импорта
 */
export function generateImportTemplate(): string {
  const headers = [
    "Название компании",
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
    "Описание"
  ];
  
  const exampleRow = [
    "ООО «Пример»",
    "Пример",
    "7707083893",
    "770701001",
    "1027700132195",
    "+7 (495) 123-45-67",
    "info@example.ru",
    "https://example.ru",
    "г. Москва, ул. Примерная, д. 1",
    "г. Москва, ул. Примерная, д. 1",
    "Строительство",
    "active",
    "5",
    "надёжный;проверенный",
    "Описание поставщика"
  ];
  
  // Используем точку с запятой для совместимости с Excel в русской локали
  return [
    headers.join(";"),
    exampleRow.join(";")
  ].join("\n");
}
