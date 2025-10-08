/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createRouteClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const maxDuration = 30;

// Определяем инструменты (tools) для AI
const tools = {
  getFinancialSummary: tool({
    description: "Получить финансовую сводку пользователя за указанный период",
    parameters: z.object({
      period: z.enum(["today", "week", "month", "year"]).describe("Период для анализа"),
    }),
    execute: async ({ period }: { period: "today" | "week" | "month" | "year" }) => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      // Вычисляем даты периода
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Получаем транзакции
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, direction, currency, occurred_at, category_id")
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", now.toISOString());

      if (!transactions) return { error: "Не удалось получить данные" };

      // Подсчитываем доходы и расходы
      const income = transactions
        .filter(t => t.direction === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.direction === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        period,
        income: income / 100, // конвертируем из копеек
        expenses: expenses / 100,
        balance: (income - expenses) / 100,
        transactionCount: transactions.length,
        currency: "RUB"
      };
    },
  }),

  getTransactions: tool({
    description: "Получить список последних транзакций пользователя",
    parameters: z.object({
      limit: z.number().default(10).describe("Количество транзакций для получения"),
      direction: z.enum(["income", "expense", "all"]).optional().describe("Тип транзакций"),
    }),
    execute: async ({ limit, direction }: { limit: number; direction?: "income" | "expense" | "all" }) => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      let query = supabase
        .from("transactions")
        .select("id, amount, direction, description, occurred_at, currency, category_id, categories(name)")
        .order("occurred_at", { ascending: false })
        .limit(limit);

      if (direction && direction !== "all") {
        query = query.eq("direction", direction);
      }

      const { data: transactions } = await query;

      return transactions?.map(t => ({
        id: t.id,
        amount: Number(t.amount) / 100,
        direction: t.direction,
        description: t.description,
        date: t.occurred_at,
        currency: t.currency,
        category: (Array.isArray(t.categories) ? t.categories[0]?.name : (t.categories as { name: string } | null)?.name) || "Без категории"
      })) || [];
    },
  }),

  createTransaction: tool({
    description: "Создать новую финансовую транзакцию (доход или расход)",
    parameters: z.object({
      amount: z.number().positive().describe("Сумма транзакции в основной валюте (например, 1500.50)"),
      direction: z.enum(["income", "expense"]).describe("Тип: income (доход) или expense (расход)"),
      description: z.string().describe("Описание транзакции"),
      categoryName: z.string().optional().describe("Название категории"),
      date: z.string().optional().describe("Дата транзакции в формате ISO (по умолчанию - сегодня)"),
    }),
    execute: async ({ amount, direction, description, categoryName, date }: { amount: number; direction: "income" | "expense"; description: string; categoryName?: string; date?: string }) => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      // Получаем первый счёт пользователя
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id")
        .limit(1);

      if (!accounts || accounts.length === 0) {
        return { error: "У вас нет ни одного счёта. Сначала создайте счёт." };
      }

      let categoryId = null;
      
      // Ищем категорию по имени, если указана
      if (categoryName) {
        const { data: categories } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", categoryName)
          .limit(1);
        
        if (categories && categories.length > 0) {
          categoryId = categories[0].id;
        }
      }

      // Создаём транзакцию (сумма в копейках)
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: accounts[0].id,
          amount: Math.round(amount * 100), // конвертируем в копейки
          direction,
          description,
          category_id: categoryId,
          occurred_at: date || new Date().toISOString(),
          currency: "RUB",
        })
        .select()
        .single();

      if (error) {
        return { error: `Ошибка создания транзакции: ${error.message}` };
      }

      return {
        success: true,
        message: `Транзакция создана: ${direction === "income" ? "доход" : "расход"} ${amount} RUB - ${description}`,
        transaction: {
          id: data.id,
          amount,
          direction,
          description,
        }
      };
    },
  }),

  createCategory: tool({
    description: "Создать новую категорию для транзакций",
    parameters: z.object({
      name: z.string().describe("Название категории"),
      kind: z.enum(["income", "expense"]).describe("Тип категории: income (доход) или expense (расход)"),
    }),
    execute: async ({ name, kind }: { name: string; kind: "income" | "expense" }) => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      // Проверяем, не существует ли уже такая категория
      const { data: existing } = await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", name)
        .limit(1);

      if (existing && existing.length > 0) {
        return { 
          success: false, 
          message: `Категория "${name}" уже существует.`,
          categoryId: existing[0].id
        };
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name,
          kind,
        })
        .select()
        .single();

      if (error) {
        return { error: `Ошибка создания категории: ${error.message}` };
      }

      return {
        success: true,
        message: `Категория "${name}" создана успешно!`,
        category: {
          id: data.id,
          name: data.name,
          kind: data.kind,
        }
      };
    },
  }),

  getBudgets: tool({
    description: "Получить информацию о бюджетах пользователя",
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      const { data: budgets } = await supabase
        .from("budgets")
        .select(`
          id,
          limit_amount,
          period_start,
          period_end,
          currency,
          categories(name)
        `)
        .order("period_start", { ascending: false });

      if (!budgets || budgets.length === 0) {
        return { message: "У вас пока нет настроенных бюджетов." };
      }

      return budgets.map(b => ({
        category: (Array.isArray(b.categories) ? b.categories[0]?.name : (b.categories as { name: string } | null)?.name) || "Без категории",
        limit: Number(b.limit_amount) / 100,
        period: `${b.period_start} - ${b.period_end}`,
        currency: b.currency,
      }));
    },
  }),

  getPlans: tool({
    description: "Получить информацию о финансовых планах и целях пользователя",
    parameters: z.object({}),
    execute: async () => {
      const supabase = await createRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Unauthorized");

      const { data: plans } = await supabase
        .from("plans")
        .select("id, name, goal_amount, current_amount, target_date, status, currency")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!plans || plans.length === 0) {
        return { message: "У вас пока нет финансовых планов." };
      }

      return plans.map(p => ({
        name: p.name,
        goal: Number(p.goal_amount || 0) / 100,
        current: Number(p.current_amount || 0) / 100,
        progress: p.goal_amount ? Math.round((Number(p.current_amount || 0) / Number(p.goal_amount)) * 100) : 0,
        targetDate: p.target_date,
        status: p.status,
        currency: p.currency,
      }));
    },
  }),
};

export async function POST(req: Request) {
  const supabase = await createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    messages,
    tools,
    system: `Ты — финансовый ассистент для приложения "Finapp". 
    
Твоя задача — помогать пользователю управлять личными финансами:
- Отвечать на вопросы о доходах, расходах, балансе
- Анализировать финансовую ситуацию
- Создавать транзакции, категории по запросу
- Давать советы по управлению бюджетом

Правила:
- Всегда используй вежливый и дружелюбный тон
- Суммы указывай в рублях (₽)
- Для выполнения действий используй доступные инструменты (tools)
- Если данных недостаточно, вежливо попроси уточнить
- При создании транзакций спрашивай подтверждение, если сумма очень большая (>50000₽)
- Валюта по умолчанию — RUB (российские рубли)

Примеры команд, которые ты можешь выполнить:
- "Покажи мой баланс за месяц"
- "Создай расход 500 рублей на продукты"
- "Какие у меня бюджеты?"
- "Создай категорию 'Спорт' для расходов"
- "Покажи последние 5 транзакций"`,
  });

  return result.toDataStreamResponse();
}
