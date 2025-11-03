/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { generateText } from "ai";
import { getAnalyticsModel } from "@/lib/ai/openai-client";
import { createRouteClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем данные за последние 90 дней
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Транзакции
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, direction, description, occurred_at, category_id, categories(name, kind)")
      .gte("occurred_at", threeMonthsAgo.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(200);

    // Бюджеты
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        limit_amount,
        period_start,
        period_end,
        categories(name)
      `);

    // Планы
    const { data: plans } = await supabase
      .from("plans")
      .select("name, goal_amount, current_amount, target_date, status")
      .is("deleted_at", null);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        healthScore: 50,
        scoreChange: 0,
        scoreStatus: "warning",
        insights: [{
          id: "1",
          type: "info",
          title: "Недостаточно данных",
          text: "Добавьте транзакции, чтобы получить персональные рекомендации от AI."
        }],
        tips: [],
        summary: "Недостаточно данных для анализа."
      });
    }

    // Подсчитываем статистику
    const totalIncome = transactions
      .filter(t => t.direction === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) / 100;

    const totalExpenses = transactions
      .filter(t => t.direction === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) / 100;

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    // Группируем расходы по категориям
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.direction === "expense")
      .forEach(t => {
        const categoryName = (Array.isArray(t.categories) 
          ? t.categories[0]?.name 
          : t.categories?.name) || "Без категории";
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Number(t.amount) / 100;
      });

    const topCategories = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => `${name}: ${amount.toFixed(0)}₽`)
      .join(", ");

    // Формируем данные для AI
    const financialData = {
      период: "последние 3 месяца",
      доходы: `${totalIncome.toFixed(0)}₽`,
      расходы: `${totalExpenses.toFixed(0)}₽`,
      баланс: `${balance.toFixed(0)}₽`,
      нормаНакоплений: `${savingsRate}%`,
      топКатегорийРасходов: topCategories,
      количествоТранзакций: transactions.length,
      количествоБюджетов: budgets?.length || 0,
      количествоПланов: plans?.length || 0,
    };

    // Генерируем анализ через OpenAI
    const { text } = await generateText({
      model: getAnalyticsModel(),
      prompt: `Ты — финансовый аналитик. Проанализируй финансовые данные пользователя и дай персональные рекомендации.

Данные пользователя:
${JSON.stringify(financialData, null, 2)}

Задачи:
1. Оцени финансовое здоровье от 0 до 100 (healthScore)
2. Дай 3-5 конкретных инсайтов с типами: "positive" (хорошие новости), "warning" (предупреждения), "info" (информация)
3. Дай 3-4 практических совета для улучшения финансов
4. Создай краткую сводку (summary) на 2-3 предложения
5. Спрогнозируй доходы и расходы на следующие 3 месяца с учётом трендов
6. Найди аномальные траты (необычно высокие расходы в категориях)

Верни ТОЛЬКО валидный JSON в формате:
{
  "healthScore": число от 0 до 100,
  "scoreChange": число изменения (например +5 или -3),
  "scoreStatus": "good" | "warning" | "poor",
  "insights": [
    {
      "type": "positive" | "warning" | "info",
      "title": "Заголовок",
      "text": "Детальное описание инсайта"
    }
  ],
  "tips": [
    {
      "icon": "checklist" | "trending_down" | "savings" | "lightbulb",
      "title": "Заголовок совета",
      "text": "Описание совета"
    }
  ],
  "summary": "Краткая сводка анализа",
  "forecast": {
    "nextMonths": [
      {
        "month": "Январь 2025",
        "predictedIncome": число,
        "predictedExpenses": число,
        "confidence": число от 0 до 100
      }
    ],
    "summary": "Краткое описание прогноза"
  },
  "anomalies": [
    {
      "type": "expense" | "income",
      "category": "Название категории",
      "amount": число,
      "averageAmount": число,
      "percentageChange": число,
      "description": "Описание аномалии",
      "severity": "low" | "medium" | "high"
    }
  ]
}

Важно:
- Все тексты на русском языке
- Конкретные цифры и примеры из данных пользователя
- Практичные и применимые советы
- Позитивный и поддерживающий тон`,
    });

    // Парсим ответ от AI
    let analysis;
    try {
      // Извлекаем JSON из ответа (он может быть обёрнут в ```json```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(text);
      }
    } catch (e) {
      console.error("Ошибка парсинга AI ответа:", e);
      // Fallback
      analysis = {
        healthScore: 65,
        scoreChange: 0,
        scoreStatus: "warning",
        insights: [{
          type: "info",
          title: "Анализ в процессе",
          text: "AI обрабатывает ваши данные. Обновите страницу через несколько секунд."
        }],
        tips: [],
        summary: "Данные обрабатываются..."
      };
    }

    // Добавляем ID к инсайтам и советам
    const insightsWithIds = analysis.insights.map((insight: { type: string; title: string; text: string }, i: number) => ({
      id: String(i + 1),
      ...insight
    }));

    const tipsWithIds = analysis.tips.map((tip: { icon: string; title: string; text: string }, i: number) => ({
      id: String(i + 1),
      ...tip
    }));

    return NextResponse.json({
      healthScore: analysis.healthScore,
      scoreChange: analysis.scoreChange,
      scoreStatus: analysis.scoreStatus,
      insights: insightsWithIds,
      tips: tipsWithIds,
      summary: analysis.summary,
      forecast: analysis.forecast || { nextMonths: [], summary: "" },
      anomalies: (analysis.anomalies || []).map((anomaly: { type: string; category: string; amount: number; averageAmount: number; percentageChange: number; description: string; severity: string }, i: number) => ({
        id: String(i + 1),
        ...anomaly
      })),
    });

  } catch (error: unknown) {
    console.error("AI Analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate analytics", details: errorMessage },
      { status: 500 }
    );
  }
}
