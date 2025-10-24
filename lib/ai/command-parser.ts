/**
 * Парсер команд для AI чата
 * Распознаёт естественные команды пользователя и преобразует их в структурированные данные
 */

export interface ParsedCommand {
  type: 'add_transaction' | 'show_balance' | 'show_stats' | 'unknown';
  data?: TransactionCommand | { category?: string } | Record<string, never>;
  confidence: number; // 0-1, уверенность в распознавании
}

export interface TransactionCommand {
  amount: number;
  description?: string;
  category?: string;
  type: 'income' | 'expense';
}

/**
 * Парсит команду добавления транзакции
 * Примеры:
 * - "Добавь 500 рублей на кофе"
 * - "Трата 1200р на продукты"
 * - "Доход 50000 зарплата"
 * - "Потратил 350 руб на обед"
 */
export function parseAddTransaction(text: string): TransactionCommand | null {
  // Детект типа транзакции
  const isExpense = /(?:трат|потрат|купи|оплат|заплат|списан|расход|минус)/i.test(text);
  const isIncome = /(?:доход|получ|заработ|зарплат|приход|плюс|заработал)/i.test(text);

  // Если не указан тип явно, по умолчанию расход
  const type: 'income' | 'expense' = isIncome && !isExpense ? 'income' : 'expense';

  // Парсинг суммы - поддерживает разные форматы
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:руб|₽|р|rub)/i, // "500 руб", "1500.50₽"
    /(?:руб|₽|р|rub)\s*(\d+(?:[.,]\d+)?)/i, // "₽500", "руб 1500"
    /(\d+(?:[.,]\d+)?)\s*(?:тысяч|тыс|к)/i, // "5 тысяч", "1.5к"
    /(\d{3,}(?:[.,]\d+)?)/i, // Просто число >= 100
  ];

  let amount: number | null = null;
  let multiplier = 1;

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(',', '.'));
      
      // Если указано в тысячах
      if (/тысяч|тыс|к/i.test(match[0])) {
        multiplier = 1000;
      }
      break;
    }
  }

  if (!amount || amount <= 0) {
    return null;
  }

  amount = amount * multiplier;

  // Парсинг описания и категории
  // Удаляем команду, сумму и валюту из текста
  let cleanText = text
    .replace(/(?:добав|трат|потрат|купи|оплат|заплат|списан|расход|доход|получ|заработ)/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*(?:руб|₽|р|rub|тысяч|тыс|к)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Убираем предлоги
  cleanText = cleanText.replace(/^(?:на|в|для|по|за)\s+/i, '');

  // Парсинг категории (после "на", "в", "для")
  let category: string | undefined;
  let description: string | undefined;

  // Популярные категории для автоопределения
  const categoryKeywords: Record<string, string[]> = {
    'Продукты': ['продукт', 'еда', 'еду', 'пища', 'магазин', 'супермаркет', 'пятёрочка', 'магнит'],
    'Кафе и рестораны': ['кафе', 'ресторан', 'обед', 'завтрак', 'ужин', 'кофе', 'пиво', 'бар'],
    'Транспорт': ['такси', 'uber', 'яндекс', 'метро', 'автобус', 'бензин', 'заправка', 'топливо'],
    'Здоровье': ['аптека', 'лекарств', 'врач', 'больниц', 'поликлиник', 'анализ'],
    'Развлечения': ['кино', 'театр', 'концерт', 'игр', 'подписк', 'netflix', 'spotify'],
    'Одежда': ['одежд', 'обувь', 'куртк', 'брюки', 'платье', 'футболк'],
    'Коммунальные': ['квартплат', 'коммунал', 'электричеств', 'газ', 'вода', 'интернет', 'телефон'],
    'Зарплата': ['зарплат', 'оклад', 'аванс', 'премия'],
    'Прочее': []
  };

  // Пытаемся определить категорию по ключевым словам
  const lowerClean = cleanText.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerClean.includes(keyword))) {
      category = cat;
      break;
    }
  }

  // Описание - весь оставшийся текст
  if (cleanText.length > 0) {
    description = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  }

  return {
    amount,
    description,
    category,
    type
  };
}

/**
 * Парсит команду показа баланса
 * Примеры:
 * - "Покажи баланс"
 * - "Сколько денег на счетах"
 * - "Мой баланс"
 */
export function isBalanceQuery(text: string): boolean {
  const patterns = [
    /(?:покажи|скажи|какой)\s+(?:мой\s+)?баланс/i,
    /сколько\s+(?:денег|средств|рублей)(?:\s+на\s+счет)?/i,
    /(?:мой|общий)\s+баланс/i,
    /баланс\s+счет/i,
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Парсит команду статистики расходов
 * Примеры:
 * - "Сколько я трачу на еду"
 * - "Расходы на транспорт"
 * - "Траты по категории продукты"
 */
export function parseStatsQuery(text: string): { category?: string } | null {
  const patterns = [
    /(?:сколько|траты|расход[ы]?)\s+(?:я\s+)?(?:трач[у]?|потрат|тратил)\s+на\s+([а-яё\s]+)/i,
    /(?:расход[ы]?|траты)\s+(?:на|по)\s+(?:категори[и]?\s+)?([а-яё\s]+)/i,
    /статистика\s+(?:по\s+)?([а-яё\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const category = match[1].trim();
      return { category };
    }
  }

  // Общие запросы без категории
  if (/(?:общ[ие]е|все)\s+(?:расход[ы]?|траты)/i.test(text)) {
    return {};
  }

  return null;
}

/**
 * Главная функция парсинга команды
 */
export function parseCommand(text: string): ParsedCommand {
  // Проверка на команду добавления транзакции
  if (/(?:добав|трат|потрат|купи|оплат|доход|получ)/i.test(text)) {
    const transaction = parseAddTransaction(text);
    if (transaction && transaction.amount > 0) {
      return {
        type: 'add_transaction',
        data: transaction,
        confidence: transaction.category ? 0.9 : 0.7
      };
    }
  }

  // Проверка на команду показа баланса
  if (isBalanceQuery(text)) {
    return {
      type: 'show_balance',
      confidence: 0.95
    };
  }

  // Проверка на статистику
  const statsQuery = parseStatsQuery(text);
  if (statsQuery !== null) {
    return {
      type: 'show_stats',
      data: statsQuery,
      confidence: statsQuery.category ? 0.85 : 0.75
    };
  }

  // Неизвестная команда - передаём в обычный AI чат
  return {
    type: 'unknown',
    confidence: 0
  };
}

/**
 * Форматирует сумму в рублях
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

/**
 * Форматирует ответ на команду показа баланса
 */
export function formatBalanceResponse(accounts: Array<{ name: string; balance: number; currency: string }>): string {
  if (accounts.length === 0) {
    return '📊 У вас пока нет счетов. Добавьте первый счёт в разделе "Карты".';
  }

  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  let response = '💰 **Ваши счета:**\n\n';
  
  accounts.forEach(acc => {
    const balance = formatMoney(acc.balance);
    const emoji = acc.balance >= 0 ? '💳' : '⚠️';
    response += `${emoji} **${acc.name}**: ${balance}\n`;
  });

  response += `\n**Итого:** ${formatMoney(total)}`;

  return response;
}

/**
 * Форматирует ответ на команду статистики
 */
export function formatStatsResponse(
  category: string | undefined,
  amount: number,
  count: number,
  period: string = 'месяц'
): string {
  const formattedAmount = formatMoney(amount);
  
  if (category) {
    return `📊 **Статистика по категории "${category}"** за ${period}:\n\n` +
           `💸 Потрачено: **${formattedAmount}**\n` +
           `📝 Транзакций: **${count}**\n` +
           `📈 Средний чек: **${formatMoney(count > 0 ? amount / count : 0)}**`;
  } else {
    return `📊 **Общая статистика расходов** за ${period}:\n\n` +
           `💸 Потрачено: **${formattedAmount}**\n` +
           `📝 Транзакций: **${count}**`;
  }
}

/**
 * Генерирует подтверждение для добавления транзакции
 */
export function formatTransactionConfirmation(transaction: TransactionCommand): string {
  const emoji = transaction.type === 'income' ? '💰' : '💸';
  const typeText = transaction.type === 'income' ? 'Доход' : 'Расход';
  const amount = formatMoney(transaction.amount);
  
  let text = `${emoji} **${typeText}**: ${amount}\n`;
  
  if (transaction.description) {
    text += `📝 ${transaction.description}\n`;
  }
  
  if (transaction.category) {
    text += `📂 Категория: ${transaction.category}\n`;
  }
  
  text += '\n✅ Транзакция создана!';
  
  return text;
}
