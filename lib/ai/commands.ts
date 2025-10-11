import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * AI команды через естественный язык
 */

export type CommandType =
  | "add_transaction"
  | "show_balance"
  | "show_stats"
  | "show_budget"
  | "create_budget"
  | "unknown";

export interface ParsedCommand {
  type: CommandType;
  confidence: number; // 0-100%
  params: {
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
    direction?: "income" | "expense";
    period?: string;
  };
  original: string;
  suggestion?: string;
}

/**
 * AI парсинг команды из текста
 */
export async function parseCommand(text: string): Promise<ParsedCommand> {
  try {
    const prompt = `Ты помощник финансового приложения. Проанализируй команду пользователя и определи что он хочет сделать.

Команда: "${text}"

Возможные типы команд:
- add_transaction: добавить транзакцию (доход или расход)
- show_balance: показать баланс
- show_stats: показать статистику трат
- show_budget: показать бюджет
- create_budget: создать бюджет
- unknown: не понятно что хочет пользователь

Верни JSON в формате:
{
  "type": "тип_команды",
  "confidence": 0-100,
  "params": {
    "amount": число_в_копейках_или_null,
    "category": "название_категории_или_null",
    "description": "описание_или_null",
    "direction": "income_или_expense_или_null"
  }
}

Примеры:
"Добавь 500р на кофе" -> {"type": "add_transaction", "confidence": 95, "params": {"amount": 50000, "category": "Кафе", "direction": "expense"}}
"Покажи баланс" -> {"type": "show_balance", "confidence": 100, "params": {}}
"Сколько трачу на продукты" -> {"type": "show_stats", "confidence": 90, "params": {"category": "Продукты"}}

Только JSON, без пояснений.`;

    const { text: response } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.3,
    });

    // Парсим JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type,
        confidence: parsed.confidence || 50,
        params: parsed.params || {},
        original: text,
      };
    }

    // Fallback
    return simpleParse(text);
  } catch (error) {
    console.error("Command parsing error:", error);
    return simpleParse(text);
  }
}

/**
 * Простой парсинг команд без AI (fallback)
 */
function simpleParse(text: string): ParsedCommand {
  const lower = text.toLowerCase();

  // Добавить транзакцию
  if (
    lower.includes("добав") ||
    lower.includes("потрат") ||
    lower.includes("купил") ||
    lower.includes("заплатил")
  ) {
    // Ищем сумму
    const amountMatch = text.match(/(\d+)\s*(р|руб|₽)?/);
    const amount = amountMatch ? parseInt(amountMatch[1]) * 100 : undefined;

    // Ищем категорию (слова после "на")
    const categoryMatch = text.match(/на\s+([а-яё]+)/i);
    const category = categoryMatch ? categoryMatch[1] : undefined;

    return {
      type: "add_transaction",
      confidence: 70,
      params: {
        amount,
        category,
        direction: "expense",
      },
      original: text,
      suggestion: amount
        ? `Добавить расход ${amount / 100}₽${category ? ` на ${category}` : ""}?`
        : "Укажите сумму",
    };
  }

  // Показать баланс
  if (lower.includes("баланс") || lower.includes("остаток")) {
    return {
      type: "show_balance",
      confidence: 90,
      params: {},
      original: text,
    };
  }

  // Показать статистику
  if (
    lower.includes("сколько") ||
    lower.includes("трачу") ||
    lower.includes("трат") ||
    lower.includes("статистик")
  ) {
    // Ищем категорию
    const categoryMatch = text.match(/на\s+([а-яё]+)/i);
    const category = categoryMatch ? categoryMatch[1] : undefined;

    return {
      type: "show_stats",
      confidence: 80,
      params: {
        category,
        period: "month",
      },
      original: text,
    };
  }

  // Показать бюджет
  if (lower.includes("бюджет")) {
    return {
      type: "show_budget",
      confidence: 85,
      params: {},
      original: text,
    };
  }

  return {
    type: "unknown",
    confidence: 0,
    params: {},
    original: text,
    suggestion: "Попробуйте: 'Добавь 500р на кофе' или 'Покажи баланс'",
  };
}

/**
 * Генерация быстрых команд (подсказки)
 */
export function getQuickCommands(): {
  label: string;
  command: string;
  icon: string;
}[] {
  return [
    {
      label: "Показать баланс",
      command: "Покажи баланс всех счетов",
      icon: "💰",
    },
    {
      label: "Траты за месяц",
      command: "Сколько я потратил за месяц?",
      icon: "📊",
    },
    {
      label: "Бюджеты",
      command: "Покажи мои бюджеты",
      icon: "🎯",
    },
    {
      label: "Добавить расход",
      command: "Добавь 500р на кофе",
      icon: "➕",
    },
    {
      label: "Топ категорий",
      command: "На что я больше всего трачу?",
      icon: "📈",
    },
    {
      label: "Прогноз",
      command: "Сколько я потрачу в следующем месяце?",
      icon: "🔮",
    },
  ];
}

/**
 * Выполнение команды
 */
export async function executeCommand(
  command: ParsedCommand,
  supabase: SupabaseClient,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}> {
  try {
    switch (command.type) {
      case "add_transaction":
        return await addTransaction(command, supabase, userId);

      case "show_balance":
        return await showBalance(supabase, userId);

      case "show_stats":
        return await showStats(command, supabase, userId);

      case "show_budget":
        return await showBudget(supabase, userId);

      default:
        return {
          success: false,
          message: "Команда не распознана. " + (command.suggestion || ""),
        };
    }
  } catch (error) {
    console.error("Command execution error:", error);
    return {
      success: false,
      message: "Ошибка выполнения команды",
    };
  }
}

async function addTransaction(
  command: ParsedCommand,
  supabase: SupabaseClient,
  userId: string
) {
  const { amount, category, description, direction } = command.params;

  if (!amount) {
    return {
      success: false,
      message: "Укажите сумму транзакции",
    };
  }

  // Получаем первый счёт пользователя
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      message: "Сначала создайте счёт",
    };
  }

  // Получаем или создаём категорию
  let categoryId = null;
  if (category) {
    const { data: existingCat } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", category)
      .limit(1)
      .single();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      // Создаём новую категорию
      const { data: newCat } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          name: category,
          type: direction || "expense",
        })
        .select()
        .single();

      categoryId = newCat?.id;
    }
  }

  // Создаём транзакцию
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: accounts[0].id,
    category_id: categoryId,
    amount,
    direction: direction || "expense",
    description: description || `Добавлено через чат: ${command.original}`,
    date: new Date().toISOString().split("T")[0],
  });

  if (error) throw error;

  return {
    success: true,
    message: `✅ Добавлено: ${direction === "income" ? "доход" : "расход"} ${amount / 100}₽${category ? ` (${category})` : ""}`,
  };
}

async function showBalance(supabase: SupabaseClient, userId: string) {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance, currency")
    .eq("user_id", userId);

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      message: "У вас пока нет счетов",
    };
  }

  const total = accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0);
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(total / 100);

  const details = accounts
    .map(
      (acc: { name: string; balance: number; currency?: string }) =>
        `${acc.name}: ${new Intl.NumberFormat("ru-RU", { style: "currency", currency: acc.currency || "RUB", minimumFractionDigits: 0 }).format(acc.balance / 100)}`
    )
    .join("\n");

  return {
    success: true,
    message: `💰 Общий баланс: ${formatted}\n\n${details}`,
    data: { accounts, total },
  };
}

async function showStats(command: ParsedCommand, supabase: SupabaseClient, userId: string) {
  const { category } = command.params;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  let query = supabase
    .from("transactions")
    .select("amount, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("date", startDate.toISOString().split("T")[0]);

  if (category) {
    query = query.ilike("categories.name", `%${category}%`);
  }

  const { data: transactions } = await query;

  if (!transactions || transactions.length === 0) {
    return {
      success: false,
      message: "Транзакций не найдено",
    };
  }

  const total = transactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(total / 100);

  return {
    success: true,
    message: `📊 ${category ? `Расходы на ${category}` : "Общие расходы"} за месяц: ${formatted}\nТранзакций: ${transactions.length}`,
    data: { total, count: transactions.length },
  };
}

async function showBudget(supabase: SupabaseClient, userId: string) {
  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount, spent, categories(name)")
    .eq("user_id", userId);

  if (!budgets || budgets.length === 0) {
    return {
      success: false,
      message: "У вас пока нет бюджетов",
    };
  }

  const details = budgets
    .map((b: { spent: number; amount: number; categories?: { name: string } | { name: string }[] | null }) => {
      const percentage = (b.spent / b.amount) * 100;
      const status = percentage >= 100 ? "❌" : percentage >= 80 ? "⚠️" : "✅";
      const categoryName = Array.isArray(b.categories) ? b.categories[0]?.name : b.categories?.name;
      return `${status} ${categoryName || "Без категории"}: ${(b.spent / 100).toFixed(0)}₽ из ${(b.amount / 100).toFixed(0)}₽ (${percentage.toFixed(0)}%)`;
    })
    .join("\n");

  return {
    success: true,
    message: `🎯 Ваши бюджеты:\n\n${details}`,
    data: { budgets },
  };
}
