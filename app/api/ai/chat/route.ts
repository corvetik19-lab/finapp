/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { getCommandsModel } from '@/lib/ai/openrouter';
import { streamText, tool } from "ai";
import { z } from "zod";
export const runtime = "edge";
export const maxDuration = 60;

// ВАЖНО: tools без execute - модель сама вызывает их
// Мы обрабатываем вызовы через API endpoint /api/chat/commands

// Определяем инструменты (tools) для AI
// TODO: Включить tools после настройки правильной обработки в edge runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tools = {
  // === УПРАВЛЕНИЕ КАРТАМИ ===
  addDebitCard: tool({
    description: "Добавить новую дебетовую карту. Используй когда пользователь просит добавить карту, счёт или дебетовую карту.",
    inputSchema: z.object({
      name: z.string().describe("Название карты"),
      bank: z.string().describe("Название банка"),
      balance: z.number().describe("Текущий баланс на карте"),
      currency: z.string().default("RUB").describe("Валюта (RUB, USD, EUR)"),
      cardNumber: z.string().optional().describe("Последние 4 цифры карты"),
    }),
  }),

  addCreditCard: tool({
    description: "Добавить новую кредитную карту. Используй когда пользователь хочет добавить кредитку.",
    inputSchema: z.object({
      name: z.string().describe("Название карты"),
      bank: z.string().describe("Название банка"),
      creditLimit: z.number().describe("Кредитный лимит"),
      balance: z.number().describe("Текущий долг"),
      currency: z.string().default("RUB").describe("Валюта"),
      cardNumber: z.string().optional().describe("Последние 4 цифры карты"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addCreditCard', params),
  }),

  addTransaction: tool({
    description: "Добавить новую транзакцию (доход или расход). Используй для записи покупок, поступлений денег.",
    inputSchema: z.object({
      amount: z.number().describe("Сумма транзакции"),
      categoryName: z.string().describe("Название категории"),
      accountName: z.string().describe("Название счёта/карты"),
      description: z.string().optional().describe("Описание транзакции"),
      date: z.string().optional().describe("Дата в формате YYYY-MM-DD"),
      direction: z.enum(["income", "expense"]).describe("Тип: доход или расход"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addTransaction', params),
  }),

  addBudget: tool({
    description: "Создать бюджет для категории. Используй когда пользователь хочет ограничить расходы по категории.",
    inputSchema: z.object({
      categoryName: z.string().describe("Название категории"),
      amount: z.number().describe("Лимит бюджета"),
      period: z.enum(["monthly", "weekly", "yearly"]).describe("Период бюджета"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addBudget', params),
  }),

  addPlan: tool({
    description: "Создать план накопления или цель. Используй когда пользователь хочет накопить на что-то.",
    inputSchema: z.object({
      name: z.string().describe("Название плана/цели"),
      targetAmount: z.number().describe("Целевая сумма"),
      currentAmount: z.number().default(0).describe("Текущая сумма"),
      deadline: z.string().optional().describe("Срок достижения в формате YYYY-MM-DD"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addPlan', params),
  }),

  addBookmark: tool({
    description: "Добавить закладку (полезную ссылку). Используй когда пользователь даёт ссылку для сохранения.",
    inputSchema: z.object({
      title: z.string().describe("Название закладки"),
      url: z.string().describe("URL адрес"),
      category: z.string().optional().describe("Категория закладки"),
      description: z.string().optional().describe("Описание"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addBookmark', params),
  }),

  addPrompt: tool({
    description: "Сохранить промпт для AI. Используй когда пользователь хочет сохранить шаблон запроса.",
    inputSchema: z.object({
      title: z.string().describe("Название промпта"),
      content: z.string().describe("Текст промпта"),
      category: z.string().optional().describe("Категория промпта"),
      tags: z.array(z.string()).optional().describe("Теги для поиска"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addPrompt', params),
  }),

  addCategory: tool({
    description: "Добавить новую категорию транзакций. Используй когда пользователь хочет создать новую категорию расходов/доходов.",
    inputSchema: z.object({
      name: z.string().describe("Название категории"),
      type: z.enum(["income", "expense"]).describe("Тип категории"),
      icon: z.string().optional().describe("Иконка (emoji или material icon)"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addCategory', params),
  }),

  // === УПРАВЛЕНИЕ ПЛАНАМИ ===
  getPlans: tool({
    description: "Получить список финансовых планов. Используй для просмотра целей пользователя.",
    inputSchema: z.object({
      status: z.enum(["active", "completed", "cancelled", "all"]).optional().describe("Фильтр по статусу"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getPlans', params),
  }),

  updatePlan: tool({
    description: "Обновить существующий план. Используй для изменения названия, суммы, срока или статуса плана.",
    inputSchema: z.object({
      planId: z.string().describe("ID плана для обновления"),
      name: z.string().optional().describe("Новое название"),
      targetAmount: z.number().optional().describe("Новая целевая сумма"),
      currentAmount: z.number().optional().describe("Текущая сумма"),
      deadline: z.string().optional().describe("Новый срок YYYY-MM-DD"),
      status: z.enum(["active", "completed", "cancelled"]).optional().describe("Новый статус"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('updatePlan', params),
  }),

  deletePlan: tool({
    description: "Удалить план. Используй когда пользователь хочет удалить цель.",
    inputSchema: z.object({
      planId: z.string().describe("ID плана для удаления"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('deletePlan', params),
  }),

  addPlanTopup: tool({
    description: "Пополнить план (добавить деньги к цели). Используй когда пользователь вносит деньги в план накопления.",
    inputSchema: z.object({
      planId: z.string().describe("ID плана"),
      amount: z.number().describe("Сумма пополнения"),
      description: z.string().optional().describe("Описание пополнения"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addPlanTopup', params),
  }),

  // === ФИТНЕС ПРОГРАММЫ ===
  getFitnessPrograms: tool({
    description: "Получить список фитнес-программ. Используй для просмотра тренировочных планов.",
    inputSchema: z.object({
      active: z.boolean().optional().describe("Только активные программы"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getFitnessPrograms', params),
  }),

  addFitnessProgram: tool({
    description: "Создать новую фитнес-программу. Используй когда пользователь хочет начать тренировки.",
    inputSchema: z.object({
      name: z.string().describe("Название программы"),
      description: z.string().optional().describe("Описание программы"),
      duration: z.number().optional().describe("Длительность в днях"),
      frequency: z.number().optional().describe("Тренировок в неделю"),
      goal: z.string().optional().describe("Цель тренировок"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addFitnessProgram', params),
  }),

  updateFitnessProgram: tool({
    description: "Обновить фитнес-программу. Используй для изменения названия, описания, длительности программы.",
    inputSchema: z.object({
      programId: z.string().describe("ID программы для обновления"),
      name: z.string().optional().describe("Новое название"),
      description: z.string().optional().describe("Новое описание"),
      duration: z.number().optional().describe("Новая длительность"),
      frequency: z.number().optional().describe("Новая частота"),
      goal: z.string().optional().describe("Новая цель"),
      isActive: z.boolean().optional().describe("Активность программы"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('updateFitnessProgram', params),
  }),

  deleteFitnessProgram: tool({
    description: "Удалить фитнес-программу. Используй когда пользователь хочет удалить программу тренировок.",
    inputSchema: z.object({
      programId: z.string().describe("ID программы для удаления"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('deleteFitnessProgram', params),
  }),

  addFitnessWorkout: tool({
    description: "Записать выполненную тренировку. Используй когда пользователь отчитывается о тренировке.",
    inputSchema: z.object({
      programId: z.string().describe("ID программы"),
      date: z.string().optional().describe("Дата тренировки YYYY-MM-DD"),
      duration: z.number().describe("Длительность в минутах"),
      exercises: z.string().optional().describe("Выполненные упражнения"),
      notes: z.string().optional().describe("Заметки о тренировке"),
      calories: z.number().optional().describe("Сожжено калорий"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('addFitnessWorkout', params),
  }),

  // === АНАЛИТИКА ===
  getFinancialSummary: tool({
    description: "Получить финансовую сводку пользователя за указанный период",
    inputSchema: z.object({
      period: z.enum(["today", "week", "month", "year"]).describe("Период для анализа"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getFinancialSummary', params),
  }),

  getTransactions: tool({
    description: "Получить список последних транзакций пользователя",
    inputSchema: z.object({
      limit: z.number().default(10).describe("Количество транзакций для получения"),
      direction: z.enum(["income", "expense", "all"]).optional().describe("Тип транзакций"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getTransactions', params),
  }),

  createTransaction: tool({
    description: "Создать новую финансовую транзакцию (доход или расход)",
    inputSchema: z.object({
      amount: z.number().positive().describe("Сумма транзакции в основной валюте (например, 1500.50)"),
      direction: z.enum(["income", "expense"]).describe("Тип: income (доход) или expense (расход)"),
      description: z.string().describe("Описание транзакции"),
      categoryName: z.string().optional().describe("Название категории"),
      date: z.string().optional().describe("Дата транзакции в формате ISO (по умолчанию - сегодня)"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('createTransaction', params),
  }),

  createCategory: tool({
    description: "Создать новую категорию для транзакций",
    inputSchema: z.object({
      name: z.string().describe("Название категории"),
      kind: z.enum(["income", "expense"]).describe("Тип категории: income (доход) или expense (расход)"),
    }),
    execute: async (params: Record<string, unknown>) => await callToolHandler('createCategory', params),
  }),

  getBudgets: tool({
    description: "Получить информацию о бюджетах пользователя",
    inputSchema: z.object({}),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getBudgets', params),
  }),

  getPlans: tool({
    description: "Получить информацию о финансовых планах и целях пользователя",
    inputSchema: z.object({}),
    execute: async (params: Record<string, unknown>) => await callToolHandler('getPlans', params),
  }),
};

export async function POST(req: Request) {
  try {

    // Проверяем наличие API ключа
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      console.error("OPENROUTER_API_KEY is not set or empty");
      return Response.json(
        { 
          error: "OpenRouter API key is not configured",
          details: "Please set OPENROUTER_API_KEY in your .env.local file"
        },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    const result = streamText({
      model: getCommandsModel(),
      messages,
      // tools, // Временно отключено
      system: `Ты — финансовый ассистент для приложения "Finapp". 
      
Твоя задача — ПОЛНОЕ управление личными финансами и фитнесом пользователя через чат:

📊 ДОСТУПНЫЕ ВОЗМОЖНОСТИ:

ФИНАНСЫ:
1. Дебетовые и кредитные карты - добавление, просмотр балансов
2. Транзакции - создание доходов/расходов с категориями
3. Бюджеты - установка лимитов на категории
4. Планы - ПОЛНОЕ управление: просмотр, создание, редактирование, удаление, пополнение
5. Категории - создание новых категорий
6. Закладки - сохранение полезных ссылок
7. Промпты - сохранение шаблонов запросов к AI
8. Аналитика - финансовые сводки, расходы по категориям

ФИТНЕС:
9. Программы - ПОЛНОЕ управление: создание, просмотр, редактирование, удаление
10. Тренировки - запись выполненных занятий

✅ ПРАВИЛА:
- Всегда используй вежливый и дружелюбный тон
- Суммы указывай в рублях (₽), валюта по умолчанию — RUB
- Используй доступные инструменты (tools) для выполнения ЛЮБЫХ действий
- Если данных недостаточно, вежливо попроси уточнить детали
- При больших суммах (>50000₽) спрашивай подтверждение
- После выполнения действия всегда подтверждай результат пользователю

💡 ПРИМЕРЫ КОМАНД:

Финансы:
• "Добавь карту Тинькофф с балансом 15000 рублей"
• "Создай транзакцию: расход 500₽ на продукты"
• "Установи бюджет 10000₽ на развлечения на месяц"
• "Создай план накопления 100000₽ на отпуск"
• "Покажи все мои планы"
• "Измени план [ID] - увеличь цель до 150000"
• "Удали план [ID]"
• "Пополни план [ID] на 5000 рублей"
• "Покажи мой баланс за месяц"
• "Сохрани закладку на сайт банка"

Фитнес:
• "Создай программу тренировок 'Похудение' на 30 дней"
• "Покажи все мои программы тренировок"
• "Измени программу [ID] - частота 4 раза в неделю"
• "Удали программу [ID]"
• "Запиши тренировку 60 минут, сожжено 400 ккал"

🎯 СТИЛЬ ОТВЕТОВ:
- Кратко и по делу
- Эмодзи для наглядности
- Структурированная информация
- Подтверждение каждого действия`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Chat Error:", error);
    
    // Проверяем специфичные ошибки OpenRouter
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return Response.json(
      { 
        error: "AI service error",
        details: errorMessage,
        hint: "Check your OpenRouter API key and account balance at https://openrouter.ai/"
      },
      { status: 500 }
    );
  }
}
