/**
 * RAG Pipeline для AI чата
 * Обогащает ответы контекстом из транзакций пользователя
 */

import { createEmbedding } from "./embeddings";
import { createRSCClient } from "@/lib/supabase/helpers";

export interface TransactionContext {
  id: string;
  note: string;
  amount_major: number;
  currency: string;
  occurred_at: string;
  category_name: string | null;
  account_name: string | null;
  similarity: number;
}

export interface FinancialContext {
  transactions: TransactionContext[];
  accounts: Array<{ name: string; balance: number; currency: string }>;
  budgets: Array<{ category: string; limit: number; used: number }>;
  totalIncome: number;
  totalExpense: number;
}

/**
 * Ищет релевантные транзакции для вопроса пользователя
 */
export async function searchRelevantTransactions(
  question: string,
  userId: string,
  limit = 5
): Promise<TransactionContext[]> {
  const supabase = await createRSCClient();

  // Генерируем embedding для вопроса
  const queryEmbedding = await createEmbedding(question);

  // Ищем похожие транзакции
  const { data: matches, error } = await supabase.rpc("match_transactions", {
    query_embedding: queryEmbedding,
    match_threshold: 0.6, // Немного ниже порог для большего контекста
    match_count: limit,
    filter_user_id: userId,
  });

  if (error || !matches) {
    console.error("Error searching transactions:", error);
    return [];
  }

  // Обогащаем результаты
  const enriched = await Promise.all(
    matches.map(async (match: Record<string, unknown>) => {
      let categoryName = null;
      let accountName = null;

      if (match.category_id) {
        const { data: category } = await supabase
          .from("categories")
          .select("name")
          .eq("id", match.category_id)
          .single();
        categoryName = category?.name || null;
      }

      if (match.account_id) {
        const { data: account } = await supabase
          .from("accounts")
          .select("name")
          .eq("id", match.account_id)
          .single();
        accountName = account?.name || null;
      }

      return {
        id: match.id,
        note: match.note || "",
        amount_major: (match.amount_minor as number) / 100,
        currency: match.currency,
        occurred_at: match.occurred_at,
        category_name: categoryName,
        account_name: accountName,
        similarity: match.similarity,
      };
    })
  );

  return enriched;
}

/**
 * Собирает полный финансовый контекст пользователя
 */
export async function getFinancialContext(
  userId: string,
  question?: string
): Promise<FinancialContext> {
  const supabase = await createRSCClient();

  // 1. Релевантные транзакции (если есть вопрос)
  let transactions: TransactionContext[] = [];
  if (question) {
    transactions = await searchRelevantTransactions(question, userId, 5);
  }

  // 2. Счета пользователя
  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance, currency")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("balance", { ascending: false })
    .limit(10);

  // 3. Бюджеты
  const { data: budgets } = await supabase
    .from("budgets")
    .select("category_id, limit_minor, categories(name)")
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Вычисляем использование бюджетов
  const budgetsWithUsage = await Promise.all(
    (budgets || []).map(async (budget: Record<string, unknown>) => {
      const { data: txns } = await supabase
        .from("transactions")
        .select("amount_minor")
        .eq("user_id", userId)
        .eq("category_id", budget.category_id)
        .eq("direction", "expense")
        .gte("occurred_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const used = (txns || []).reduce((sum, t) => sum + Math.abs(t.amount_minor), 0);
      
      const categories = budget.categories as { name?: string } | null | undefined;

      return {
        category: categories?.name || "Без категории",
        limit: (budget.limit_minor as number) / 100,
        used: used / 100,
      };
    })
  );

  // 4. Общая статистика за текущий месяц
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  
  const { data: monthTxns } = await supabase
    .from("transactions")
    .select("amount_minor, direction")
    .eq("user_id", userId)
    .gte("occurred_at", startOfMonth);

  const totalIncome = (monthTxns || [])
    .filter((t) => t.direction === "income")
    .reduce((sum, t) => sum + t.amount_minor, 0) / 100;

  const totalExpense = (monthTxns || [])
    .filter((t) => t.direction === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount_minor), 0) / 100;

  return {
    transactions,
    accounts: accounts || [],
    budgets: budgetsWithUsage,
    totalIncome,
    totalExpense,
  };
}

/**
 * Форматирует контекст для промпта
 */
export function formatContextForPrompt(context: FinancialContext): string {
  const parts: string[] = [];

  // Общая статистика
  parts.push(`📊 Финансовая сводка за текущий месяц:`);
  parts.push(`- Доходы: ${context.totalIncome.toFixed(2)} ₽`);
  parts.push(`- Расходы: ${context.totalExpense.toFixed(2)} ₽`);
  parts.push(`- Баланс: ${(context.totalIncome - context.totalExpense).toFixed(2)} ₽`);
  parts.push("");

  // Счета
  if (context.accounts.length > 0) {
    parts.push(`💰 Счета пользователя:`);
    context.accounts.slice(0, 5).forEach((acc) => {
      parts.push(`- ${acc.name}: ${(acc.balance / 100).toFixed(2)} ${acc.currency}`);
    });
    parts.push("");
  }

  // Бюджеты
  if (context.budgets.length > 0) {
    parts.push(`📋 Бюджеты:`);
    context.budgets.forEach((budget) => {
      const percent = (budget.used / budget.limit) * 100;
      parts.push(
        `- ${budget.category}: ${budget.used.toFixed(2)} / ${budget.limit.toFixed(2)} ₽ (${percent.toFixed(0)}%)`
      );
    });
    parts.push("");
  }

  // Релевантные транзакции
  if (context.transactions.length > 0) {
    parts.push(`🔍 Релевантные транзакции:`);
    context.transactions.forEach((txn) => {
      const date = new Date(txn.occurred_at).toLocaleDateString("ru-RU");
      parts.push(
        `- ${date}: ${txn.note} - ${txn.amount_major.toFixed(2)} ${txn.currency} (${txn.category_name || "Без категории"})`
      );
    });
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Создает системный промпт с контекстом
 */
export function buildSystemPromptWithContext(context: FinancialContext): string {
  const contextText = formatContextForPrompt(context);

  return `Ты — персональный финансовый ассистент пользователя. 

Твоя задача — помогать пользователю управлять финансами, отвечать на вопросы о тратах, давать советы по экономии и бюджетированию.

ВАЖНО:
- Отвечай на русском языке
- Используй данные из контекста ниже для точных ответов
- Если данных недостаточно, честно скажи об этом
- Давай конкретные рекомендации на основе реальных данных
- Будь дружелюбным и полезным

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
${contextText}

Отвечай кратко и по делу. Используй эмодзи для наглядности.`;
}
