import { createRSCClient } from "@/lib/supabase/server";
import { getOpenRouterClient } from "@/lib/ai/openrouter-client";
import type { CoreMessage } from "ai";

interface TransactionData {
  date: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
  description?: string;
  categories?: Array<{
    name: string;
    type: string;
  }>;
}

interface BudgetData {
  spent: number;
  amount: number;
  categories?: Array<{
    name: string;
  }>;
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();

    // Получаем данные пользователя для контекста
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Получаем последние транзакции для контекста
    const { data: recentTransactions } = await supabase
      .from("transactions")
      .select(
        `
        id,
        amount,
        direction,
        description,
        date,
        category_id,
        categories!inner (name, type)
      `
      )
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(10);

    // Получаем счета
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, name, balance, currency")
      .eq("user_id", user.id);

    // Получаем бюджеты
    const { data: budgets } = await supabase
      .from("budgets")
      .select(
        `
        id,
        amount,
        spent,
        period_start,
        period_end,
        category_id,
        categories!inner (name)
      `
      )
      .eq("user_id", user.id);

    // Формируем контекст для AI
    const contextInfo = `
## Контекст пользователя:

### Счета:
${accounts?.map((acc) => `- ${acc.name}: ${(acc.balance / 100).toFixed(2)} ${acc.currency}`).join("\n") || "Нет счетов"}

### Последние транзакции:
${
  recentTransactions
    ?.map(
      (t: TransactionData) =>
        `- ${new Date(t.date).toLocaleDateString("ru-RU")}: ${t.direction === "income" ? "+" : "-"}${(t.amount / 100).toFixed(2)} руб. - ${t.description || t.categories?.[0]?.name || "Без категории"}`
    )
    .join("\n") || "Нет транзакций"
}

### Бюджеты:
${
  budgets
    ?.map(
      (b: BudgetData) =>
        `- ${b.categories?.[0]?.name || "Общий"}: ${(b.spent / 100).toFixed(2)} / ${(b.amount / 100).toFixed(2)} руб. (${((b.spent / b.amount) * 100).toFixed(0)}%)`
    )
    .join("\n") || "Нет бюджетов"
}
`;

    const systemPrompt = `Ты — умный финансовый помощник для приложения FinApp.

ТВОЯ РОЛЬ:
- Помогаешь пользователю управлять финансами
- Анализируешь транзакции и даёшь советы
- Отвечаешь на русском языке простым и понятным языком
- Используешь эмодзи для наглядности (💰 💸 📊 📈 📉 ✅ ⚠️ 💡)

${contextInfo}

ВОЗМОЖНОСТИ:
- Анализ расходов и доходов
- Рекомендации по бюджету
- Ответы на вопросы о финансах
- Советы по экономии

ВАЖНО:
- Все суммы в рублях (₽)
- Будь вежливым и полезным
- Давай конкретные рекомендации на основе реальных данных пользователя
- Если данных нет — предлагай начать добавлять транзакции

ПРИМЕРЫ ВОПРОСОВ:
- "Сколько я потратил в этом месяце?"
- "На что я трачу больше всего?"
- "Как сэкономить деньги?"
- "Какой у меня баланс?"
`;

    // Используем OpenRouter API
    const client = getOpenRouterClient();

    const response = await client.chat([
      { role: "system", content: systemPrompt },
      ...messages.map((m: CoreMessage) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      })),
    ], {
      temperature: 0.7,
    });

    const responseText = response.choices[0]?.message?.content || "Извините, не смог обработать запрос.";

    return new Response(responseText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
